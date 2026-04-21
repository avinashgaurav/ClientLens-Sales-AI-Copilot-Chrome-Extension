# ClientLens – Sales Copilot

> Built for ZopNight's sales team.

A production-grade Chrome Extension for internal sales teams to generate, personalize, and update client-facing presentations and documents in real-time — powered by RAG, multi-agent validation, ICP profiling, and role-based Design System enforcement.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Sidebar UI  │  │Content Script│  │  Background Worker    │ │
│  │  (React/TS)  │  │(Page Context)│  │  (API Orchestration)  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼──────────────┘
          │                │                      │
          └────────────────┼──────────────────────┘
                           │ HTTPS / WebSocket
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MULTI-AGENT ORCHESTRATOR                   │   │
│  │                                                         │   │
│  │  ┌───────────────┐  ┌────────────────┐                 │   │
│  │  │  Agent 1      │  │   Agent 2      │                 │   │
│  │  │  RAG/Retrieval│→ │Brand Compliance│                 │   │
│  │  │  Agent        │  │Agent           │                 │   │
│  │  └───────┬───────┘  └───────┬────────┘                │   │
│  │          │                  │                          │   │
│  │  ┌───────▼───────┐  ┌───────▼────────┐                │   │
│  │  │  Agent 3      │→ │   Agent 4      │                │   │
│  │  │  ICP          │  │  Validation &  │                │   │
│  │  │  Personalize  │  │  Fact-Check    │                │   │
│  │  └───────────────┘  └───────┬────────┘                │   │
│  └───────────────────────────── ┼───────────────────────┘   │
│                                 │                             │
│  ┌──────────────┐  ┌────────────▼──────┐  ┌──────────────┐  │
│  │  RAG Pipeline│  │  Document Generator│  │  RBAC Engine │  │
│  │  (Pinecone + │  │  (Slides/PDF)      │  │  (Supabase)  │  │
│  │   LangChain) │  └───────────────────┘  └──────────────┘  │
│  └──────────────┘                                             │
└────────────────────────────────────────────────────────────────┘
          │                    │                    │
   ┌──────▼──────┐    ┌────────▼────────┐  ┌──────▼──────┐
   │  Pinecone   │    │  Google Slides  │  │  Supabase   │
   │  Vector DB  │    │  / Drive API    │  │  (DB + Auth)│
   └─────────────┘    └─────────────────┘  └─────────────┘
```

---

## Roles & RBAC

| Role | Permissions |
|------|-------------|
| **Designer** | Upload/update Design System, manage templates, manage layouts |
| **PMM** (Product Marketing Manager) | Update Brand Voice & Tone, manage messaging framework |
| **Sales Rep** | Generate docs, use extension, access all content |
| **Admin** | Full access to all resources |
| **Viewer** | Read-only access to generated content |

---

## Key Features

### 1. Meeting Prep Mode
- Enter company name → extension auto-detects context from LinkedIn/website tab
- Select ICP role (CFO, CTO, VP Sales, etc.)
- Choose output type (Slides, PDF, Doc)
- Multi-agent pipeline generates personalized content

### 2. Live Meeting Mode
- Real-time doc updates during meeting
- Quick action buttons: "Make CFO-friendly", "Add ROI slide", "Simplify", "Add technical depth"
- Insert into active Google Slides/Docs tab

### 3. ICP Profiling
- Pre-defined ICP profiles with persona-specific content rules
- CFO → metrics-first, numbers, ROI blocks
- CTO → architecture diagrams, integration depth, security
- VP Sales → competitive differentiation, case studies, social proof

### 4. RAG + Multi-Agent Validation
- **Agent 1 (Retrieval)**: Pulls relevant content from internal docs, repos, case studies
- **Agent 2 (Brand Compliance)**: Checks against Design System + Brand Voice
- **Agent 3 (ICP Personalization)**: Adapts tone and content for ICP profile
- **Agent 4 (Validation)**: Cross-checks agents 1–3, removes hallucinations, approves final output

### 5. Design System Enforcement
- Designer uploads DS (components, colors, typography, layouts)
- All generated content MUST use only approved components
- DS violations are blocked before output

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension UI | React 18, TypeScript, Tailwind CSS |
| Extension Runtime | Chrome Manifest V3, Service Worker |
| Backend Framework | FastAPI (Python 3.11) |
| AI / Agents | Claude claude-sonnet-4-6 (Anthropic SDK), LangChain |
| RAG / Vector Store | Pinecone + OpenAI/Voyage embeddings |
| Database + Auth | Supabase (Postgres + Row Level Security) |
| Document Generation | Google Slides API, Puppeteer (PDF) |
| File Storage | Supabase Storage (DS assets, brand files) |
| Deployment | Railway / Render (backend), Chrome Web Store (extension) |

---

## Project Structure

```
├── extension/              # Chrome Extension (React + TypeScript)
│   ├── manifest.json
│   ├── src/
│   │   ├── background/     # Service worker
│   │   ├── content/        # Page context capture
│   │   ├── sidebar/        # Main extension UI
│   │   └── popup/          # Extension popup
│   └── package.json
│
├── backend/                # FastAPI Backend
│   ├── agents/             # Multi-agent system
│   ├── rag/                # RAG pipeline
│   ├── rbac/               # Role-based access control
│   ├── document_gen/       # Slides + PDF generation
│   ├── api/                # Routes + middleware
│   └── db/                 # Database models + migrations
│
└── docs/                   # Architecture, API docs, runbooks
```

---

## Getting Started

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload
```

### Extension
```bash
cd extension
npm install
cp .env.example .env.local   # fill in your keys
npm run dev          # watch mode
npm run build        # production build
```
Load the `extension/dist` folder in Chrome via `chrome://extensions` → "Load unpacked".

---

## Environment Variables

```env
# Anthropic
ANTHROPIC_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=

# Google APIs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
BACKEND_URL=https://your-backend.railway.app
ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
```

---

## Local Development Notes

A few things to configure locally that are intentionally **not** committed to the repo:

### 1. API keys

The `extension/.env.local` file ships with placeholder values (e.g. `YOUR_GEMINI_API_KEY_HERE`). Paste your own keys in before running:

```env
VITE_GEMINI_API_KEY=your-real-gemini-key
VITE_GROQ_API_KEY=your-real-groq-key
VITE_ANTHROPIC_API_KEY=your-real-anthropic-key
```

Free tiers work fine:
- **Gemini** (generous free tier): https://aistudio.google.com/apikey
- **Groq** (free, very fast Llama): https://console.groq.com/keys
- **Anthropic** (paid, best quality): https://console.anthropic.com

`.env.local` is gitignored — your keys stay on your machine.

### 2. Workspace gating

By default the extension allows any Google account ending in `@example.com` — effectively disabling the gate for local dev. To restrict sign-in to your company's Google Workspace, edit:

```
extension/src/shared/auth/team-config.ts
```

and change:
```ts
export const ALLOWED_EMAIL_DOMAIN = "example.com";
```
to your domain (e.g. `"yourcompany.com"`). **Change this locally only — do not commit the change** if you're working off a fork of the public repo, so the default stays generic for other users.

You can also add admin/designer/PMM roles in the same file via the `ROLE_OVERRIDES` map.

### 3. OAuth client ID

`extension/manifest.json` has `"client_id": "YOUR_GOOGLE_CLIENT_ID"`. To enable real Google sign-in, create an OAuth 2.0 Client ID in Google Cloud Console (Application type: **Chrome Extension**) and replace the placeholder. Keep this out of public commits.
