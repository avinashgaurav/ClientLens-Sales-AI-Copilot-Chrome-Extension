import React, { useState } from "react";
import { Sparkles, Loader2, Search } from "lucide-react";
import { useAppStore } from "../stores/app-store";
import { fetchBrandAssets } from "../../shared/utils/brand-assets";
import type {
  PersonalizationInput,
  MeetingStage,
  DealSizeBand,
  CloudProvider,
} from "../../shared/types";

const STAGES: { value: MeetingStage; label: string }[] = [
  { value: "discovery", label: "Discovery" },
  { value: "tech_deep_dive", label: "Tech Deep Dive" },
  { value: "poc_scoping", label: "POC Scoping" },
  { value: "poc_execution", label: "POC Execution" },
  { value: "poc_review", label: "POC Review" },
  { value: "commercial_close", label: "Commercial Close" },
];

const DEAL_SIZES: { value: DealSizeBand; label: string }[] = [
  { value: "lt_100k", label: "< $100K annual cloud spend" },
  { value: "100k_1m", label: "$100K – $1M" },
  { value: "gt_1m", label: "$1M+" },
];

const CLOUDS: { value: CloudProvider; label: string }[] = [
  { value: "aws", label: "AWS" },
  { value: "gcp", label: "GCP" },
  { value: "azure", label: "Azure" },
];

export function PersonalizationForm() {
  const {
    setPersonalization,
    setBrandAssets,
    setFlowStep,
    setError,
    deepResearchEnabled,
    setDeepResearchEnabled,
  } = useAppStore();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [dealSize, setDealSize] = useState<DealSizeBand | "">("");
  const [stage, setStage] = useState<MeetingStage | "">("");
  const [clouds, setClouds] = useState<CloudProvider[]>([]);
  const [region, setRegion] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [pains, setPains] = useState("");
  const [fetching, setFetching] = useState(false);

  const canSubmit = company.trim() && role.trim() && dealSize;

  function toggleCloud(c: CloudProvider) {
    setClouds((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const input: PersonalizationInput = {
      company_name: company.trim(),
      persona_role: role.trim(),
      deal_size: dealSize as DealSizeBand,
      meeting_stage: stage || undefined,
      clouds: clouds.length ? clouds : undefined,
      region: region.trim() || undefined,
      competitor: competitor.trim() || undefined,
      pain_points: pains.trim() || undefined,
    };

    setPersonalization(input);
    setFetching(true);
    setError(null);

    try {
      const assets = await fetchBrandAssets(input.company_name);
      setBrandAssets(assets);
      setFlowStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch brand assets");
    } finally {
      setFetching(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100 mb-1">Personalize this deck</h2>
        <p className="text-xs text-slate-500">
          Fill required fields. Optional fields sharpen personalization.
        </p>
      </div>

      <Field label="Company name" required>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Coca-Cola"
          className="input"
        />
      </Field>

      <Field label="Persona role" required hint="e.g. CFO, VP Engineering, Head of FinOps">
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="CFO"
          className="input"
        />
      </Field>

      <Field label="Deal size / annual cloud spend" required>
        <select
          value={dealSize}
          onChange={(e) => setDealSize(e.target.value as DealSizeBand | "")}
          className="input"
        >
          <option value="">Select…</option>
          {DEAL_SIZES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </Field>

      <div className="pt-2 border-t border-slate-800">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Optional</p>
      </div>

      <Field label="Meeting stage">
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as MeetingStage | "")}
          className="input"
        >
          <option value="">Defaults to Discovery</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Primary cloud(s)">
        <div className="flex gap-2">
          {CLOUDS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCloud(c.value)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                clouds.includes(c.value)
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Region / data sovereignty">
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. India-Mumbai, EU, US, Global"
          className="input"
        />
      </Field>

      <Field label="Competitor in deal">
        <input
          type="text"
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          placeholder="e.g. CloudHealth, Spot.io, Cast.ai"
          className="input"
        />
      </Field>

      <Field label="Known pain points">
        <textarea
          value={pains}
          onChange={(e) => setPains(e.target.value)}
          placeholder="Short notes — anything the rep has heard from the buyer"
          rows={3}
          className="input resize-none"
        />
      </Field>

      <label className="flex items-start gap-2 cursor-pointer bg-cyan-900/20 border border-cyan-700/40 rounded-lg px-3 py-2">
        <input
          type="checkbox"
          checked={deepResearchEnabled}
          onChange={(e) => setDeepResearchEnabled(e.target.checked)}
          className="mt-0.5"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Search size={11} className="text-cyan-400" />
            <span className="text-xs text-slate-200 font-medium">Deep research</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Fetch the prospect's homepage and distill tech stack, customers, and recent signals before drafting. Slower but sharper.
          </span>
        </div>
      </label>

      <button
        type="submit"
        disabled={!canSubmit || fetching}
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {fetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {fetching ? "Fetching brand assets…" : "Continue"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-300 font-medium">
        {label}
        {required && <span className="text-violet-400 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-slate-500">{hint}</span>}
    </label>
  );
}
