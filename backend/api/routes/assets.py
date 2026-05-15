import os
import re
import uuid
from pathlib import PurePosixPath
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from db.supabase_client import supabase_client
from rag.retriever import upsert_document, delete_document
from rbac.roles import require_permission
import structlog

router = APIRouter()
log = structlog.get_logger()

# Upload cap. Reads beyond this are aborted before the body is fully buffered
# in memory, preventing a single large upload from OOMing the FastAPI process.
# 25 MB is generous for sales decks / PDFs / docs and well under any reasonable
# proxy default. Override via ASSETS_MAX_UPLOAD_BYTES if a deployment needs more.
MAX_UPLOAD_BYTES: int = int(os.environ.get("ASSETS_MAX_UPLOAD_BYTES", 25 * 1024 * 1024))

ASSET_NAMESPACE_MAP = {
    "design_system": "brand_guidelines",
    "brand_voice": "brand_guidelines",
    "case_study": "case_studies",
    "product_doc": "product_docs",
    "metrics": "metrics",
    "competitor_intel": "competitor_intel",
}

PERMISSION_MAP = {
    "design_system": "design_system:write",
    "brand_voice": "brand_voice:write",
    "case_study": "assets:upload",
    "product_doc": "assets:upload",
    "metrics": "assets:upload",
    "competitor_intel": "assets:upload",
}


# Strip control chars (including newlines that enable log injection) and
# path separators. Keep extension so the metadata is still useful.
_UNSAFE_FILENAME_CHARS = re.compile(r"[\x00-\x1f\x7f/\\]")


def _safe_filename(raw: str | None) -> str:
    """
    Sanitize a user-supplied filename for safe use in logs + DB metadata.
    The sanitized form is NEVER used as part of a storage path — only the
    server-generated `file_id` lives in the path (see `upload_asset`).
    """
    if not raw:
        return "unknown"
    # Take only the basename, drop any path-traversal segments.
    base = PurePosixPath(raw.replace("\\", "/")).name or "unknown"
    # Strip control chars + remaining separators.
    cleaned = _UNSAFE_FILENAME_CHARS.sub("_", base).strip(". ") or "unknown"
    # Length cap — DB columns + log lines should not blow up on huge names.
    return cleaned[:255]


@router.post("/upload")
async def upload_asset(
    request: Request,
    file: UploadFile = File(...),
    type: str = Form(...),
):
    user = request.state.user
    permission = PERMISSION_MAP.get(type, "assets:upload")
    require_permission(user["role"], permission)

    if type not in ASSET_NAMESPACE_MAP:
        raise HTTPException(400, f"Unknown asset type: {type}")

    # Read up to MAX+1 bytes; if we read more than MAX the upload is over cap.
    # Streaming-read prevents a single multi-GB upload from filling memory
    # before we have a chance to reject it.
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Upload exceeds limit of {MAX_UPLOAD_BYTES} bytes.",
        )
    text_content = content.decode("utf-8", errors="ignore")

    # Storage path uses ONLY the server-generated file_id, never the user-supplied
    # filename. This prevents path traversal via crafted filenames like
    # "../../foo" and avoids name collisions across uploads.
    file_id = str(uuid.uuid4())
    safe_name = _safe_filename(file.filename)
    path = f"{type}/{file_id}"

    supabase_client().storage.from_("assets").upload(path, content)

    # Chunk and index in vector store
    chunks = _chunk_text(text_content, chunk_size=1000, overlap=200)
    namespace = ASSET_NAMESPACE_MAP[type]

    for i, chunk in enumerate(chunks):
        await upsert_document(
            doc_id=f"{file_id}_chunk_{i}",
            text=chunk,
            namespace=namespace,
            metadata={
                "source": safe_name,
                "asset_type": type,
                "file_id": file_id,
                "chunk_index": i,
                "uploaded_by": user["id"],
            },
        )

    # Record in DB — sanitized name as display label, file_id as the storage key.
    supabase_client().table("assets").insert({
        "id": file_id,
        "name": safe_name,
        "type": type,
        "storage_path": path,
        "chunk_count": len(chunks),
        "uploaded_by": user["id"],
        "namespace": namespace,
    }).execute()

    log.info(
        "asset.uploaded",
        type=type,
        file=safe_name,
        bytes=len(content),
        chunks=len(chunks),
    )
    return {"id": file_id, "chunks_indexed": len(chunks), "status": "indexed"}


@router.get("/list")
async def list_assets(request: Request, type: str | None = None):
    user = request.state.user
    require_permission(user["role"], "assets:read")

    query = supabase_client().table("assets").select("*").order("created_at", desc=True)
    if type:
        query = query.eq("type", type)

    result = query.execute()
    return {"assets": result.data}


@router.delete("/{asset_id}")
async def delete_asset(request: Request, asset_id: str):
    user = request.state.user
    require_permission(user["role"], "assets:delete")

    asset = supabase_client().table("assets").select("*").eq("id", asset_id).single().execute()
    if not asset.data:
        raise HTTPException(404, "Asset not found")

    a = asset.data

    # Delete from vector store
    namespace = ASSET_NAMESPACE_MAP.get(a["type"], "product_docs")
    for i in range(a.get("chunk_count", 0)):
        await delete_document(f"{asset_id}_chunk_{i}", namespace)

    # Delete from storage
    supabase_client().storage.from_("assets").remove([a["storage_path"]])

    # Delete from DB
    supabase_client().table("assets").delete().eq("id", asset_id).execute()

    return {"deleted": asset_id}


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks
