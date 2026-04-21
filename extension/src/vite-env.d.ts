/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_MODE?: string;
  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_LLM_PROVIDER?: "anthropic" | "groq" | "ollama" | "gemini";
  readonly VITE_OLLAMA_MODEL?: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
