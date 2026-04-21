// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = "admin" | "designer" | "pmm" | "sales_rep" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
}

// ─── ICP Profiles ───────────────────────────────────────────────────────────

export type ICPRole =
  | "cfo"
  | "cto"
  | "coo"
  | "vp_sales"
  | "vp_engineering"
  | "vp_product"
  | "ceo"
  | "procurement"
  | "custom";

export interface ICPProfile {
  id: string;
  role: ICPRole;
  label: string;
  description: string;
  content_rules: {
    lead_with: string[];
    avoid: string[];
    block_types: string[];
    tone: string;
  };
}

// ─── Company Context ─────────────────────────────────────────────────────────

export interface CompanyContext {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  detected_from?: "linkedin" | "website" | "manual";
  logo_url?: string;
  primary_color?: string;
}

// ─── Document Actions ─────────────────────────────────────────────────────────

export type ActionType =
  | "generate_new"
  | "update_section"
  | "add_slide"
  | "refine_content"
  | "make_icp_friendly"
  | "add_roi_slide"
  | "simplify"
  | "make_technical";

export type OutputType = "google_slides" | "google_doc" | "pdf" | "notion";

// ─── Generation Request ───────────────────────────────────────────────────────

export interface GenerationRequest {
  company: CompanyContext;
  icp_role: ICPRole;
  use_case: string;
  action_type: ActionType;
  output_type: OutputType;
  current_document?: DocumentState;
  selected_section?: string;
  user_instruction?: string;
  live_mode?: boolean;
}

export interface DocumentState {
  url: string;
  doc_id?: string;
  doc_type: "slides" | "docs" | "notion" | "unknown";
  current_content?: SlideContent[];
  selected_text?: string;
}

// ─── Slide / Content Structures ───────────────────────────────────────────────

export type ComponentType =
  | "title_block"
  | "text_block"
  | "metric_block"
  | "architecture_block"
  | "quote_block"
  | "case_study_block"
  | "comparison_table"
  | "bullet_list"
  | "image_placeholder"
  | "cta_block";

export interface SlideComponent {
  type: ComponentType;
  content: string | Record<string, unknown>;
  style?: Record<string, string>;
}

export interface SlideContent {
  index: number;
  title: string;
  components: SlideComponent[];
  speaker_notes?: string;
}

// ─── Agent Pipeline ───────────────────────────────────────────────────────────

export type AgentName =
  | "retrieval"
  | "brand_compliance"
  | "icp_personalization"
  | "validation";

export interface AgentResult {
  agent: AgentName;
  status: "pass" | "fail" | "warning";
  output: unknown;
  issues?: string[];
  confidence: number;
}

export interface PipelineResult {
  request_id: string;
  agents: AgentResult[];
  final_output: {
    slides: SlideContent[];
    renderable_text: string;
    structured_json: unknown;
  };
  metadata: {
    sources_used: string[];
    brand_compliant: boolean;
    hallucination_check: "clean" | "flagged";
    generated_at: string;
  };
}

// ─── Design System ────────────────────────────────────────────────────────────

export interface DesignSystem {
  id: string;
  version: string;
  uploaded_by: string;
  uploaded_at: string;
  colors: Record<string, string>;
  typography: {
    heading: string;
    body: string;
    accent: string;
  };
  allowed_components: ComponentType[];
  templates: DesignTemplate[];
}

export interface DesignTemplate {
  id: string;
  name: string;
  layout: string;
  allowed_for_icp?: ICPRole[];
}

// ─── Brand Voice ──────────────────────────────────────────────────────────────

export interface BrandVoice {
  id: string;
  version: string;
  updated_by: string;
  updated_at: string;
  tone_adjectives: string[];
  avoid_words: string[];
  messaging_framework: {
    tagline: string;
    elevator_pitch: string;
    value_props: string[];
  };
  icp_tone_overrides: Partial<Record<ICPRole, string[]>>;
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export type KBNamespace =
  | "product_overview"
  | "industry_pages"
  | "case_studies"
  | "battlecard"
  | "security_compliance"
  | "roi_pricing"
  | "brand_voice"
  | "design_system"
  | "icp_profiles";

export type KBSourceType = "text" | "file" | "url" | "git";

export type KBStatus = "ready" | "pending_parse" | "error";

export interface KBEntry {
  id: string;
  name: string;
  namespace: KBNamespace;
  source_type: KBSourceType;
  content: string; // raw text for text/md/txt; placeholder for pending files
  url?: string;
  file_type?: string;
  file_size?: number;
  status: KBStatus;
  status_reason?: string;
  uploaded_by: string;
  uploaded_by_role: UserRole;
  uploaded_at: string;
}

// ─── Personalization Form ─────────────────────────────────────────────────────

export type MeetingStage =
  | "discovery"
  | "tech_deep_dive"
  | "poc_scoping"
  | "poc_execution"
  | "poc_review"
  | "commercial_close";

export type DealSizeBand = "lt_100k" | "100k_1m" | "gt_1m";

export type CloudProvider = "aws" | "gcp" | "azure";

export interface PersonalizationInput {
  // Required
  company_name: string;
  persona_role: string;
  deal_size: DealSizeBand;
  // Optional
  meeting_stage?: MeetingStage;
  clouds?: CloudProvider[];
  region?: string;
  competitor?: string;
  pain_points?: string;
}

export interface BrandAssets {
  company_name: string;
  domain?: string;
  logo_url?: string;
  logo_source: "uploaded" | "web" | "placeholder";
  primary_color?: string;
  secondary_color?: string;
  descriptor?: string;
  industry?: string;
}

export type FlowStep = "form" | "preview" | "generating" | "result";

// ─── Extension Messages ───────────────────────────────────────────────────────

export type ExtensionMessageType =
  | "GET_PAGE_CONTEXT"
  | "PAGE_CONTEXT_RESULT"
  | "GET_DOCUMENT_STATE"
  | "DOCUMENT_STATE_RESULT"
  | "INSERT_CONTENT"
  | "WRITE_TO_DOC"
  | "UNDO_WRITE"
  | "OPEN_SIDEBAR"
  | "AUTH_STATE_CHANGED"
  | "FETCH_URL_TEXT"
  | "OBJECTION_CAPTURE"
  | "COUNCIL_NOTIFY";

// ─── Output Modes ─────────────────────────────────────────────────────────────

export type OutputMode = "pitch" | "email" | "objection";

// ─── Email Drafting ───────────────────────────────────────────────────────────

export type EmailIntent = "intro" | "follow_up" | "post_call" | "objection" | "close" | "custom";

export interface EmailInput {
  recipient_name: string;
  company_name: string;
  persona_role: string;
  intent: EmailIntent;
  context: string;
  thread_excerpt?: string;
  deal_size?: DealSizeBand;
  competitor?: string;
  custom_instruction?: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  cta: string;
  tone_notes?: string;
  sources_used: string[];
}

export interface EmailPipelineResult {
  request_id: string;
  agents: AgentResult[];
  final_output: EmailDraft;
  metadata: {
    sources_used: string[];
    brand_compliant: boolean;
    generated_at: string;
    intent: EmailIntent;
  };
}

// ─── Objection Handling ──────────────────────────────────────────────────────

export interface ObjectionInput {
  objection_text: string;
  source_url?: string;
  source_title?: string;
  competitor_hint?: string;
}

export interface ObjectionResponse {
  summary: string;
  response: string;
  citations: { source_id: string; quote: string }[];
  confidence: number;
}

// ─── Deep Research ────────────────────────────────────────────────────────────

export interface ResearchBrief {
  company_name: string;
  domain: string;
  one_liner: string;
  industry?: string;
  size_signal?: string;
  tech_signals: string[];
  named_customers: string[];
  pain_signals: string[];
  recent_signals: string[];
  raw_sources: { url: string; title: string; excerpt: string }[];
  generated_at: string;
}

export interface ExtensionMessage {
  type: ExtensionMessageType;
  payload?: unknown;
  tabId?: number;
}
