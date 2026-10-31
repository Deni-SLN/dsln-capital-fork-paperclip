import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const niceRouterAdapter: ServerAdapterModule = {
  type: "nice_router",
  runtimeToolDelivery: "invocation_context",
  supportsLocalAgentJwt: true,
  execute,
  testEnvironment,
  models: [
    { id: "free-models", label: "Free Models Combo (Nice Router)" },
    { id: "auto", label: "Auto Routing (Nice Router)" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" },
    { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    { id: "openai/gpt-4o", label: "OpenAI GPT-4o" },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  agentConfigurationDoc: `# Nice Router Agent Configuration

Adapter: nice_router
Repository: https://github.com/Deni-SLN/Nice-Router.git

Nice Router adalah custom AI provider & router berkecepatan tinggi yang menghubungkan agen ke berbagai model AI melalui satu gerbang terpadu.

Field konfigurasi utama:
- repoUrl (string, default: https://github.com/Deni-SLN/Nice-Router.git): Repositori Nice Router
- baseUrl (string, default: http://localhost:8000/v1): Endpoint OpenAI-compatible Nice Router
- model (string, default: auto): Model AI yang digunakan untuk perutean
- apiKey (string, opsional): Kunci API Nice Router jika diwajibkan
`,
};
