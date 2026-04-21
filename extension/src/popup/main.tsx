import React from "react";
import { createRoot } from "react-dom/client";
import { Zap } from "lucide-react";

function Popup() {
  function openSidebar() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    });
  }

  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ width: 32, height: 32, background: "#7c3aed", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={16} color="white" />
        </div>
        <span style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>ClientLens</span>
      </div>
      <button
        onClick={openSidebar}
        style={{
          width: "100%", padding: "10px", background: "#7c3aed",
          color: "white", border: "none", borderRadius: 8,
          cursor: "pointer", fontSize: 13, fontWeight: 600,
        }}
      >
        Open Sales Assistant
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
