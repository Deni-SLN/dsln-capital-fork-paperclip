import { useEffect, useContext } from "react";
import { Link2, ExternalLink, Send, Plus, ArrowRight, Bot, CheckCircle2 } from "lucide-react";
import { useQuery, QueryClientContext } from "@tanstack/react-query";
import { chatEndpointsApi } from "../api/chatEndpoints";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "./apps/AppLogo";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { DecisionModelSettingsSection } from "../components/decision-models/DecisionModelSettings";
import { FastResponseSettingsSection } from "../components/fast-responses/FastResponseSettings";
import { useFastResponsesEnabled } from "../hooks/useFastResponsesEnabled";
import { PromptInjectionPreventionSettingsSection } from "../components/prompt-injection-prevention/PromptInjectionPreventionSettings";
import { useI18n } from "@/lib/locale-helper";

function TelegramGuideBox() {
  const { t: tr } = useI18n();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border p-4 bg-muted/10 space-y-3">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-primary" />
          {tr("Panduan Cepat Menghubungkan Telegram:", "Quick Telegram Setup Guide:")}
        </span>
        <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          <li>
            {tr(
              "Buka aplikasi Telegram dan cari akun resmi @BotFather (https://t.me/BotFather).",
              "Open Telegram and search for the official @BotFather (https://t.me/BotFather)."
            )}
          </li>
          <li>
            {tr(
              "Kirim perintah /newbot, lalu masukkan nama bot (misal: DSLN AI) dan username unik yang berakhiran bot (misal: dsln_agent_bot).",
              "Send /newbot, then provide a bot name (e.g. DSLN AI) and a unique username ending in bot (e.g. dsln_agent_bot)."
            )}
          </li>
          <li>
            {tr(
              "Salin Token API HTTP yang diberikan oleh BotFather (format: 123456789:ABCdef...).",
              "Copy the HTTP API Token provided by BotFather (format: 123456789:ABCdef...)."
            )}
          </li>
          <li>
            {tr(
              "Klik tombol 'Hubungkan Bot Telegram' di atas untuk menautkan bot dengan Agen AI Anda.",
              "Click the 'Connect Telegram Bot' button above to link the bot with your AI Agent."
            )}
          </li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground pt-1">
        <span>
          {tr(
            "Ingin menghubungkan platform lain seperti Slack, Discord, atau GitHub?",
            "Want to connect other platforms like Slack, Discord, or GitHub?"
          )}
        </span>
        <a href="/apps" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
          {tr("Jelajahi Semua Konektor di Apps", "Browse All Connectors in Apps")}
          <ArrowRight className="size-3" />
        </a>
      </div>
    </div>
  );
}

function TelegramIntegrationContent({ companyId }: { companyId: string }) {
  const { t: tr } = useI18n();
  const { data: chatEndpoints = [] } = useQuery({
    queryKey: queryKeys.chatEndpoints.list(companyId),
    queryFn: () => chatEndpointsApi.list(companyId),
    enabled: Boolean(companyId),
  });

  const telegramEndpoints = chatEndpoints.filter(
    (e) => e.provider === "telegram" && e.status !== "archived",
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <AppLogo name="Telegram" brandKey="telegram" size={40} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {tr("Integrasi Bot Telegram", "Telegram Bot Integration")}
              </h2>
              <Badge variant={telegramEndpoints.length > 0 ? "default" : "outline"} className="text-xs">
                {telegramEndpoints.length > 0 ? tr("Aktif", "Active") : tr("Tersedia", "Available")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tr(
                "Hubungkan agen AI Anda ke Telegram untuk interaksi dua arah melalui pesan pribadi (DM), grup, dan topik.",
                "Connect your AI agents to Telegram for two-way interactions via direct messages, groups, and topics."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" asChild>
            <a href="/apps/chat/connect?provider=telegram&purpose=chat">
              <Plus className="size-3.5 mr-1" />
              {tr("Hubungkan Bot Telegram", "Connect Telegram Bot")}
            </a>
          </Button>
        </div>
      </div>

      {telegramEndpoints.length > 0 ? (
        <div className="space-y-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tr("Bot Telegram Terdaftar", "Registered Telegram Bots")}
          </span>
          <div className="divide-y divide-border/60 rounded-lg border border-border bg-muted/20">
            {telegramEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <Send className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {endpoint.botUsername ? `@${endpoint.botUsername.replace(/^@/, "")}` : endpoint.botLabel ?? "Telegram Bot"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {endpoint.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Bot className="size-3" />
                      <span>{tr("Tertaut ke Agen:", "Linked to Agent:")} <strong className="text-foreground">{endpoint.botLabel ?? "Agent"}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {endpoint.botUsername && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`https://t.me/${endpoint.botUsername.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-1.5"
                      >
                        {tr("Buka di Telegram", "Open in Telegram")}
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" asChild>
                    <a href={`/apps/chat/${endpoint.id}/settings`}>
                      {tr("Kelola Bot", "Manage Bot")}
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <TelegramGuideBox />
      )}
    </div>
  );
}

function TelegramIntegrationCard({ companyId }: { companyId: string }) {
  const contextClient = useContext(QueryClientContext);
  if (!contextClient) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <TelegramGuideBox />
      </div>
    );
  }
  return <TelegramIntegrationContent companyId={companyId} />;
}

export function CompanyConnections() {
  const { t: tr } = useI18n();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { enabled } = useFastResponsesEnabled();

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? tr("Perusahaan", "Company"), href: "/dashboard" },
      { label: tr("Pengaturan", "Settings"), href: "/company/settings" },
      { label: tr("Integrasi & API", "Connections") },
    ]);
  }, [setBreadcrumbs, selectedCompany?.name, tr]);

  if (!selectedCompanyId) {
    return (
      <div className="text-sm text-muted-foreground">
        {tr("Belum ada organisasi yang dipilih. Silakan pilih organisasi di menu atas.", "No organization selected. Select an organization from the switcher above.")}
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{tr("Integrasi & API", "Connections")}</h1>
      </div>

      <TelegramIntegrationCard companyId={selectedCompanyId} />

      <DecisionModelSettingsSection key={selectedCompanyId} companyId={selectedCompanyId} />
      <div className="max-w-2xl border-t border-border pt-8">
        <PromptInjectionPreventionSettingsSection key={`injection-${selectedCompanyId}`} companyId={selectedCompanyId} />
      </div>
      {enabled && <div className="max-w-2xl border-t border-border pt-8">
        <FastResponseSettingsSection key={`fast-${selectedCompanyId}`} companyId={selectedCompanyId} />
      </div>}
    </div>
  );
}
