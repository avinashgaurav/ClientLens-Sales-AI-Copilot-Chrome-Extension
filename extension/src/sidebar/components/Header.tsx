import React from "react";
import { useAppStore } from "../stores/app-store";
import { Zap, LogOut } from "lucide-react";
import { signOut } from "../../shared/auth/google-sso";
import { ModelPicker } from "./ModelPicker";

const ROLE_COLORS: Record<string, string> = {
  admin: "text-yellow-400",
  designer: "text-purple-400",
  pmm: "text-green-400",
  sales_rep: "text-blue-400",
  viewer: "text-slate-400",
};

export function Header() {
  const { user, setUser } = useAppStore();

  async function handleLogout() {
    await signOut();
    setUser(null);
  }

  return (
    <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800 bg-[#0d0d1a]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-semibold text-slate-100 text-sm">ClientLens</span>
      </div>

      <div className="flex items-center gap-2">
        <ModelPicker />
        {user && (
          <span className={`text-xs font-medium uppercase tracking-wide ${ROLE_COLORS[user.role] ?? "text-slate-400"}`}>
            {user.role.replace("_", " ")}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
