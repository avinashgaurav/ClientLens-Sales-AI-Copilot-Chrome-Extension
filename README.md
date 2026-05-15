# Project Wingman — Sales Copilot Chrome Extension

An AI-powered Chrome extension that lives in your browser sidebar and helps B2B sales reps **generate personalized pitches, run live meeting copilots on Google Meet, handle objections, and push everything back to their CRM** — without juggling tabs.

Behind the sidebar sits a FastAPI backend with a multi-agent RAG pipeline, a Pinecone-backed knowledge base, Deepgram speech-to-text, and pluggable LLM providers (Anthropic / Gemini / Groq / OpenRouter / any OpenAI-compatible endpoint).

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Features in detail](#features-in-detail)
3. [Architecture](#architecture)
4. [Project structure](#project-structure)
5. [Quick start](#quick-start)
6. [Configuration](#configuration)
7. [Development guide](#development-guide)
8. [Security model](#security-model)
9. [Tech stack](#tech-stack)
10. [Roadmap](#roadmap)

---

## What it does

A sales rep's typical hour: jump into Google Meet, lose track of the agenda, fumble the objection, take a half-page of notes, paste them into the CRM, then forget to send the follow-up pitch. Wingman compresses that loop:

- **Pre-call** — generate a personalized pitch deck and a tailored email for the prospect using their public signals and your indexed knowledge base.
- **During the call** — a real-time sidebar surfaces talking points, objection handles, agenda pacing, and a sentiment read on the prospect. A small in-Meet transponder overlays the same suggestions on the meeting tab.
- **After the call** — a post-call summary is generated, pushed into Zoho CRM with one click, and a follow-up email is drafted from the council of email-writing agents.

The product is deliberately **bring-your-own-keys**. The extension never holds an LLM provider key in the browser; all keys live in the FastAPI backend's `.env`. The extension talks to the backend over HTTPS, and the backend proxies to the LLM provider of your choice.

---

## Features in detail

### 1. Personalized Pitch Generation

A multi-agent pipeline that turns "company name + ICP" into a structured pitch.

- **Page-context capture** — the content script reads the current tab (LinkedIn profile, company website, press release) and extracts company name, role hints, and industry signals.
- **ICP selector** — pick the persona you're pitching to: CFO, CTO, VP Sales, RevOps, or generic. Each profile drives a different tone, ROI framing, and feature emphasis.
- **Personalization form** — manual overrides for company name, contact, industry, key pain points, custom notes. Everything is editable before generation.
- **Council pipeline** runs four agents in sequence:
  1. **Retrieval Agent** — pulls the most relevant chunks from your KB via Pinecone (or in-browser vector store) using cosine similarity over Gemini embeddings.
  2. **ICP Personalization Agent** — drafts a ${persona}-tailored deck grounded only in the retrieved sources. No inventing customers, savings figures, or quotes.
  3. **Brand Compliance Agent** — checks the draft against your voice guidelines (banned hype words: "revolutionary", "game-changing", "best-in-class", "world-class", "synergy", "cutting-edge"; required factual baseline).
  4. **Validation Agent** — fact-checks every numeric claim against a `source_id` citation. Rejects unsourced numbers.
- **Output formats** — on-screen presentation, one-pager, detailed doc, or analysis-style writeup (configurable per generation).
- **Streaming UI** — `GenerationProgress` shows live stage transitions ("Retrieving sources…", "Checking brand compliance…", "Validating claims…") so the rep knows what's happening.

### 2. Live Meeting Copilot

A Google Meet companion that captures tab audio, transcribes it in real time, and surfaces coaching cues both in the sidebar and as an in-Meet overlay.

- **Tab audio capture** — uses the Chrome Offscreen API to record the active tab. Audio is processed by an `AudioWorklet` (`audio-processor.js`) and streamed to Deepgram via WebSocket.
- **Real-time STT** — Deepgram Nova-2 streaming model. Mock STT module available for UI dev without an API key.
- **Live agents** running on the rolling transcript:
  - **Sentiment Agent** — reads the prospect's tone every N seconds (positive / neutral / negative + intensity).
  - **Agenda Agent** — tracks topics covered vs. the planned agenda; warns "you're 12 minutes in and haven't done discovery."
  - **Coach Agent** — surfaces the next-best-sentence and objection handles when the prospect pushes back.
  - **Council Validator** — fact-checks any number the rep is about to say.
- **In-Meet transponder** — a non-intrusive overlay on `meet.google.com` that shows the company name chip, sentiment, and the current coaching cue. Designed not to steal focus during a live call.
- **Post-call summary** — once the call ends, a structured summary is generated: agenda coverage, sentiment timeline, key objections raised, action items, sourced quotes.
- **CRM push** — one click to write the summary as a note in Zoho CRM under the prospect's record. Backed by RBAC-gated server-side OAuth (see [Security model](#security-model)).
- **Calendar sync** — Google Calendar integration pre-populates upcoming meetings so the copilot is primed when the call starts.

### 3. Objection Handling Council

A separate council pipeline focused on the "the prospect just said X, what do I say?" loop.

- Rep right-clicks any text on a page → context menu **"Project Wingman: Handle objection"**.
- Council of three agents responds:
  - **Counter Agent** — produces the direct rebuttal grounded in your KB.
  - **Reframe Agent** — restates the objection in a way that pivots toward your differentiators.
  - **Evidence Agent** — pulls 1-2 citation-ready case studies or numbers from the KB.
- Output is a ranked, structured response set — copy the one that fits.

### 4. Email Council

For follow-ups and cold outreach.

- Three modes: **Cold intro** (pattern-match to a specific outcome), **Follow-up** (references the last touchpoint), **Re-engage** (reactivates cold leads).
- Council of agents:
  - **Email Drafting Agent** — produces concise, grounded copy. Every numeric claim cites a `source_id`. No hype words.
  - **Brand Compliance Agent** — scores the email against your brand voice. Banned word detection.
  - **Tone Calibration Agent** — adjusts for the recipient's ICP profile.
- Output is strict JSON; the sidebar renders it as a copyable email.

### 5. Knowledge Base & RAG

Your sales team's source of truth, indexed and searchable.

- **In-browser KB** — designers and PMMs upload case studies, battle cards, pricing PDFs, brand guides directly into the extension. Stored in `chrome.storage.local`, chunked, embedded with Gemini, and indexed in an in-browser vector store (HNSW).
- **Backend KB** — for larger orgs, the FastAPI backend uses Pinecone (index name configurable via `PINECONE_INDEX`).
- **Embedding cost guardrails** — embedding generation is gated and de-duplicated; the recent "embeddings money-leak fix" added per-tenant rate limiting.
- **Usage Meter** — sidebar shows current KB size with a 10 MB soft limit warning.

### 6. ICP Profiles

| Profile | Tone | Content emphasis | Banned moves |
|---|---|---|---|
| **CFO** | Numbers-first, hedged | Payback period, ROI breakdown, hidden costs | Big "transformation" promises |
| **CTO** | Technical depth | Architecture, security posture, integration surface, scaling characteristics | Marketing-speak, generic benefits |
| **VP Sales** | Outcome-focused | Win rates, ACV uplift, competitive displacement, case studies | Implementation detail dumps |
| **RevOps** | Process-focused | Workflow automation, attribution, integration hygiene | Pure technical depth |
| **General** | Balanced | High-level value props, social proof | Persona-specific assumptions |

### 7. Multi-Provider LLM Layer

The extension never holds an LLM key. All provider calls go through the FastAPI backend's `/api/v1/llm/*` routes.

- **Anthropic** — Claude Sonnet / Opus / Haiku. Default for council validation.
- **Gemini** — generous free tier on Flash; default for embeddings.
- **Groq** — Llama 3.3 70B for ultra-fast, low-cost inference.
- **OpenRouter** — gateway to any model (Llama, DeepSeek, GPT, Claude, Gemini); attribution via `OPENROUTER_REFERER` and `OPENROUTER_TITLE`.
- **Custom** — any OpenAI-compatible endpoint (Ollama, vLLM, your own deployment).

The `ModelPicker` in the sidebar lets each user pick their preferred provider/model. The `model-catalog.ts` surface drives the dropdown.

### 8. Roles & RBAC

Backed by Supabase RLS and a `rbac/roles.py` permission matrix on the backend.

| Role | Capabilities |
|---|---|
| **Designer** | Upload/update Design System tokens, manage templates |
| **PMM** | Update Brand Voice, manage messaging framework, banned word list |
| **Sales Rep** | Generate pitches, use meeting copilot, access KB, push to CRM |
| **Admin** | Everything above + user management + KB wipe + RBAC editing |

Critical operations are permission-gated:
- `crm:connect` — minting Zoho OAuth tokens with full CRM scope. Restricted to `ADMIN`, `SALES_REP`. A viewer-role JWT cannot exchange the server's client_secret for an access_token.

### 9. Settings & Onboarding

- **Onboarding Checklist** — five-step flow for new reps: pick provider, add KB content, set up CRM, configure team domain, run a test pitch.
- **Admin Gate** — settings panel is protected by an SHA-256-hashed passcode stored in `localStorage`. Set once from the Admin tab, then required for sensitive ops (KB wipe, role changes, integration disconnects).
- **Integrations panel** — per-card config for Zoho CRM, Google Meet, Zoom (Meet/Zoom captured for parity; primary integration is Google Meet today).
- **Mock mode** — `VITE_MOCK_MODE=true` short-circuits all LLM calls to canned responses for offline UI development.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHROME EXTENSION (MV3)                          │
│                                                                         │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────────────┐   │
│  │   Sidebar    │   │ Background SW  │   │   Content Scripts        │   │
│  │  (React TS)  │◀──┤  Orchestrator  ├──▶│ ┌──────────────────────┐ │   │
│  │  + Zustand   │   │ Calendar poll  │   │ │  meet-transponder    │ │   │
│  └──────┬───────┘   └────────┬───────┘   │ │  page context        │ │   │
│         │                    │           │ └──────────────────────┘ │   │
│         │   ┌────────────────▼─────────┐ └──────────────────────────┘   │
│         │   │  Offscreen Document      │                                │
│         │   │  (tab audio → Deepgram)  │                                │
│         │   └──────────────────────────┘                                │
│         │                                                               │
│         │            shared Zustand store                               │
│         │   (session, transcript, suggestions, sentiment history,       │
│         │    agenda, KB index, generated assets)                        │
└─────────┼───────────────────────────────────────────────────────────────┘
          │ HTTPS  (JWT-authenticated)
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI + Python 3.11)                   │
│                                                                         │
│  /api/v1/llm/*       → LLM proxy (Anthropic / Gemini / Groq / OpenRouter│
│  /api/v1/generate    → Multi-agent pitch generation pipeline            │
│  /api/v1/stt/*       → STT key handoff for Deepgram                     │
│  /api/v1/zoho/*      → Zoho OAuth exchange + refresh (RBAC-gated)       │
│  /api/v1/assets/*    → KB upload / vector indexing                      │
│  /api/v1/admin/*     → User management, role editing, KB wipe           │
│  /api/v1/auth/*      → Supabase JWT verification                        │
│                                                                         │
│  ┌────────────────────────────────────────────────────────┐             │
│  │              MULTI-AGENT ORCHESTRATOR                  │             │
│  │  Retrieval → ICP Personalization → Brand → Validation  │             │
│  └────────────────────────────────────────────────────────┘             │
└─────────────┬───────────────┬───────────────┬───────────────────────────┘
              ▼               ▼               ▼
       ┌──────────────┐  ┌──────────┐  ┌──────────────┐
       │   Pinecone   │  │ Supabase │  │   LLM        │
       │  Vector DB   │  │ Postgres │  │  Providers   │
       │  (KB index)  │  │  + Auth  │  │  (any)       │
       └──────────────┘  └──────────┘  └──────────────┘
```

---

## Project structure

```
project-wingman-sales-copilot/
├── extension/                          # Chrome Extension (React + TS + Vite)
│   ├── manifest.json                   # MV3 manifest
│   ├── vite.config.ts                  # Build + dev-only localhost injection
│   ├── tailwind.config.js              # Design tokens + brand colors
│   ├── .env.example                    # Template for VITE_* env vars
│   ├── src/
│   │   ├── background/                 # Service worker + orchestrator
│   │   ├── content/                    # Content scripts
│   │   │   ├── content-script.ts       # Generated-content insertion
│   │   │   └── meet-transponder.ts     # In-Meet overlay
│   │   ├── offscreen/                  # Offscreen doc for tab audio
│   │   │   └── audio-processor.js      # AudioWorklet
│   │   ├── popup/                      # Extension popup (minimal)
│   │   ├── sidebar/                    # Main UI
│   │   │   ├── components/             # All UI panels
│   │   │   ├── hooks/                  # useObjection, usePageContext, …
│   │   │   └── stores/                 # Zustand stores
│   │   ├── meeting-copilot/            # Live meeting feature
│   │   │   ├── agents/                 # live-orchestrator, post-call-summary
│   │   │   ├── stt/                    # Deepgram + mock
│   │   │   └── integrations/           # Google Calendar, Zoho CRM
│   │   └── shared/
│   │       ├── agents/                 # council, email-council, objection-council
│   │       ├── auth/                   # Google SSO + team config
│   │       ├── constants/              # ICP profiles
│   │       └── utils/                  # storage, KB indexer, vector store, …
│   └── icons/
│
├── backend/                            # FastAPI backend (Python 3.11)
│   ├── main.py                         # App entry + route mounting
│   ├── config.py                       # Env loading via pydantic-settings
│   ├── models.py                       # Pydantic request/response models
│   ├── requirements.txt
│   ├── agents/                         # Multi-agent pipeline
│   │   ├── orchestrator.py
│   │   ├── retrieval_agent.py
│   │   ├── icp_personalization_agent.py
│   │   ├── brand_compliance_agent.py
│   │   └── validation_agent.py
│   ├── rag/                            # Pinecone client + embedding helpers
│   ├── rbac/                           # roles.py — permission matrix
│   ├── api/
│   │   ├── routes/                     # generate, llm, stt, zoho, assets, admin, auth
│   │   └── middleware/                 # JWT auth middleware
│   ├── db/
│   │   ├── supabase_client.py
│   │   └── migrations/                 # 001_initial, 002_llm_usage
│   └── scripts/                        # test_openrouter, run_tests.sh
│
├── scripts/
│   ├── setup_env.sh                    # Interactive .env generator
│   └── lint-manifest.sh                # Pre-release manifest placeholder lint
│
└── README.md
```

---

## Quick start

### Prerequisites

- Node.js 20+ and npm 10+
- Python 3.11+
- A Supabase project (free tier is fine)
- API keys for at least one LLM provider (Gemini Flash has a generous free tier)
- Optional: Pinecone, Deepgram, Google OAuth Client ID, Zoho OAuth app

### 1. Clone & install

```bash
git clone https://github.com/avinashgaurav/project-wingman-sales-copilot.git
cd project-wingman-sales-copilot

# Extension
cd extension && npm install && cd ..

# Backend
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd ..
```

### 2. Generate `.env` files

```bash
bash scripts/setup_env.sh
```

This interactive script prompts for each value, hides secrets (no echo), and writes `backend/.env` and `extension/.env`. Press Enter to accept any defaults you don't want to override.

### 3. Run the backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Backend will be at `http://localhost:8000`. Health check: `curl http://localhost:8000/healthz`.

### 4. Build & load the extension

```bash
cd extension
npm run dev   # vite build --watch --mode development; injects localhost host_permissions
```

Then in Chrome:
1. Visit `chrome://extensions/`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**
4. Select `extension/dist/`

The Project Wingman sidebar will appear when you click the extension icon. Sign in with a Google account on your configured workspace domain.

### 5. Verify

```bash
# Lint manifest for placeholder strings before any release
bash scripts/lint-manifest.sh

# Build a production bundle
cd extension && npm run build
```

---

## Configuration

### `extension/.env` (Vite — public, baked into bundle)

| Variable | Purpose | Required |
|---|---|---|
| `VITE_BACKEND_URL` | FastAPI backend base URL | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable (anon) key | Yes |
| `VITE_ALLOWED_DOMAIN` | Google Workspace domain that may sign in | Yes |
| `VITE_LLM_PROVIDER` | Default provider (`gemini` / `groq` / `anthropic` / `openrouter` / `custom`) | Yes |
| `VITE_MOCK_MODE` | `true` to short-circuit LLM calls for UI dev | No |
| `VITE_GEMINI_MODEL` | Override default Gemini model | No |
| `VITE_OPENROUTER_MODEL` | Override default OpenRouter model | No |

### `backend/.env` (server-side — never bundled)

| Variable | Purpose | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key | Yes |
| `JWT_SECRET` | Secret for JWT signing/verification | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude key | If used |
| `GEMINI_API_KEY` | Google Gemini key | If used |
| `GROQ_API_KEY` | Groq key | If used |
| `OPENROUTER_API_KEY` | OpenRouter key | If used |
| `OPENROUTER_REFERER` | URL shown on openrouter.ai/activity | Optional |
| `OPENROUTER_TITLE` | App attribution title | Optional |
| `PINECONE_API_KEY` | Pinecone key | If using Pinecone |
| `PINECONE_INDEX` | Index name (defaults to `clientlens`) | If using Pinecone |
| `DEEPGRAM_API_KEY` | Deepgram STT key | If using live mode |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | If using Calendar |
| `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` | Zoho OAuth | If using CRM push |
| `BACKEND_URL` | Self URL (used in OAuth callbacks) | Yes |
| `ALLOWED_ORIGINS` | CORS allowlist (extension + dev origins) | Yes |
| `DAILY_USER_TOKEN_BUDGET` | Per-user daily LLM token cap (default `1000000`) | Optional |
| `MAX_EMBED_TEXT_BYTES` | Per-text byte cap on `/embed` inputs (default `51200`) | Optional |
| `ASSETS_MAX_UPLOAD_BYTES` | Per-upload byte cap on `/assets/upload` (default `26214400` = 25 MB) | Optional |

### Tuning the LLM token budget

`DAILY_USER_TOKEN_BUDGET` (default 1M tokens / user / UTC day) is a soft ceiling enforced before each `/complete`, `/stream`, and `/embed` call. The check reads cumulative usage from the `llm_usage` table and returns `429 Retry-After: 3600` if the call would exceed the cap.

When to raise it:

- **Heavy KB indexers.** A single max-batch `/embed` call (100 texts × 50 KB each, the per-text cap) projects ~1.25M tokens. If you re-index a large KB regularly, set the budget to **5M+ tokens per user** or split indexing across days.
- **Long pitch decks.** A four-agent council pass can run 8K–20K tokens per pitch. 1M tokens fits ~50–125 pitches per day per rep. If your reps generate more than that, raise the budget.

When to lower it:

- **Untrusted users / multi-tenant.** Drop to **100K–250K** to keep costs bounded if a viewer-role user finds a way to call the proxy.

The check is **fail-open**: if the Supabase query for today's usage errors, calls go through (logged as `token_budget.query_failed`). A Supabase outage shouldn't wedge your reps mid-call.

### First-time tabCapture permission grant

`tabCapture` is declared under `optional_permissions` in `manifest.json`, so the scary "Record content of your screen" warning does not appear at install time. Chrome prompts for it the first time the rep clicks **Start Live Mode**.

**Edge case:** Live Mode can also auto-start when joining a Meet call if the rep has previously enabled "Don't ask again". On a brand-new install, that auto-start fires before the user has clicked anything — Chrome will not grant the permission without a user-gesture. The auto-start will silently bail; the next manual click on **Start Live Mode** prompts and grants normally. Once granted, all future auto-starts work.

If you want auto-start to "just work" from install, have new reps click the Live Mode toggle once after install to grant the permission proactively.

---

## Development guide

### Mock mode

Set `VITE_MOCK_MODE=true` to develop the UI without burning LLM credits. All agent calls return canned responses; the meeting copilot uses `mock-stt.ts` instead of streaming to Deepgram.

Note: in this codebase mock mode still routes through the FastAPI backend's `/api/v1/llm/complete` endpoint (the backend has its own mock branch). Pure offline UI dev with no backend running is not yet supported.

### Type checking

```bash
cd extension && npm run type-check    # tsc --noEmit
```

### Linting

```bash
cd extension && npm run lint           # ESLint v9 over src/**/*.{ts,tsx}
bash scripts/lint-manifest.sh          # Manifest placeholder + permission lint
```

### Testing

Backend test scripts live in `backend/scripts/`:

```bash
bash backend/scripts/run_tests.sh           # All tests
python3 backend/scripts/test_openrouter.py  # OpenRouter integration sanity check
```

### Building for release

```bash
cd extension && npm run build               # vite build --mode production
bash scripts/lint-manifest.sh               # Fails if YOUR_*, your-backend.railway.app, or <all_urls> remain
```

The lint script blocks shipping placeholder strings or `<all_urls>` permissions to the Chrome Web Store.

---

## Security model

The product handles OAuth tokens, transcripts, and an org-wide KB — security posture matters.

- **No LLM keys in the browser.** All provider keys live in `backend/.env`. The extension calls `/api/v1/llm/*`; the backend proxies. Switching providers is a backend config change, not an extension release.
- **Manifest scoped** — `host_permissions` and `content_scripts` are narrowly scoped to `docs.google.com`, `notion.so`, and `meet.google.com`. No `<all_urls>` in the shipped manifest. The `lint-manifest.sh` script enforces this.
- **Dev-only localhost** — `http://localhost:8000` and `http://localhost:11434` host_permissions are **injected only when `vite build --mode development`** runs. A production build never grants page access to localhost.
- **FETCH_URL_TEXT hardened** — the background service worker's URL-fetch message handler rejects content-script senders and external extensions, blocking SSRF chains where a visited page could drive the extension to fetch arbitrary URLs (including private localhost) and read back the response.
- **CRM RBAC** — Zoho `/exchange` and `/refresh` endpoints require the `crm:connect` permission (`ADMIN`, `SALES_REP` only). A viewer-role JWT cannot mint a Zoho access token using the server's `client_secret`.
- **Data centre allowlist** — Zoho upstream URL is constructed from a vetted set (`{com, eu, in, com.cn, com.au, jp}`), preventing a caller from steering token exchange to `accounts.zoho.<attacker>`.
- **Workspace gating** — only emails ending in `@${VITE_ALLOWED_DOMAIN}` can sign in. Configurable per deployment.
- **Admin passcode** — Settings panel is gated by an SHA-256-hashed passcode. Sensitive ops (KB wipe, role edit, integration disconnect) require it.
- **Audio handling** — tab audio is streamed to Deepgram via WebSocket and never persisted server-side beyond the live transcript buffer.

---

## Tech stack

| Layer | Technology |
|---|---|
| Extension UI | React 18, TypeScript 5, Tailwind CSS 3, Zustand |
| Extension runtime | Chrome Manifest V3, Service Worker, Offscreen API, AudioWorklet |
| Build | Vite 5 |
| Backend framework | FastAPI, Pydantic v2 (Python 3.11) |
| LLM providers | Anthropic Claude, Google Gemini, Groq (Llama 3.3 70B), OpenRouter (any model), any OpenAI-compatible endpoint |
| Embeddings | Gemini `text-embedding-004` |
| RAG / Vector store | Pinecone (server-side) or in-browser HNSW vector store (client-side) |
| Database | Supabase Postgres + Row-Level Security |
| Auth | Supabase JWT, Google OAuth, Zoho OAuth |
| Speech-to-Text | Deepgram Nova-2 (real-time streaming) |
| Document generation | Google Slides API, Google Drive API |
| Observability | structlog (backend) |
| Deployment | Railway / Render / Fly.io (backend), Chrome Web Store or unpacked load (extension) |

---

## Roadmap

- **Email council UI surface** — backend agents + `useEmailCouncil` hook are already implemented; the sidebar tab + draft viewer + copy-to-clipboard flow are not yet wired
- Salesforce + HubSpot CRM connectors (parity with Zoho)
- Microsoft Teams meeting copilot
- On-device STT option (Whisper / faster-whisper) for privacy-sensitive deployments
- Multi-tenant SaaS mode with org-level KB isolation
- Slack integration for post-call summary delivery
- Browser-side fine-tuning of the council validator on each org's historical wins/losses

---

## Contributing

PRs welcome. Before opening one:

1. Run `npm run type-check` and `npm run lint` in `extension/`
2. Run `bash scripts/lint-manifest.sh` to ensure no placeholder strings
3. Run `cd extension && npm run build` to confirm the production bundle builds clean

Bug reports and feature requests via GitHub Issues.
