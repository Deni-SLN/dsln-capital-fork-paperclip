import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MessageSquarePlus, Send } from "lucide-react";
import { chatEndpointsApi, type ChatProvider } from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/queryKeys";
import { Link } from "@/lib/router";
import { useChatConnectorsEnabled, chatProviderVisible } from "@/hooks/useChatConnectorsEnabled";
import { useI18n } from "@/lib/locale-helper";

const providerNames: Record<ChatProvider, string> = {
  speko: "Speko",
  slack: "Slack",
  github: "GitHub Code Review Bot",
  discord: "Discord",
  "microsoft-teams": "Microsoft Teams",
  telegram: "Telegram",
  "imessage-photon": "iMessage Photon",
  agentmail: "AgentMail",
};

export function AgentChannelsPanel({
  companyId,
  agentId,
}: {
  companyId: string;
  agentId: string;
}) {
  const { t: tr } = useI18n();
  const { enabled, githubEnabled } = useChatConnectorsEnabled();
  const query = useQuery({
    queryKey: queryKeys.chatEndpoints.list(companyId),
    queryFn: () => chatEndpointsApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const endpoints = (query.data ?? []).filter(
    (endpoint) =>
      endpoint.assignedAgentId === agentId && endpoint.status !== "archived" && chatProviderVisible(endpoint.provider, enabled, githubEnabled),
  );
  return (
    <section className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{tr("Saluran Komunikasi", "Channels")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("Identitas obrolan Telegram, Slack, dan email yang terhubung ke agen ini.", "Chat and email identities connected to this agent.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {enabled && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/apps/chat/connect?provider=telegram&purpose=chat&agentId=${encodeURIComponent(agentId)}`}>
                <Send className="size-3.5 mr-1" />
                {tr("Hubungkan Telegram", "Connect Telegram")}
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to={`/apps?chatAgentId=${encodeURIComponent(agentId)}`}>
              <MessageSquarePlus className="size-3.5 mr-1" />
              {tr("Hubungkan Saluran", "Connect a channel")}
            </Link>
          </Button>
        </div>
      </div>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">{tr("Memuat saluran…", "Loading channels…")}</p>
      ) : endpoints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-5">
          <p className="text-sm font-medium">{tr("Belum ada saluran terhubung", "No channels connected")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {enabled || githubEnabled
              ? tr("Hubungkan bot Telegram atau saluran obrolan dari menu Integrasi.", "Connect an agent identity from Connectors.")
              : tr("Hubungkan AgentMail dari menu Integrasi.", "Connect AgentMail from Connectors.")}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {enabled && (
              <Button asChild size="sm">
                <Link to={`/apps/chat/connect?provider=telegram&purpose=chat&agentId=${encodeURIComponent(agentId)}`}>
                  <Send className="size-3.5 mr-1" />
                  {tr("Hubungkan Bot Telegram", "Connect Telegram Bot")}
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/apps">{tr("Buka Katalog Integrasi", "Open Connectors")}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="flex flex-wrap items-center gap-3 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {providerNames[endpoint.provider]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {endpoint.botLabel ??
                    endpoint.providerAccountLabel ??
                    tr("Identitas penyedia", "Provider identity")}
                </p>
              </div>
              <Badge variant="outline">{endpoint.status.replace(/[_-]/g, " ")}</Badge>
              <Button asChild size="sm" variant="outline">
                <Link to={`/apps/chat/${endpoint.id}/settings`}>
                  {tr("Buka koneksi", "Open connection")} <ExternalLink />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
