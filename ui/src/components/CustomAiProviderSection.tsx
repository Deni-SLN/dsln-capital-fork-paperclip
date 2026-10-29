import { useState, useId, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  Server,
  Key,
  Globe,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Search,
  Check,
  AlertCircle,
  Gift,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { useOptionalCompany } from "@/context/CompanyContext";
import { aiConnectionsApi } from "@/api/ai-connections";

export interface CustomAiProviderState {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface CustomAiProviderSectionProps {
  cards?: boolean;
  sectionTitle?: string;
  companyId?: string;
  env?: Record<string, unknown>;
  customProviderConfig?: Record<string, unknown>;
  currentModel?: string;
  harnessType?: string;
  onChange: (patch: {
    customProvider: CustomAiProviderState;
    envPatch: Record<string, { type: "plain"; value: string } | undefined>;
    model?: string;
  }) => void;
}

interface ModelItem {
  id: string;
  name: string;
  isFree: boolean;
}

interface TestStatus {
  status: "untested" | "testing" | "passed" | "failed";
  error?: string;
}

function extractEnvValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "value" in val && typeof (val as { value?: unknown }).value === "string") {
    return (val as { value: string }).value;
  }
  return "";
}

const DEFAULT_ENDPOINTS: Record<string, string> = {
  "nice_router": "http://localhost:8000/v1",
  "9router": "http://localhost:20128/v1",
  "openrouter": "https://openrouter.ai/api/v1",
  "omnirouter": "http://localhost:8000/v1",
  "openai": "https://api.openai.com/v1",
  "anthropic": "https://api.anthropic.com/v1",
};

const DEFAULT_PRESET_MODELS: Record<string, ModelItem[]> = {
  "nice_router": [
    { id: "auto", name: "Nice Router (Auto Routing)", isFree: true },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", isFree: true },
    { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", isFree: false },
    { id: "openai/gpt-4o", name: "OpenAI GPT-4o", isFree: false },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", isFree: false },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", isFree: false },
  ],
  "9router": [
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct (Free)", isFree: true },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", isFree: true },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (Free)", isFree: true },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", isFree: false },
    { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", isFree: false },
    { id: "openai/gpt-4o", name: "OpenAI GPT-4o", isFree: false },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", isFree: false },
  ],
  "openrouter": [
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", isFree: true },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", isFree: true },
    { id: "google/gemini-2.0-flash-thinking-exp:free", name: "Gemini 2.0 Flash Thinking (Free)", isFree: true },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (Free)", isFree: true },
    { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)", isFree: true },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", isFree: false },
    { id: "openai/gpt-4o", name: "GPT-4o", isFree: false },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", isFree: false },
  ],
  "omnirouter": [
    { id: "llama-3.3-70b:free", name: "Llama 3.3 70B (Free)", isFree: true },
    { id: "deepseek-chat", name: "DeepSeek Chat", isFree: false },
    { id: "gpt-4o", name: "GPT-4o", isFree: false },
  ],
  "custom": [
    { id: "default-model:free", name: "Default Free Model", isFree: true },
    { id: "default-model", name: "Default Model", isFree: false },
  ],
};

export function CustomAiProviderSection({
  cards = true,
  sectionTitle,
  companyId: explicitCompanyId,
  env = {},
  customProviderConfig,
  currentModel = "",
  harnessType: _harnessType,
  onChange,
}: CustomAiProviderSectionProps) {
  const { t } = useTranslation();
  const company = useOptionalCompany();
  const params = useParams<{ companyId?: string }>();
  const activeCompanyId = explicitCompanyId || company?.selectedCompanyId || params.companyId || "";

  const selectId = useId();
  const baseUrlId = useId();
  const apiKeyId = useId();
  const modelId = useId();
  const hideFailedId = useId();

  // Initialize state from existing customProviderConfig or inspect env
  const [providerId, setProviderId] = useState<string>(() => {
    if (customProviderConfig?.providerId && typeof customProviderConfig.providerId === "string") {
      return customProviderConfig.providerId;
    }
    const openaiBase = extractEnvValue(env.OPENAI_BASE_URL);
    const anthropicBase = extractEnvValue(env.ANTHROPIC_BASE_URL);
    const openrouterKey = extractEnvValue(env.OPENROUTER_API_KEY);
    if (openaiBase.includes(":20128") || anthropicBase.includes(":20128")) return "9router";
    if (openrouterKey || openaiBase.includes("openrouter.ai")) return "openrouter";
    if (openaiBase) return "custom";
    if (extractEnvValue(env.ANTHROPIC_API_KEY)) return "anthropic";
    if (extractEnvValue(env.OPENAI_API_KEY)) return "openai";
    return "9router";
  });

  const [baseUrl, setBaseUrl] = useState<string>(() => {
    if (customProviderConfig?.baseUrl && typeof customProviderConfig.baseUrl === "string") {
      return customProviderConfig.baseUrl;
    }
    const existing = extractEnvValue(env.OPENAI_BASE_URL) || extractEnvValue(env.ANTHROPIC_BASE_URL);
    return existing || DEFAULT_ENDPOINTS[providerId] || "http://localhost:20128/v1";
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    if (customProviderConfig?.apiKey && typeof customProviderConfig.apiKey === "string") {
      return customProviderConfig.apiKey;
    }
    return (
      extractEnvValue(env.OPENAI_API_KEY) ||
      extractEnvValue(env.ANTHROPIC_API_KEY) ||
      extractEnvValue(env.OPENROUTER_API_KEY) ||
      ""
    );
  });

  const [model, setModel] = useState<string>(() => {
    if (customProviderConfig?.model && typeof customProviderConfig.model === "string") {
      return customProviderConfig.model;
    }
    return currentModel;
  });

  const [showApiKey, setShowApiKey] = useState(false);

  // Model Management State
  const [modelsList, setModelsList] = useState<ModelItem[]>(() => {
    return DEFAULT_PRESET_MODELS[providerId] || DEFAULT_PRESET_MODELS["9router"] || [];
  });
  const [testResults, setTestResults] = useState<Record<string, TestStatus>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testProgress, setTestProgress] = useState<{ current: number; total: number } | null>(null);
  const [hideFailed, setHideFailed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  // Sync to parent when fields change
  const applyChange = (nextProviderId: string, nextBaseUrl: string, nextApiKey: string, nextModel: string) => {
    const envPatch: Record<string, { type: "plain"; value: string } | undefined> = {};

    if (nextProviderId === "nice_router") {
      const url = nextBaseUrl.trim() || DEFAULT_ENDPOINTS["nice_router"];
      const key = nextApiKey.trim() || "nice-router-key";
      envPatch.OPENAI_BASE_URL = { type: "plain", value: url };
      envPatch.OPENAI_API_KEY = { type: "plain", value: key };
      envPatch.ANTHROPIC_BASE_URL = { type: "plain", value: url };
      envPatch.ANTHROPIC_API_KEY = { type: "plain", value: key };
    } else if (nextProviderId === "9router") {
      const url = nextBaseUrl.trim() || DEFAULT_ENDPOINTS["9router"];
      const key = nextApiKey.trim() || "9router-local";
      envPatch.OPENAI_BASE_URL = { type: "plain", value: url };
      envPatch.OPENAI_API_KEY = { type: "plain", value: key };
      envPatch.ANTHROPIC_BASE_URL = { type: "plain", value: url };
      envPatch.ANTHROPIC_API_KEY = { type: "plain", value: key };
    } else if (nextProviderId === "openrouter") {
      const url = nextBaseUrl.trim() || DEFAULT_ENDPOINTS["openrouter"];
      const key = nextApiKey.trim();
      envPatch.OPENROUTER_API_KEY = { type: "plain", value: key };
      envPatch.OPENAI_BASE_URL = { type: "plain", value: url };
      envPatch.OPENAI_API_KEY = { type: "plain", value: key };
    } else if (nextProviderId === "omnirouter") {
      const url = nextBaseUrl.trim() || DEFAULT_ENDPOINTS["omnirouter"];
      const key = nextApiKey.trim();
      envPatch.OPENAI_BASE_URL = { type: "plain", value: url };
      envPatch.OPENAI_API_KEY = { type: "plain", value: key };
    } else if (nextProviderId === "custom") {
      const url = nextBaseUrl.trim();
      const key = nextApiKey.trim();
      if (url) {
        envPatch.OPENAI_BASE_URL = { type: "plain", value: url };
        envPatch.ANTHROPIC_BASE_URL = { type: "plain", value: url };
      }
      if (key) {
        envPatch.OPENAI_API_KEY = { type: "plain", value: key };
        envPatch.ANTHROPIC_API_KEY = { type: "plain", value: key };
      }
    } else if (nextProviderId === "openai") {
      envPatch.OPENAI_BASE_URL = undefined;
      if (nextApiKey.trim()) envPatch.OPENAI_API_KEY = { type: "plain", value: nextApiKey.trim() };
    } else if (nextProviderId === "anthropic") {
      envPatch.ANTHROPIC_BASE_URL = undefined;
      if (nextApiKey.trim()) envPatch.ANTHROPIC_API_KEY = { type: "plain", value: nextApiKey.trim() };
    } else if (nextProviderId === "google") {
      if (nextApiKey.trim()) envPatch.GEMINI_API_KEY = { type: "plain", value: nextApiKey.trim() };
    } else if (nextProviderId === "none") {
      envPatch.OPENAI_BASE_URL = undefined;
      envPatch.ANTHROPIC_BASE_URL = undefined;
    }

    onChange({
      customProvider: {
        providerId: nextProviderId,
        baseUrl: nextBaseUrl,
        apiKey: nextApiKey,
        model: nextModel,
      },
      envPatch,
      model: nextModel ? nextModel : undefined,
    });
  };

  const handleProviderSelect = (newProvider: string) => {
    setProviderId(newProvider);
    let newUrl = baseUrl;
    if (DEFAULT_ENDPOINTS[newProvider]) {
      newUrl = DEFAULT_ENDPOINTS[newProvider];
      setBaseUrl(newUrl);
    }
    if (DEFAULT_PRESET_MODELS[newProvider]) {
      setModelsList(DEFAULT_PRESET_MODELS[newProvider]);
      setTestResults({});
    }
    applyChange(newProvider, newUrl, apiKey, model);
  };

  const handleBaseUrlChange = (newUrl: string) => {
    setBaseUrl(newUrl);
    applyChange(providerId, newUrl, apiKey, model);
  };

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    applyChange(providerId, baseUrl, newKey, model);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    applyChange(providerId, baseUrl, apiKey, newModel);
  };

  // Import Models from Base URL via backend proxy
  const handleImportModels = async () => {
    if (!activeCompanyId) {
      setImportStatusMessage(t("customAi.importFailed", { error: "Company context missing", defaultValue: "Failed: company context missing" }));
      return;
    }
    setIsImporting(true);
    setImportStatusMessage(null);
    try {
      const res = await aiConnectionsApi.probeModels(activeCompanyId, {
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
      });

      if (res.ok && Array.isArray(res.models) && res.models.length > 0) {
        setModelsList(res.models);
        const freeCount = res.models.filter((m) => m.isFree).length;
        setImportStatusMessage(
          t("customAi.importSuccess", {
            count: res.models.length,
            freeCount,
            defaultValue: `Successfully imported ${res.models.length} models (${freeCount} free)`,
          })
        );
      } else {
        setImportStatusMessage(
          t("customAi.importFailed", {
            error: res.error || "No models returned from provider",
            defaultValue: `Failed: ${res.error || "No models returned"}`,
          })
        );
      }
    } catch (err) {
      setImportStatusMessage(
        t("customAi.importFailed", {
          error: err instanceof Error ? err.message : "Network error",
          defaultValue: `Failed: ${err instanceof Error ? err.message : "Network error"}`,
        })
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Auto Test All Models
  const handleAutoTestAll = async () => {
    if (!activeCompanyId || !baseUrl.trim()) return;
    setIsTestingAll(true);
    const toTest = [...modelsList];
    setTestProgress({ current: 0, total: toTest.length });

    for (let i = 0; i < toTest.length; i++) {
      const target = toTest[i];
      setTestResults((prev) => ({
        ...prev,
        [target.id]: { status: "testing" },
      }));

      try {
        const res = await aiConnectionsApi.testModel(activeCompanyId, {
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim() || undefined,
          model: target.id,
        });
        setTestResults((prev) => ({
          ...prev,
          [target.id]: {
            status: res.status,
            error: res.error,
          },
        }));
      } catch (err) {
        setTestResults((prev) => ({
          ...prev,
          [target.id]: {
            status: "failed",
            error: err instanceof Error ? err.message : "Request failed",
          },
        }));
      }

      setTestProgress({ current: i + 1, total: toTest.length });
    }

    setIsTestingAll(false);
    setTestProgress(null);
  };

  // Test single model
  const handleTestSingle = async (modelIdToTest: string) => {
    if (!activeCompanyId || !baseUrl.trim()) return;
    setTestResults((prev) => ({
      ...prev,
      [modelIdToTest]: { status: "testing" },
    }));

    try {
      const res = await aiConnectionsApi.testModel(activeCompanyId, {
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
        model: modelIdToTest,
      });
      setTestResults((prev) => ({
        ...prev,
        [modelIdToTest]: {
          status: res.status,
          error: res.error,
        },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [modelIdToTest]: {
          status: "failed",
          error: err instanceof Error ? err.message : "Request failed",
        },
      }));
    }
  };

  // Model counts and filtering:
  // Requirement: Free models must be sorted to the very top, failed models can be auto-hidden
  const failedCount = useMemo(() => {
    return modelsList.filter((m) => testResults[m.id]?.status === "failed").length;
  }, [modelsList, testResults]);

  const passedCount = useMemo(() => {
    return modelsList.filter((m) => testResults[m.id]?.status === "passed").length;
  }, [modelsList, testResults]);

  const freeCount = useMemo(() => {
    return modelsList.filter((m) => m.isFree).length;
  }, [modelsList]);

  const sortedAndFilteredModels = useMemo(() => {
    let list = [...modelsList];

    // Filter by search term
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }

    // Auto-hide failed models if toggle is active
    if (hideFailed) {
      list = list.filter((m) => testResults[m.id]?.status !== "failed");
    }

    // Sort models:
    // 1. Free models strictly at the top
    // 2. Ready (passed) models next
    // 3. Untested models
    // 4. Failed models last
    return list.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;

      const statusA = testResults[a.id]?.status || "untested";
      const statusB = testResults[b.id]?.status || "untested";

      const priority: Record<string, number> = {
        passed: 1,
        testing: 2,
        untested: 3,
        failed: 4,
      };

      const diff = (priority[statusA] ?? 3) - (priority[statusB] ?? 3);
      if (diff !== 0) return diff;

      return a.id.localeCompare(b.id);
    });
  }, [modelsList, searchQuery, hideFailed, testResults]);

  const titleText = sectionTitle ?? t("customAi.title", { defaultValue: "AI Provider & API Gateway" });

  const QUICK_MODELS = [
    "anthropic/claude-3.5-sonnet",
    "deepseek/deepseek-chat",
    "openai/gpt-4o",
    "google/gemini-2.5-pro",
    "meta-llama/llama-3.3-70b-instruct:free",
  ];

  return (
    <div data-config-section="aiProvider" className={cn(!cards && "border-b border-border")}>
      {cards ? (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">{titleText}</h3>
          {providerId !== "none" && (
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              <CheckCircle2 className="size-3.5" />
              <span>{providerId.toUpperCase()}</span>
            </span>
          )}
        </div>
      ) : (
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground">{titleText}</div>
      )}

      <div className={cn(cards ? "border border-border rounded-lg p-4 space-y-4" : "px-4 pb-4 space-y-4")}>
        {/* Provider selection */}
        <div className="space-y-1.5">
          <label htmlFor={selectId} className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Server className="size-3.5 text-muted-foreground" />
            <span>{t("customAi.providerLabel", { defaultValue: "AI Provider" })}</span>
          </label>
          <NativeSelect
            id={selectId}
            value={providerId}
            onChange={(e) => handleProviderSelect(e.target.value)}
          >
            <option value="nice_router">Nice Router (https://github.com/Deni-SLN/Nice-Router.git)</option>
            <option value="9router">{t("customAi.provider9router", { defaultValue: "9Router (Local: localhost:20128)" })}</option>
            <option value="openrouter">{t("customAi.providerOpenrouter", { defaultValue: "OpenRouter (openrouter.ai)" })}</option>
            <option value="omnirouter">{t("customAi.providerOmnirouter", { defaultValue: "OmniRoute Gateway" })}</option>
            <option value="custom">{t("customAi.providerCustom", { defaultValue: "Custom Provider (OpenAI Compatible)" })}</option>
            <option value="openai">{t("customAi.providerOpenai", { defaultValue: "OpenAI (Direct)" })}</option>
            <option value="anthropic">{t("customAi.providerAnthropic", { defaultValue: "Anthropic (Direct)" })}</option>
            <option value="google">{t("customAi.providerGoogle", { defaultValue: "Google Gemini (Direct)" })}</option>
            <option value="none">{t("customAi.providerNone", { defaultValue: "Default / Standalone" })}</option>
          </NativeSelect>

          {providerId === "nice_router" && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Nice Router adalah router AI kustom berkecepatan tinggi dengan auto-routing cerdas.
              </p>
              <a
                href="https://github.com/Deni-SLN/Nice-Router.git"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <span>Buka https://github.com/Deni-SLN/Nice-Router.git</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          {providerId === "9router" && (
            <p className="text-xs text-muted-foreground">
              {t("customAi.tip9router", {
                defaultValue: "9Router connects your agent to 40-60+ LLM providers locally with smart fallback and token optimization.",
              })}
            </p>
          )}

          {providerId === "custom" && (
            <p className="text-xs text-muted-foreground">
              {t("customAi.tipCustom", {
                defaultValue: "Enter any OpenAI-compatible base URL (e.g. LiteLLM, vLLM, Ollama, LocalAI, Groq).",
              })}
            </p>
          )}
        </div>

        {/* Base URL (if router or custom) */}
        {providerId !== "none" && providerId !== "google" && (
          <div className="space-y-1.5">
            <label htmlFor={baseUrlId} className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Globe className="size-3.5 text-muted-foreground" />
              <span>{t("customAi.baseUrlLabel", { defaultValue: "Base URL / Endpoint" })}</span>
            </label>
            <Input
              id={baseUrlId}
              type="text"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder={t("customAi.baseUrlPlaceholder", {
                defaultValue: "e.g. http://localhost:20128/v1 or https://api.openai.com/v1",
              })}
            />
          </div>
        )}

        {/* API Key */}
        {providerId !== "none" && (
          <div className="space-y-1.5">
            <label htmlFor={apiKeyId} className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Key className="size-3.5 text-muted-foreground" />
              <span>{t("customAi.apiKeyLabel", { defaultValue: "API Key" })}</span>
            </label>
            <div className="relative">
              <Input
                id={apiKeyId}
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={t("customAi.apiKeyPlaceholder", {
                  defaultValue: "Enter API Key (e.g. 9router-key, sk-...)",
                })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Active Model ID Input */}
        {providerId !== "none" && (
          <div className="space-y-2">
            <label htmlFor={modelId} className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-muted-foreground" />
              <span>{t("customAi.modelLabel", { defaultValue: "Model Name / ID" })}</span>
            </label>
            <Input
              id={modelId}
              type="text"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              placeholder={t("customAi.modelPlaceholder", {
                defaultValue: "e.g. anthropic/claude-3.5-sonnet, deepseek-chat, gpt-4o",
              })}
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground mr-1">
                {t("customAi.modelPresetLabel", { defaultValue: "Quick suggestions" })}:
              </span>
              {QUICK_MODELS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModelChange(m)}
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-xs transition-colors",
                    model === m
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Model Import, Auto-Testing, & Free Models Priority Section */}
        {providerId !== "none" && (
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>
                    {t("customAi.modelsCount", {
                      total: modelsList.length,
                      free: freeCount,
                      working: passedCount,
                      defaultValue: `${modelsList.length} models (${freeCount} free, ${passedCount} ready)`,
                    })}
                  </span>
                </h4>
              </div>

              {/* Action Buttons: Import & Auto-Test */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportModels}
                  disabled={isImporting || isTestingAll}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className={cn("size-3", isImporting && "animate-spin")} />
                  <span>{isImporting ? t("customAi.importing", { defaultValue: "Importing..." }) : t("customAi.importModels", { defaultValue: "Import Models" })}</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoTestAll}
                  disabled={isImporting || isTestingAll || modelsList.length === 0}
                  className="h-7 text-xs gap-1"
                >
                  <Play className={cn("size-3", isTestingAll && "animate-pulse")} />
                  <span>
                    {testProgress
                      ? t("customAi.testProgress", {
                          current: testProgress.current,
                          total: testProgress.total,
                          defaultValue: `Testing (${testProgress.current}/${testProgress.total})...`,
                        })
                      : t("customAi.autoTest", { defaultValue: "Auto Test All" })}
                  </span>
                </Button>
              </div>
            </div>

            {/* Import Status Notification */}
            {importStatusMessage && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border border-border">
                {importStatusMessage}
              </p>
            )}

            {/* Filter and Auto-Hide Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("customAi.searchModelPlaceholder", { defaultValue: "Search models..." })}
                  className="h-7 text-xs pl-8"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor={hideFailedId} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    id={hideFailedId}
                    type="checkbox"
                    checked={hideFailed}
                    onChange={(e) => setHideFailed(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-3.5"
                  />
                  <span>{t("customAi.hideFailed", { defaultValue: "Auto-hide failed models" })}</span>
                </label>

                {failedCount > 0 && hideFailed && (
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive bg-destructive/10">
                    {t("customAi.failedHiddenCount", { count: failedCount, defaultValue: `${failedCount} hidden` })}
                  </Badge>
                )}
              </div>
            </div>

            {/* Models Scrollable List */}
            <div className="rounded-md border border-border bg-muted/20 p-1.5 max-h-64 overflow-y-auto space-y-1">
              {sortedAndFilteredModels.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {t("customAi.noModelsFound", {
                    defaultValue: "No models found or imported yet. Click 'Import Models' or enter manually.",
                  })}
                </div>
              ) : (
                sortedAndFilteredModels.map((m) => {
                  const testStatus = testResults[m.id]?.status || "untested";
                  const isCurrent = model === m.id;

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center justify-between gap-2 p-2 rounded text-xs transition-colors border",
                        isCurrent
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-transparent bg-background/60 hover:bg-muted/60 text-foreground"
                      )}
                    >
                      {/* Left: Model Name, ID, & Badges */}
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Status Icon */}
                        {testStatus === "passed" && (
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {testStatus === "failed" && (
                          <XCircle className="size-3.5 text-destructive shrink-0" />
                        )}
                        {testStatus === "testing" && (
                          <RefreshCw className="size-3.5 text-primary animate-spin shrink-0" />
                        )}
                        {testStatus === "untested" && (
                          <div className="size-2 rounded-full bg-muted-foreground/40 shrink-0 mx-0.5" />
                        )}

                        <div className="truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={cn("font-medium truncate", isCurrent && "text-primary")}>
                              {m.id}
                            </span>

                            {/* Free Model Badge - Prominently displayed */}
                            {m.isFree && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                <Gift className="size-2.5" />
                                <span>{t("customAi.freeBadge", { defaultValue: "FREE" })}</span>
                              </span>
                            )}

                            {/* Test Status Badges */}
                            {testStatus === "passed" && (
                              <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                {t("customAi.passedBadge", { defaultValue: "Ready" })}
                              </Badge>
                            )}

                            {testStatus === "failed" && (
                              <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                                {t("customAi.failedBadge", { defaultValue: "Failed" })}
                              </Badge>
                            )}
                          </div>

                          {m.name && m.name !== m.id && (
                            <p className="text-xs text-muted-foreground truncate">{m.name}</p>
                          )}

                          {testStatus === "failed" && testResults[m.id]?.error && (
                            <p className="text-xs text-destructive truncate">{testResults[m.id].error}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestSingle(m.id)}
                          disabled={testStatus === "testing" || isTestingAll}
                          title={t("customAi.testSingle", { defaultValue: "Test" })}
                          className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Play className="size-3" />
                        </Button>

                        <Button
                          type="button"
                          variant={isCurrent ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => handleModelChange(m.id)}
                          className="h-6 px-2 text-xs"
                        >
                          {isCurrent ? (
                            <span className="flex items-center gap-1 font-medium">
                              <Check className="size-3" />
                              <span>{t("customAi.selectModel", { defaultValue: "Selected" })}</span>
                            </span>
                          ) : (
                            <span>{t("customAi.selectModel", { defaultValue: "Use model" })}</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
