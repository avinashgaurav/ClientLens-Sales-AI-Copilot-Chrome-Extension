import React from "react";
import { Radio } from "lucide-react";
import { useAppStore } from "../stores/app-store";

export function LiveModeToggle() {
  const { isLiveMode, setIsLiveMode } = useAppStore();

  return (
    <button
      onClick={() => setIsLiveMode(!isLiveMode)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
        isLiveMode
          ? "border-red-500/50 bg-red-900/20 text-red-300"
          : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <Radio size={13} className={isLiveMode ? "animate-pulse" : ""} />
        <span className="text-xs font-semibold">
          {isLiveMode ? "Live Meeting Mode — ON" : "Live Meeting Mode"}
        </span>
      </div>
      <div className={`w-8 h-4 rounded-full transition-colors relative ${
        isLiveMode ? "bg-red-500" : "bg-slate-700"
      }`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
          isLiveMode ? "left-4.5" : "left-0.5"
        }`} />
      </div>
    </button>
  );
}
