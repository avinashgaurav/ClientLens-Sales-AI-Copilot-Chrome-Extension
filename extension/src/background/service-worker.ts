import type { ExtensionMessage, SlideContent } from "../shared/types";
import { writeToDoc, undoWrite } from "./google-writer";

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id! });
});

// ─── Context menu: "Handle objection with ClientLens" ─────────────────────────
const OBJECTION_MENU_ID = "clientlens-handle-objection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: OBJECTION_MENU_ID,
    title: "ClientLens: Handle objection",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== OBJECTION_MENU_ID || !info.selectionText) return;

  const payload = {
    objection_text: info.selectionText,
    source_url: info.pageUrl,
    source_title: tab?.title,
  };

  // Cache so the sidebar can pick it up on open.
  await chrome.storage.session.set({ pending_objection: payload });

  if (tab?.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch { /* some chrome builds require user gesture; the cached payload still survives */ }
  }

  // Notify any open sidebar instance.
  chrome.runtime.sendMessage({ type: "OBJECTION_CAPTURE", payload }).catch(() => { /* sidebar not open yet */ });
});

// Handle messages from sidebar + content scripts
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    switch (message.type) {
      case "GET_PAGE_CONTEXT":
        handleGetPageContext(sender.tab?.id, sendResponse);
        return true; // keep channel open for async

      case "GET_DOCUMENT_STATE":
        handleGetDocumentState(sender.tab?.id, sendResponse);
        return true;

      case "INSERT_CONTENT":
        handleInsertContent(message.payload, sender.tab?.id, sendResponse);
        return true;

      case "WRITE_TO_DOC":
        handleWriteToDoc(message.payload, sendResponse);
        return true;

      case "UNDO_WRITE":
        handleUndoWrite(message.payload, sendResponse);
        return true;

      case "OPEN_SIDEBAR":
        if (sender.tab?.id) {
          chrome.sidePanel.open({ tabId: sender.tab.id });
        }
        sendResponse({ success: true });
        return false;

      case "FETCH_URL_TEXT":
        handleFetchUrlText(message.payload, sendResponse);
        return true;

      case "COUNCIL_NOTIFY":
        handleCouncilNotify(message.payload);
        sendResponse({ success: true });
        return false;
    }
  }
);

async function handleFetchUrlText(
  payload: unknown,
  sendResponse: (r: unknown) => void,
) {
  try {
    const { url } = payload as { url?: string };
    if (!url) {
      sendResponse({ success: false, error: "missing url" });
      return;
    }
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      sendResponse({ success: false, error: `HTTP ${res.status}` });
      return;
    }
    const html = await res.text();
    sendResponse({ success: true, html, contentType: res.headers.get("content-type") ?? "" });
  } catch (err) {
    sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

function handleCouncilNotify(payload: unknown) {
  const { title, message, kind } = (payload ?? {}) as { title?: string; message?: string; kind?: "done" | "error" };
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: title ?? (kind === "error" ? "ClientLens — generation failed" : "ClientLens — ready"),
    message: message ?? "",
    priority: kind === "error" ? 2 : 1,
  });
}

async function handleGetPageContext(
  tabId: number | undefined,
  sendResponse: (r: unknown) => void
) {
  if (!tabId) {
    sendResponse({ error: "No active tab" });
    return;
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractPageContext,
    });
    sendResponse({ success: true, data: results[0]?.result });
  } catch (err) {
    sendResponse({ error: String(err) });
  }
}

async function handleGetDocumentState(
  tabId: number | undefined,
  sendResponse: (r: unknown) => void
) {
  if (!tabId) {
    sendResponse({ error: "No active tab" });
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? "";

    const docType = detectDocType(url);
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractDocumentState,
      args: [docType],
    });
    sendResponse({ success: true, data: results[0]?.result });
  } catch (err) {
    sendResponse({ error: String(err) });
  }
}

async function handleInsertContent(
  payload: unknown,
  tabId: number | undefined,
  sendResponse: (r: unknown) => void
) {
  if (!tabId) {
    sendResponse({ error: "No active tab" });
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: insertContentIntoDoc,
      args: [payload],
    });
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ error: String(err) });
  }
}

// Injected into the page — no closure access
function extractPageContext() {
  const url = window.location.href;
  const title = document.title;
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";

  // LinkedIn company page detection
  const linkedInCompany = document.querySelector(".org-top-card-summary__title")?.textContent?.trim();
  const linkedInIndustry = document.querySelector(".org-top-card-summary-info-list__info-item")?.textContent?.trim();

  // Generic company name detection
  const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");

  return {
    url,
    title,
    meta_description: metaDesc,
    company_name: linkedInCompany ?? ogSiteName ?? null,
    industry: linkedInIndustry ?? null,
    logo_candidate: ogImage ?? null,
    source: url.includes("linkedin.com") ? "linkedin" : "website",
  };
}

function extractDocumentState(docType: string) {
  if (docType === "slides") {
    const slides = Array.from(document.querySelectorAll(".punch-filmstrip-frame"))
      .slice(0, 20)
      .map((el, i) => ({
        index: i,
        title: el.querySelector(".punch-presenter-title")?.textContent?.trim() ?? "",
        text_preview: el.textContent?.slice(0, 200).trim() ?? "",
      }));
    return { doc_type: "slides", slides, url: window.location.href };
  }

  if (docType === "docs") {
    const content = document.querySelector(".kix-appview-editor")?.textContent?.slice(0, 3000) ?? "";
    return { doc_type: "docs", content_preview: content, url: window.location.href };
  }

  return { doc_type: "unknown", url: window.location.href };
}

function insertContentIntoDoc(payload: unknown) {
  // Dispatches a custom event that the content script listens to
  window.dispatchEvent(new CustomEvent("CLIENTLENS_INSERT", { detail: payload }));
}

function detectDocType(url: string): string {
  if (url.includes("docs.google.com/presentation")) return "slides";
  if (url.includes("docs.google.com/document")) return "docs";
  if (url.includes("notion.so")) return "notion";
  return "unknown";
}

async function handleWriteToDoc(
  payload: unknown,
  sendResponse: (r: unknown) => void,
) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? "";
    const slides = (payload as { slides?: SlideContent[] })?.slides ?? [];
    const result = await writeToDoc({ url, slides });
    sendResponse(result);
  } catch (err) {
    sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

async function handleUndoWrite(
  payload: unknown,
  sendResponse: (r: unknown) => void,
) {
  try {
    const snapshotId = (payload as { snapshot_id?: string })?.snapshot_id;
    if (!snapshotId) {
      sendResponse({ success: false, error: "No snapshot_id" });
      return;
    }
    const result = await undoWrite(snapshotId);
    sendResponse(result);
  } catch (err) {
    sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

// Keep service worker alive during active generation
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepalive") {
    keepAliveInterval = setInterval(() => {
      port.postMessage({ type: "ping" });
    }, 20000);
    port.onDisconnect.addListener(() => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    });
  }
});
