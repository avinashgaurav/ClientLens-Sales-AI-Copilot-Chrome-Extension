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

export type PitchFormat = "on_screen_ppt" | "one_pager" | "detailed_doc" | "analysis" | "custom_doc";

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
  pitch_format?: PitchFormat;
  /**
   * Free-form hint when pitch_format = "custom_doc". Optional — when blank,
   * the orchestrator infers the doc shape from the surrounding context
   * (open tab, persona, pain points, KB hits).
   */
  pitch_format_custom_hint?: string;
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

// ─── V2: Meeting Copilot ─────────────────────────────────────────────────────

export type MeetingPlatform = "google_meet" | "zoom_web" | "teams_web" | "other";

export type MeetingSessionStatus =
  | "idle"
  | "preparing"
  | "listening"
  | "paused"
  | "ended"
  | "error";

export type TranscriptSpeaker = "rep" | "prospect" | "unknown";

export interface TranscriptSegment {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  ts_start: number; // ms since session start
  ts_end: number;
  confidence?: number;
  is_final: boolean;
}

export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";

export interface SentimentSnapshot {
  id: string;
  captured_at: number; // ms since session start
  prospect: SentimentLabel;
  rep: SentimentLabel;
  energy: "low" | "medium" | "high";
  engagement: "low" | "medium" | "high";
  signals: string[]; // e.g. ["skeptical", "price-sensitive", "excited"]
  rationale?: string;
}

export type AgendaItemStatus = "pending" | "in_progress" | "covered" | "skipped";

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  priority: "must_cover" | "should_cover" | "nice_to_have";
  status: AgendaItemStatus;
  covered_at_ms?: number;
  evidence_segment_ids?: string[];
}

export type CoachSuggestionKind =
  | "say_next"
  | "avoid"
  | "ask_question"
  | "handle_objection"
  | "cover_agenda"
  | "kb_answer"
  | "sentiment_shift";

export interface CoachSuggestion {
  id: string;
  kind: CoachSuggestionKind;
  title: string;
  body: string;
  urgency: "low" | "medium" | "high";
  created_at: number; // ms since session start
  expires_at?: number;
  sources?: { kb_entry_id: string; quote: string }[];
  trigger_segment_id?: string;
  dismissed?: boolean;
  acted_on?: boolean;
  // Trust layer — filled by council validator and the coach prompt.
  rationale?: string;      // why the coach raised this ("prospect hesitated on timeline")
  confidence?: number;     // 0..1 from validator; drives visual treatment
}

// Emitted by the orchestrator when the live validator rejects a coach
// suggestion. Surfaced on the transponder as a faint "blocked" pill so reps
// see the system working instead of silently dropping ideas.
export interface CoachRejection {
  id: string;
  created_at: number;
  title: string;
  body: string;
  kind: CoachSuggestionKind;
  issues: string[];
  confidence: number;
}

export interface CRMContext {
  provider: "zoho" | "none";
  account_id?: string;
  account_name?: string;
  deal_id?: string;
  deal_name?: string;
  deal_stage?: string;
  deal_amount?: number;
  contact_ids?: string[];
  last_note_preview?: string;
  notes_url?: string;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  domain?: string;
  is_organizer?: boolean;
  response_status?: "accepted" | "declined" | "tentative" | "needsAction";
}

export interface CalendarEvent {
  id: string;
  provider: "google";
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  meeting_url?: string;
  platform?: MeetingPlatform;
  attendees: CalendarAttendee[];
  organizer_email?: string;
}

export interface MeetingSessionInput {
  company_name: string;
  persona_role: string;
  deal_size?: DealSizeBand;
  meeting_stage?: MeetingStage;
  agenda: AgendaItem[];
  calendar_event?: CalendarEvent;
  crm_context?: CRMContext;
  icp_role?: ICPRole;
  meeting_title?: string;
  meeting_notes?: string;
}

export interface MeetingSession {
  id: string;
  status: MeetingSessionStatus;
  started_at?: string; // ISO
  ended_at?: string;
  platform: MeetingPlatform;
  tab_id?: number;
  input: MeetingSessionInput;
  transcript: TranscriptSegment[];
  sentiment_history: SentimentSnapshot[];
  suggestions: CoachSuggestion[];
  agenda: AgendaItem[];
  error?: string;
}

export type MeetingCopilotMessageType =
  | "MC_START_SESSION"
  | "MC_STOP_SESSION"
  | "MC_SESSION_UPDATED"
  | "MC_TRANSCRIPT_APPEND"
  | "MC_SUGGESTION_PUSH"
  | "MC_SENTIMENT_UPDATE"
  | "MC_AGENDA_UPDATE"
  | "MC_ASK_KB"
  | "MC_KB_ANSWER"
  | "MC_TRANSPONDER_OPEN"
  | "MC_TRANSPONDER_CLOSE"
  | "MC_AUDIO_CHUNK"
  | "MC_AUDIO_STATE";

export interface MeetingCopilotMessage {
  type: MeetingCopilotMessageType;
  session_id?: string;
  payload?: unknown;
  tabId?: number;
}

export interface MeetingPostCallSummary {
  session_id: string;
  headline: string;
  what_went_well: string[];
  what_to_improve: string[];
  objections_raised: { objection: string; response_quality: "good" | "weak" | "missed" }[];
  action_items: { owner: "rep" | "prospect"; text: string; due?: string }[];
  agenda_coverage: { item: string; status: AgendaItemStatus }[];
  suggested_followup_email?: EmailDraft;
  suggested_crm_note?: string;
  generated_at: string;
}
