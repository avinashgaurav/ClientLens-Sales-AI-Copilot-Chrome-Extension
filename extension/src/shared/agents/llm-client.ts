/**
 * Provider-agnostic LLM client. Picks Anthropic or Groq based on
 * VITE_LLM_PROVIDER. Both return plain text; council parses JSON out.
 */

import Anthropic from "@anthropic-ai/sdk";

export type LLMProvider = "anthropic" | "groq" | "ollama" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const ANTHROPIC_MODEL = "claude-opus-4-7";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const OLLAMA_MODEL = "llama3.1:8b";
const OLLAMA_BASE = "http://localhost:11434";
const GEMINI_MODEL = "gemini-2.0-flash";

export function resolveLLMConfig(override?: { provider: LLMProvider; model: string }): LLMConfig | { error: string } {
  const provider = (override?.provider ?? import.meta.env.VITE_LLM_PROVIDER ?? "anthropic") as LLMProvider;
  const modelOverride = override?.model;

  if (provider === "gemini") {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? "";
    if (!apiKey || apiKey.includes("YOUR_KEY")) {
      return { error: "Set VITE_GEMINI_API_KEY in extension/.env.local" };
    }
    return { provider, apiKey, model: modelOverride ?? import.meta.env.VITE_GEMINI_MODEL ?? GEMINI_MODEL };
  }

  if (provider === "ollama") {
    return {
      provider,
      apiKey: "",
      model: modelOverride ?? import.meta.env.VITE_OLLAMA_MODEL ?? OLLAMA_MODEL,
      baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL ?? OLLAMA_BASE,
    };
  }

  if (provider === "groq") {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY ?? "";
    if (!apiKey || apiKey.includes("YOUR_KEY")) {
      return { error: "Set VITE_GROQ_API_KEY in extension/.env.local" };
    }
    return { provider, apiKey, model: modelOverride ?? GROQ_MODEL };
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? "";
  if (!apiKey || apiKey.includes("YOUR_KEY")) {
    return { error: "Set VITE_ANTHROPIC_API_KEY in extension/.env.local" };
  }
  return { provider: "anthropic", apiKey, model: modelOverride ?? ANTHROPIC_MODEL };
}

export interface LLMClient {
  call(system: string, user: string, maxTokens: number): Promise<string>;
}

class AnthropicClient implements LLMClient {
  private client: Anthropic;
  constructor(private cfg: LLMConfig) {
    this.client = new Anthropic({ apiKey: cfg.apiKey, dangerouslyAllowBrowser: true });
  }
  async call(system: string, user: string, maxTokens: number): Promise<string> {
    const res = await this.client.messages.create({
      model: this.cfg.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return res.content[0]?.type === "text" ? res.content[0].text : "";
  }
}

class GroqClient implements LLMClient {
  constructor(private cfg: LLMConfig) {}
  async call(system: string, user: string, maxTokens: number): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${system}\nRespond with a single JSON object. No prose, no markdown fences.` },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  }
}

class OllamaClient implements LLMClient {
  constructor(private cfg: LLMConfig) {}
  async call(system: string, user: string, maxTokens: number): Promise<string> {
    const base = this.cfg.baseUrl ?? OLLAMA_BASE;
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${system}\nRespond with a single JSON object. No prose, no markdown fences.` },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  }
}

class GeminiClient implements LLMClient {
  constructor(private cfg: LLMConfig) {}
  async call(system: string, user: string, maxTokens: number): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.cfg.model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.cfg.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${system}\nRespond with a single JSON object. No prose, no markdown fences.` }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

export function makeLLMClient(cfg: LLMConfig): LLMClient {
  if (cfg.provider === "gemini") return new GeminiClient(cfg);
  if (cfg.provider === "ollama") return new OllamaClient(cfg);
  if (cfg.provider === "groq") return new GroqClient(cfg);
  return new AnthropicClient(cfg);
}
