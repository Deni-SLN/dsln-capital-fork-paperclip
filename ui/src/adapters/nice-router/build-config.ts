import type { CreateConfigValues } from "../../components/AgentConfigForm";

export function buildNiceRouterConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  ac.repoUrl = v.adapterSchemaValues?.repoUrl ?? "https://github.com/Deni-SLN/Nice-Router.git";
  ac.baseUrl = v.adapterSchemaValues?.baseUrl ?? (v.url || "http://localhost:8000/v1");
  ac.model = v.model || v.adapterSchemaValues?.model || "auto";
  if (v.adapterSchemaValues?.apiKey) {
    ac.apiKey = v.adapterSchemaValues.apiKey;
  }
  ac.timeoutMs = 60000;
  return ac;
}
