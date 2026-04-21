import React, { useEffect, useState } from "react";
import { Upload, Link2, FileText, Trash2, Database, AlertTriangle, Check, GitBranch } from "lucide-react";
import { useAppStore } from "../stores/app-store";
import {
  listKB,
  addKB,
  removeKB,
  allowedNamespacesFor,
  namespaceLabel,
} from "../../shared/utils/kb-storage";
import type { KBEntry, KBNamespace } from "../../shared/types";

type Mode = "text" | "file" | "url" | "git";

const CLIENT_PARSEABLE = [".txt", ".md", ".markdown", ".csv", ".json"];

export function KnowledgeBasePanel() {
  const { user } = useAppStore();
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [mode, setMode] = useState<Mode>("text");
  const [namespace, setNamespace] = useState<KBNamespace | "">("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [gitPath, setGitPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    listKB().then(setEntries);
  }, []);

  if (!user || user.role === "sales_rep" || user.role === "viewer") return null;

  const allowed = allowedNamespacesFor(user.role);
  if (allowed.length === 0) return null;

  async function refresh() {
    setEntries(await listKB());
  }

  async function handleAddText() {
    if (!user || !namespace || !name.trim() || !text.trim()) return;
    setBusy(true);
    await addKB({
      id: crypto.randomUUID(),
      name: name.trim(),
      namespace: namespace as KBNamespace,
      source_type: "text",
      content: text,
      status: "ready",
      uploaded_by: user.email,
      uploaded_by_role: user.role,
      uploaded_at: new Date().toISOString(),
    });
    setName("");
    setText("");
    setFlash("Added");
    setTimeout(() => setFlash(null), 1500);
    await refresh();
    setBusy(false);
  }

  async function handleAddUrl() {
    if (!user || !namespace || !url.trim()) return;
    setBusy(true);
    await addKB({
      id: crypto.randomUUID(),
      name: name.trim() || url.trim(),
      namespace: namespace as KBNamespace,
      source_type: "url",
      url: url.trim(),
      content: "",
      status: "pending_parse",
      status_reason: "URL will be fetched + indexed by backend",
      uploaded_by: user.email,
      uploaded_by_role: user.role,
      uploaded_at: new Date().toISOString(),
    });
    setUrl("");
    setName("");
    setFlash("Added");
    setTimeout(() => setFlash(null), 1500);
    await refresh();
    setBusy(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user || !namespace) return;
    setBusy(true);
    for (const file of files) {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
      const parseable = CLIENT_PARSEABLE.includes(ext);

      let content = "";
      let status: KBEntry["status"] = "ready";
      let status_reason: string | undefined;

      if (parseable) {
        content = await file.text();
      } else {
        status = "pending_parse";
        status_reason = `${ext.toUpperCase()} requires backend text extraction`;
      }

      await addKB({
        id: crypto.randomUUID(),
        name: files.length === 1 && name.trim() ? name.trim() : file.name,
        namespace: namespace as KBNamespace,
        source_type: "file",
        content,
        file_type: ext,
        file_size: file.size,
        status,
        status_reason,
        uploaded_by: user.email,
        uploaded_by_role: user.role,
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
    setName("");
    setFlash(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`);
    setTimeout(() => setFlash(null), 1500);
    await refresh();
    setBusy(false);
  }

  async function handleAddGit() {
    if (!user || !namespace || !gitUrl.trim()) return;
    setBusy(true);
    const repoName = gitUrl.trim().replace(/\.git$/, "").split("/").slice(-2).join("/");
    await addKB({
      id: crypto.randomUUID(),
      name: name.trim() || `${repoName}${gitPath ? ` /${gitPath}` : ""}`,
      namespace: namespace as KBNamespace,
      source_type: "git",
      url: gitUrl.trim(),
      content: "",
      status: "pending_parse",
      status_reason: `Git repo (${gitBranch}${gitPath ? ` /${gitPath}` : ""}) — backend will clone & index`,
      uploaded_by: user.email,
      uploaded_by_role: user.role,
      uploaded_at: new Date().toISOString(),
    });
    setGitUrl("");
    setGitPath("");
    setName("");
    setFlash("Added");
    setTimeout(() => setFlash(null), 1500);
    await refresh();
    setBusy(false);
  }

  async function handleRemove(id: string) {
    await removeKB(id);
    await refresh();
  }

  const canSubmit =
    !!namespace &&
    ((mode === "text" && name.trim() && text.trim()) ||
      (mode === "url" && url.trim()) ||
      (mode === "git" && gitUrl.trim()));

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-100">Knowledge Base</h3>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">{user.role}</span>
      </div>

      <p className="text-[11px] text-slate-500 -mt-2">
        Source of truth for the agent council. Everything generated is grounded here.
      </p>

      {/* Mode tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-800/50 rounded-lg p-1">
        {(["text", "file", "url", "git"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              mode === m ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m === "text" && "Paste"}
            {m === "file" && "Files"}
            {m === "url" && "Link"}
            {m === "git" && "Git repo"}
          </button>
        ))}
      </div>

      {/* Namespace */}
      <label className="block space-y-1">
        <span className="text-xs text-slate-300 font-medium">Category</span>
        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value as KBNamespace | "")}
          className="input"
        >
          <option value="">Select a category…</option>
          {allowed.map((ns) => (
            <option key={ns} value={ns}>{namespaceLabel(ns)}</option>
          ))}
        </select>
      </label>

      {/* Name */}
      <label className="block space-y-1">
        <span className="text-xs text-slate-300 font-medium">
          Name {mode === "file" && <span className="text-slate-500">(optional — uses filename)</span>}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. FMCG One-Pager v3"
          className="input"
        />
      </label>

      {mode === "text" && (
        <label className="block space-y-1">
          <span className="text-xs text-slate-300 font-medium">Content</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the source material here — claims, numbers, positioning, anything reps should cite."
            rows={5}
            className="input resize-none"
          />
        </label>
      )}

      {mode === "url" && (
        <label className="block space-y-1">
          <span className="text-xs text-slate-300 font-medium">URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://clientlens.com/…"
            className="input"
          />
          <div className="flex items-start gap-1.5 bg-amber-900/20 border border-amber-700/40 rounded px-2 py-1.5 mt-1">
            <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
            <span className="block text-[10px] text-amber-200 leading-snug">
              Backend URL fetcher is not live yet. Paste the content as text for now if you need it grounded.
            </span>
          </div>
        </label>
      )}

      {mode === "file" && (
        <label className="block space-y-1">
          <span className="text-xs text-slate-300 font-medium">Files <span className="text-slate-500">(multiple OK)</span></span>
          <input
            type="file"
            accept=".txt,.md,.markdown,.csv,.json,.pdf,.docx,.pptx,.xlsx,.html"
            onChange={handleFile}
            disabled={!namespace || busy}
            multiple
            className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-700 file:bg-slate-800 file:text-slate-200 file:text-xs file:font-medium hover:file:bg-slate-700 file:cursor-pointer cursor-pointer"
          />
          <span className="block text-[10px] text-slate-500">
            .txt / .md / .csv / .json parsed in-browser. .pdf / .docx / .pptx stored and parsed by backend.
          </span>
        </label>
      )}

      {mode === "git" && (
        <div className="space-y-1.5">
          <label className="block space-y-1">
            <span className="text-xs text-slate-300 font-medium">Git repo URL</span>
            <input
              type="url"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/your-org/sales-kit"
              className="input"
            />
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block space-y-1">
              <span className="text-xs text-slate-300 font-medium">Branch</span>
              <input
                type="text"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                placeholder="main"
                className="input"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-slate-300 font-medium">Subpath <span className="text-slate-500">(opt)</span></span>
              <input
                type="text"
                value={gitPath}
                onChange={(e) => setGitPath(e.target.value)}
                placeholder="docs/"
                className="input"
              />
            </label>
          </div>
          <div className="flex items-start gap-1.5 bg-amber-900/20 border border-amber-700/40 rounded px-2 py-1.5">
            <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
            <span className="block text-[10px] text-amber-200 leading-snug">
              Backend git indexer is not live yet. Entry will save but agents will skip it until a sync runs.
            </span>
          </div>
        </div>
      )}

      {mode !== "file" && (
        <button
          onClick={mode === "text" ? handleAddText : mode === "url" ? handleAddUrl : handleAddGit}
          disabled={!canSubmit || busy}
          className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
        >
          {mode === "text" ? <FileText size={12} /> : mode === "url" ? <Link2 size={12} /> : <GitBranch size={12} />}
          Add to KB
        </button>
      )}

      {flash && (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
          <Check size={12} /> {flash}
        </div>
      )}

      {/* Existing entries */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            Entries ({entries.length})
          </span>
        </div>
        {entries.length === 0 && (
          <p className="text-xs text-slate-500 italic">Empty. Add the partner kit docs to get started.</p>
        )}
        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-2 bg-slate-800/40 border border-slate-800 rounded-lg px-2.5 py-2"
            >
              <div className="shrink-0 mt-0.5">
                {e.source_type === "file" && <Upload size={12} className="text-slate-400" />}
                {e.source_type === "url" && <Link2 size={12} className="text-slate-400" />}
                {e.source_type === "text" && <FileText size={12} className="text-slate-400" />}
                {e.source_type === "git" && <GitBranch size={12} className="text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 font-medium truncate">{e.name}</p>
                <p className="text-[10px] text-slate-500">
                  {namespaceLabel(e.namespace)} · {e.uploaded_by_role}
                </p>
                {e.status !== "ready" && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                    <AlertTriangle size={10} /> {e.status_reason || "pending"}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(e.id)}
                className="shrink-0 text-slate-500 hover:text-red-400 transition-colors"
                aria-label="Remove"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
