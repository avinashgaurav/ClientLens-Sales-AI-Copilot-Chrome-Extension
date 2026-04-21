import React, { useEffect, useState } from "react";
import { useAppStore } from "./stores/app-store";
import { usePageContext } from "./hooks/usePageContext";
import { PersonalizationForm } from "./components/PersonalizationForm";
import { AssetPreview } from "./components/AssetPreview";
import { CouncilRunner } from "./components/CouncilRunner";
import { ResultPanel } from "./components/ResultPanel";
import { LiveModeToggle } from "./components/LiveModeToggle";
import { AuthGate } from "./components/AuthGate";
import { DesignerPanel } from "./components/DesignerPanel";
import { KnowledgeBasePanel } from "./components/KnowledgeBasePanel";
import { Header } from "./components/Header";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { EmailForm } from "./components/EmailForm";
import { EmailResult } from "./components/EmailResult";
import { ObjectionPanel } from "./components/ObjectionPanel";

type AdminTab = "form" | "kb";

export default function App() {
  const { user, isGenerating, lastResult, error, flowStep, outputMode, lastEmail } = useAppStore();
  const { detectContext } = usePageContext();
  const [adminTab, setAdminTab] = useState<AdminTab>("form");

  useEffect(() => {
    detectContext();
  }, []);

  if (!user) {
    return <AuthGate />;
  }

  const hasKBAccess = user.role === "admin" || user.role === "pmm" || user.role === "designer";
  const showTabs = hasKBAccess;

  return (
    <div className="flex flex-col h-screen bg-[#0d0d1a] text-slate-200 text-sm overflow-hidden">
      <Header />

      {showTabs && (
        <div className="px-3 pt-2">
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setAdminTab("form")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                adminTab === "form" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Generate Pitch
            </button>
            <button
              onClick={() => setAdminTab("kb")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                adminTab === "kb" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Knowledge Base
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-3 py-2 text-red-300 text-xs">
            {error}
          </div>
        )}

        {(!showTabs || adminTab === "form") && (
          <>
            <ModeSwitcher />

            {outputMode === "pitch" && (
              <>
                <LiveModeToggle />
                {flowStep === "form" && <PersonalizationForm />}
                {flowStep === "preview" && <AssetPreview />}
                {(flowStep === "generating" || isGenerating) && <CouncilRunner />}
                {flowStep === "result" && lastResult && <ResultPanel result={lastResult} />}
              </>
            )}

            {outputMode === "email" && (
              <>
                {isGenerating && <CouncilRunner />}
                {!isGenerating && (lastEmail ? <EmailResult /> : <EmailForm />)}
              </>
            )}

            {outputMode === "objection" && (
              <>
                {isGenerating && <CouncilRunner />}
                {!isGenerating && <ObjectionPanel />}
              </>
            )}
          </>
        )}

        {showTabs && adminTab === "kb" && (
          <>
            <KnowledgeBasePanel />
            {(user.role === "designer" || user.role === "admin" || user.role === "pmm") && <DesignerPanel />}
          </>
        )}
      </div>
    </div>
  );
}
