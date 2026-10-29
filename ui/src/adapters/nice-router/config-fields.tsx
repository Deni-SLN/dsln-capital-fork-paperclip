import { configFieldsForSection } from "../config-sections";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";
import { ExternalLink } from "lucide-react";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function NiceRouterConfigFields({
  section,
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  const repoUrl = isCreate
    ? (values?.adapterSchemaValues?.repoUrl as string) ?? "https://github.com/Deni-SLN/Nice-Router.git"
    : eff("adapterConfig", "repoUrl", String(config.repoUrl ?? "https://github.com/Deni-SLN/Nice-Router.git"));

  const baseUrl = isCreate
    ? (values?.adapterSchemaValues?.baseUrl as string) ?? (values?.url || "http://localhost:8000/v1")
    : eff("adapterConfig", "baseUrl", String(config.baseUrl ?? config.url ?? "http://localhost:8000/v1"));

  const apiKey = isCreate
    ? (values?.adapterSchemaValues?.apiKey as string) ?? ""
    : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""));

  return configFieldsForSection(section, (
    <div className="space-y-4">
      <Field
        label="Repositori Nice Router"
        hint="Tautan repositori resmi Nice Router"
      >
        <div className="space-y-1.5">
          <DraftInput
            value={repoUrl}
            onCommit={(v) => {
              const val = v || "https://github.com/Deni-SLN/Nice-Router.git";
              if (isCreate) {
                set!({
                  adapterSchemaValues: {
                    ...values?.adapterSchemaValues,
                    repoUrl: val,
                  },
                });
              } else {
                mark("adapterConfig", "repoUrl", val);
              }
            }}
            immediate
            className={inputClass}
            placeholder="https://github.com/Deni-SLN/Nice-Router.git"
          />
          <a
            href="https://github.com/Deni-SLN/Nice-Router.git"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <span>Buka https://github.com/Deni-SLN/Nice-Router.git</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </Field>

      <Field
        label="Endpoint Nice Router (Base URL)"
        hint="Alamat service Nice Router yang aktif (misalnya http://localhost:8000/v1)"
      >
        <DraftInput
          value={baseUrl}
          onCommit={(v) => {
            const val = v || "http://localhost:8000/v1";
            if (isCreate) {
              set!({
                url: val,
                adapterSchemaValues: {
                  ...values?.adapterSchemaValues,
                  baseUrl: val,
                },
              });
            } else {
              mark("adapterConfig", "baseUrl", val);
            }
          }}
          immediate
          className={inputClass}
          placeholder="http://localhost:8000/v1"
        />
      </Field>

      <Field
        label="API Key / Token (Opsional)"
        hint="Kunci autentikasi untuk Nice Router jika diaktifkan"
      >
        <DraftInput
          value={apiKey}
          onCommit={(v) => {
            if (isCreate) {
              set!({
                adapterSchemaValues: {
                  ...values?.adapterSchemaValues,
                  apiKey: v,
                },
              });
            } else {
              mark("adapterConfig", "apiKey", v || undefined);
            }
          }}
          immediate
          className={inputClass}
          placeholder="Masukkan API key Nice Router jika diperlukan"
        />
      </Field>
    </div>
  ));
}
