import React, { useState } from "react";
import { Copy, ExternalLink, ChevronDown, ChevronUp, ShieldCheck, Undo2, Loader2, Plus } from "lucide-react";
import type { PipelineResult } from "../../shared/types";
import { useAppStore } from "../stores/app-store";

interface Props {
  result: PipelineResult;
}

interface WriteResponse {
  success: boolean;
  slides_written?: number;
  snapshot_id?: string;
  error?: string;
}

export function ResultPanel({ result }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [writing, setWriting] = useState(false);
  const [writeStatus, setWriteStatus] = useState<WriteResponse | null>(null);
  const { setFlowStep, setLastResult } = useAppStore();

  function handleCopy() {
    navigator.clipboard.writeText(result.final_output.renderable_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleWrite() {
    setWriting(true);
    setWriteStatus(null);
    try {
      const res: WriteResponse = await chrome.runtime.sendMessage({
        type: "WRITE_TO_DOC",
        payload: { slides: result.final_output.slides },
      });
      setWriteStatus(res);
    } catch (err) {
      setWriteStatus({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setWriting(false);
    }
  }

  async function handleUndo() {
    if (!writeStatus?.snapshot_id) return;
    setWriting(true);
    try {
      const res: WriteResponse = await chrome.runtime.sendMessage({
        type: "UNDO_WRITE",
        payload: { snapshot_id: writeStatus.snapshot_id },
      });
      if (res.success) setWriteStatus(null);
      else setWriteStatus(res);
    } finally {
      setWriting(false);
    }
  }

  function handleNewRun() {
    setLastResult(null);
    setFlowStep("form");
  }

  const allAgentsPassed = result.agents.every((a) => a.status !== "fail");

  return (
    <div className="bg-slate-900 rounded-xl border border-emerald-500/30 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">Generated Output</span>
          {allAgentsPassed && (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 rounded-full border border-emerald-700/50">
              All checks passed
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-slate-300"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Agent results summary */}
      <div className="flex gap-2">
        {result.agents.map((agent) => (
          <div
            key={agent.agent}
            className={`flex-1 text-center py-1 rounded-lg text-[10px] font-medium border ${
              agent.status === "pass"
                ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-400"
                : agent.status === "warning"
                ? "border-yellow-700/50 bg-yellow-900/30 text-yellow-400"
                : "border-red-700/50 bg-red-900/30 text-red-400"
            }`}
          >
            A{result.agents.indexOf(agent) + 1} {agent.status === "pass" ? "✓" : agent.status === "warning" ? "!" : "✗"}
          </div>
        ))}
      </div>

      {expanded && (
        <>
          {/* Sources used */}
          {result.metadata.sources_used.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Sources used</div>
              <div className="flex flex-wrap gap-1">
                {result.metadata.sources_used.map((src) => (
                  <span
                    key={src}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content preview */}
          <div className="bg-slate-800 rounded-lg p-2.5 max-h-48 overflow-y-auto">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
              {result.final_output.renderable_text}
            </pre>
          </div>

          {/* Slides count */}
          <div className="text-xs text-slate-500">
            {result.final_output.slides.length} slide{result.final_output.slides.length !== 1 ? "s" : ""} generated
            {" · "}
            <span className={result.metadata.hallucination_check === "clean" ? "text-emerald-400" : "text-yellow-400"}>
              {result.metadata.hallucination_check === "clean" ? "No hallucinations detected" : "Review flagged content"}
            </span>
          </div>

          {/* Write status */}
          {writeStatus && (
            <div
              className={`text-xs rounded-lg px-3 py-2 border ${
                writeStatus.success
                  ? "bg-emerald-900/30 border-emerald-700/50 text-emerald-300"
                  : "bg-red-900/30 border-red-700/50 text-red-300"
              }`}
            >
              {writeStatus.success
                ? `Wrote ${writeStatus.slides_written} slides to the open doc.`
                : `Write failed: ${writeStatus.error}`}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-700"
            >
              <Copy size={12} />
              {copied ? "Copied!" : "Copy text"}
            </button>
            {writeStatus?.success && writeStatus.snapshot_id ? (
              <button
                onClick={handleUndo}
                disabled={writing}
                className="flex items-center justify-center gap-1.5 py-2 bg-amber-700/40 hover:bg-amber-700/60 text-amber-200 rounded-lg text-xs transition-colors border border-amber-700/50 disabled:opacity-50"
              >
                {writing ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                Undo last write
              </button>
            ) : (
              <button
                onClick={handleWrite}
                disabled={writing}
                className="flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white rounded-lg text-xs transition-colors"
              >
                {writing ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                {writing ? "Writing…" : "Write to open doc"}
              </button>
            )}
          </div>

          <button
            onClick={handleNewRun}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors"
          >
            <Plus size={12} /> Run again for another target
          </button>
        </>
      )}
    </div>
  );
}
