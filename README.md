# ClientLens – Sales Copilot

> Built for ZopNight's sales team.

A Chrome Extension that turns a sales rep's browser into a live meeting copilot. Runs a multi-agent LLM pipeline (sentiment, agenda, coach, council validator) against a real-time transcript of a Google Meet call and surfaces next-best-sentence suggestions, objection handles, and agenda pacing in an on-screen transponder — all without shipping transcripts to a central server.

Full-stack is scaffolded for RAG + document generation, but the shipped MVP runs entirely client-side. The extension talks directly to the user's chosen LLM provider (Gemini / Anthropic / Groq / any OpenAI-compatible endpoint) using keys that live only on the user's machine.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       CHROME EXTENSION (MV3)                         │
│                                                                      │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐    │
│  │  Sidebar UI    │  │  Background SW   │  │  Content Scripts   │    │
│  │  (React + TS)  │◀▶│  (Orchestrator,  │◀▶│  - meet-transponder│    │
│  │  + Zustand     │  │   calendar poll) │  │  - page context    │    │
│  └────────┬───────┘  └────────┬─────────┘  └─────────┬──────────┘    │
│           │                   │                      │               │
│           │   ┌───────────────▼────────────────┐     │               │
│           │   │   Offscreen Document           │     │               │
│           │   │   (tab audio → Deepgram STT)   │     │               │
│           │   └────────────────────────────────┘     │               │
│           │                                          │               │
│           │            shared Zustand store          │               │
│           │    (session, transcript, suggestions,    │               │
│           │     sentiment history, agenda, coach     │               │
│           │     rejections, integrations, settings)  │               │
│           │                                          │               │
└───────────┼──────────────────────────────────────────┼───────────────┘
            │                                          │
            │ HTTPS direct (no backend hop)            │
            ▼                                          │
    ┌───────────────────────────┐                      │
    │  LLM Providers            │                      │
    │  - Gemini (free tier)     │                      │
    │  - Groq (free, fast)      │                      │
    │  - Anthropic Claude       │                      │
    │  - OpenAI-compatible      │                      │
    │    (OpenRouter, local,…)  │                      │
    └───────────────────────────┘                      │
                                                       │
                     ┌─────────────────────────────────┘
                     ▼
            ┌───────────────────────┐
            │  Google APIs          │
            │  - Calendar (upcoming │
            │    meetings)          │
            │  - OAuth (sign-in)    │
            └───────────────────────┘
```

### Live meeting loop (what the transponder is doing while you talk)

```
 ┌──────────────┐       ┌───────────────┐       ┌────────────────┐
 │ Tab audio    │──────▶│ Deepgram STT  │──────▶│ Final segments │
 │ (offscreen)  │       │ (streaming)   │       │ land in store  │
 └──────────────┘       └───────────────┘       └───────┬────────┘
                                                        │
                            Zustand subscribe fires     │
                         on each new final segment      │
                                                        ▼
   ┌─────────────┐       ┌───────────────┐      ┌──────────────────┐
   │ Sentiment   │   ◀── │ Debounced     │ ──▶  │ Coach agent      │
   │ agent 20s   │       │ live trigger  │      │ (Haiku 4.5)      │
   └──────┬──────┘       └───────┬───────┘      └────────┬─────────┘
          │                      │                       │
          │               ┌──────▼──────┐         suggestions
          │               │ Agenda 30s  │                │
          │               └─────────────┘                ▼
          │                                     ┌──────────────────┐
          ▼                                     │ Council validator│
   sentimentTrend                               │ (Opus 4.7)       │
   (High ↘ Med)                                 │ approve / revise │
                                                │ / reject         │
                                                └────────┬─────────┘
                                                         │
            mirrored via chrome.tabs.sendMessage         │
            to the Meet-tab transponder for render ◀─────┘
```

Key properties of the loop:

- **In-flight + pending re-trigger pattern** — Opus has 5–9s round trips; naive gating would drop every segment spoken during an in-flight call. Coach and sentiment set a `*Pending` flag when the trigger fires mid-flight and re-fire immediately on completion.
- **Validator cache** — 30s TTL, 200-entry cap, keyed on `suggestion.title + body + kind`. Repeated suggestions skip the council entirely.
- **Error streak counter** — after 3 consecutive failures per agent, a single banner surfaces instead of spamming. Resets on first success.
- **No polling** — the 250 ms transcript poll from earlier builds was replaced with `useMeetingCopilotStore.subscribe()`; the trigger fires on every new final segment, not on a wall-clock loop.

---

## Key Features

### 1. Live meeting copilot (Google Meet)
- On-screen **transponder** panel that attaches to a Google Meet tab. Shows current coach suggestion, sentiment trend, agenda pacing, confidence chip, and a "thinking…" indicator.
- **Council rejections are surfaced** (not silently dropped) as a faint pill so the rep sees *why* a suggestion was blocked.
- **Session auto-start** via calendar polling — when a meeting you own starts, the transponder opens with title + attendees pre-filled.
- All derived signals are pure helpers (`computeSentimentTrend`, `computeAgendaPacing`, `rejectionFromOutcome`) so the sidebar-side and background-side orchestrators share logic without duplication.

### 2. Trust signals on every suggestion
- **Rationale** — one-line "Why:" row explaining the suggestion in the rep's own frame (e.g. "Buyer raised procurement concern — this pivots to finance ROI").
- **Confidence score** (0–1) — rendered as a chip + border color (high / medium / low bands).
- **Malformed JSON salvage** — if the coach LLM returns broken JSON, the first sentence of the raw body becomes a single `say_next` suggestion instead of dropping the turn. Raw head is logged for debugging.

### 3. Provider flexibility
- **Gemini** (free tier, 1,500 req/day) — default.
- **Groq** (free, very fast Llama 3.3 70B).
- **Anthropic Claude** (paid, highest quality).
- **Any OpenAI-compatible endpoint** via the Custom provider — ships with an OpenRouter preset (URL + model pre-filled, user pastes their own key). Works with Together, Fireworks, Mistral, DeepSeek, local Ollama, or a self-hosted proxy.

### 4. Admin gate (RBAC, client-side)
- **Passcode gate** on the Settings panel. SHA-256 of the passcode is stored in localStorage; a sessionStorage flag unlocks for the current session. "Lock admin & close" clears the flag.
- Not cryptographic access control — it's a "casual user on a shared laptop can't change provider keys" gate.
- First-open flow: if no passcode is set, the gate offers a set-passcode dialog before revealing Settings.

### 5. Session history + 24h PII retention
- Meeting summaries (company, persona, headline, summary markdown) are saved to localStorage with a 20-session cap.
- **Automatic 24-hour pruning** on every history read — transcripts and per-call summaries contain prospect names, pricing discussions, and verbatim quotes, so the extension never hoards call data indefinitely. Reps who need longer retention push to their CRM via the Integrations flow.
- **Danger Zone** in Settings: one-click wipe of session history, calendar cache, transponder layout, and auto-start flag. API keys and integration credentials are preserved.

### 6. Integrations (manual, user-paste credentials)
Four integration cards in Settings:
- **Zoho CRM** — API domain, client ID/secret, refresh token
- **Google Meet** — OAuth client ID/secret, refresh token
- **Zoom** — account ID, client ID/secret
- **Custom tool** — pull/push endpoints + API key for any other CRM or internal service

Each card has a **Test** button that validates credentials before marking "connected." The extension never runs an OAuth flow itself — the user pastes tokens they obtained from the third-party console.

### 7. Pitch generation (non-live path)
- Company name + ICP role (CFO / CTO / VP Sales / etc.) + output type → multi-agent pipeline generates a personalized deck / one-pager / analysis.
- Streaming generation with a live preview; copy-to-clipboard + export to Google Slides/Docs.
- Onboarding checklist tracks: provider key set, first pitch generated, transponder used, integration connected.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension runtime | Chrome Manifest V3 (side panel, service worker, content scripts, offscreen doc) |
| Extension UI | React 18, TypeScript, Vite, Zustand, Tailwind CSS, lucide-react |
| Transcription | Deepgram streaming STT (tab audio captured in offscreen document) |
| LLM clients | Anthropic SDK, `@google/genai`, OpenAI-compatible fetch (Groq / OpenRouter / custom) |
| Auth | Google OAuth (chrome.identity) — optional workspace domain lock |
| Backend (scaffolded) | FastAPI (Python 3.11), LangChain, Pinecone, Supabase |
| Document generation (planned) | Google Slides API, Puppeteer (PDF) |

The MVP runs entirely client-side. The backend folder is **scaffolded** for the future RAG + document-generation path but is not required to run or develop the extension.

---

## Project Structure

```
├── extension/                   # Chrome Extension (all v2 runtime lives here)
│   ├── manifest.json            # MV3 manifest: side panel, offscreen, content scripts
│   ├── sidebar.html             # Side panel entry point
│   ├── popup.html               # Toolbar popup
│   ├── offscreen.html           # Hidden document for tab audio capture
│   ├── src/
│   │   ├── background/          # Service worker + bg-orchestrator (calendar poll, live agents when sidebar closed)
│   │   ├── content/             # meet-transponder (vanilla TS, no React — runs inside the Meet tab)
│   │   ├── offscreen/           # Deepgram STT client
│   │   ├── popup/               # Toolbar popup UI
│   │   ├── sidebar/             # Main UI (React)
│   │   │   ├── components/      # AdminGate, AuthGate, SettingsPanel, MeetingCopilotPanel, …
│   │   │   ├── stores/          # Zustand: app-store, meeting-copilot-store
│   │   │   └── hooks/           # useGeneration, etc.
│   │   ├── meeting-copilot/     # Live agents, council validator, live helpers
│   │   └── shared/              # llm-client, settings-storage, integrations, auth, types
│   └── scripts/
│
├── backend/                     # FastAPI scaffold (not required for MVP)
│   ├── agents/                  # Retrieval / brand-compliance / ICP / validation agents
│   ├── rag/                     # Pinecone + LangChain pipeline
│   ├── rbac/                    # Role + permission engine
│   ├── document_gen/            # Google Slides + PDF generation
│   ├── api/                     # FastAPI routes + middleware
│   ├── db/                      # Supabase models + migrations
│   └── requirements.txt
│
└── docs/                        # Architecture, API docs, runbooks
```

---

## Getting Started

### Extension (this is the MVP — all you need to run ClientLens)

```bash
cd extension
npm install
cp .env.example .env.local       # fill in keys if you want build-time defaults
npm run build                    # production build → extension/dist
# or: npm run dev                # watch mode
```

Load the extension in Chrome:
1. Open `chrome://extensions`
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder
5. Pin the ClientLens icon in Chrome's toolbar
6. Click it → side panel opens

On first open you'll see an onboarding checklist: pick a provider, paste a key in **Settings → Advanced · Model provider**, and you're ready to run a pitch. For the live meeting copilot, join a Google Meet call and the transponder will offer to start.

### Backend (optional, only if you're building out the RAG / document-gen path)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # fill in your keys
uvicorn main:app --reload
```

---

## Environment variables

### Extension (`extension/.env.local`)

Most settings are now stored in the extension's Settings UI (credentials live in the browser, not in env vars). The `.env.local` file only matters for *build-time defaults*:

```env
# Preview / mock mode — bypasses real LLM calls, useful for UI dev.
VITE_MOCK_MODE=true

# Default provider if the user never opens Settings.
VITE_LLM_PROVIDER=gemini

# Optional — pre-fills the provider key fields on first install.
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
VITE_GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
VITE_ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE
```

Free tiers work fine:
- **Gemini** (generous free tier): https://aistudio.google.com/apikey
- **Groq** (free, very fast Llama): https://console.groq.com/keys
- **Anthropic** (paid, best quality): https://console.anthropic.com

### Backend (`backend/.env`, only if you're running the scaffold)

```env
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=clientlens
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BACKEND_URL=https://your-backend.railway.app
ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
JWT_SECRET=change-me-in-production
```

---

## Local configuration (not committed to the repo)

### 1. Workspace sign-in gating

By default the extension allows **any** signed-in Google account. To restrict sign-in to a specific Google Workspace domain (e.g. your company), edit:

```
extension/src/shared/auth/team-config.ts
```

```ts
export const ALLOWED_EMAIL_DOMAIN = "yourcompany.com";  // "" = allow any
```

You can also add admin / designer / PMM / sales-rep overrides in the same file via the `ROLE_OVERRIDES` map.

### 2. OAuth client ID

`extension/manifest.json` has `"client_id": "YOUR_GOOGLE_CLIENT_ID"`. To enable real Google sign-in, create an OAuth 2.0 Client ID in Google Cloud Console (Application type: **Chrome Extension**) and replace the placeholder. Keep this out of public commits.

### 3. Admin passcode

Set the admin passcode once via Settings → Advanced → Admin (the gate will prompt on first open). There's no recovery flow — if forgotten, clear `clientlens_admin_hash_v1` from localStorage via Chrome DevTools.

---

## Privacy model

- **Transcripts, suggestions, and session summaries never leave the user's browser.** LLM calls go direct to the provider of the user's choice.
- Deepgram receives the tab audio stream during live calls (this is the STT path). No audio is stored by the extension.
- Session history is localStorage-only, auto-pruned after 24h. Admin-only Danger Zone wipe is available in Settings.
- Integration credentials (Zoho / Meet / Zoom / custom) are stored in localStorage + mirrored to `chrome.storage.local` for cross-surface persistence. They never leave the device unless the user explicitly triggers a push/test call.

---

## Roles & RBAC (roadmap)

The RBAC surface below is scaffolded in the backend for the future RAG + document-generation path. The v2 MVP ships with a simpler **admin passcode gate on Settings** (§ Key Features · 4).

| Role | Permissions |
|------|-------------|
| **Designer** | Upload/update Design System, manage templates, manage layouts |
| **PMM** | Update Brand Voice & Tone, manage messaging framework |
| **Sales Rep** | Generate docs, use extension, access all content |
| **Admin** | Full access to all resources |
| **Viewer** | Read-only access to generated content |

---

## Roadmap

- [ ] Wire the scaffolded backend: RAG over internal case studies, design-system enforcement, Slides/PDF export.
- [ ] Replace the admin passcode gate with full server-side RBAC once the backend is live.
- [ ] Shared `OrchestratorEngine` so the sidebar-side and background-side live orchestrators share a single implementation.
- [ ] Chrome Web Store listing.

---

## License

MIT (see `LICENSE` — add one before publishing if you haven't already).
