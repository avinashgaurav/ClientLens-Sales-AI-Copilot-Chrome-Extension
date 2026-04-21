import React from "react";
import { FileText, Mail, Shield } from "lucide-react";
import { useAppStore } from "../stores/app-store";
import type { OutputMode } from "../../shared/types";

const MODES: { id: OutputMode; label: string; icon: React.ReactNode }[] = [
  { id: "pitch", label: "Pitch", icon: <FileText size={12} /> },
  { id: "email", label: "Email", icon: <Mail size={12} /> },
  { id: "objection", label: "Objection", icon: <Shield size={12} /> },
];

export function ModeSwitcher() {
  const { outputMode, setOutputMode } = useAppStore();
  return (
    <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setOutputMode(m.id)}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            outputMode === m.id ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}
