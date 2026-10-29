import { useState } from "react";
import type { AiConnectionBinding, AiProviderRouting } from "@paperclipai/shared";
import type { ProviderChoice } from "../ai-connections/AiProviderSetup";
import { AiProviderSetup } from "../ai-connections/AiProviderSetup";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export function OnboardingGatewaySetup({
  companyId,
  agentId,
  environmentId,
  adapterType,
  disabled,
  initialProvider,
  initialProtocol,
  buttonLabel,
  advancedOnly = true,
  onComplete,
}: {
  companyId: string;
  agentId?: string;
  environmentId?: string;
  adapterType: "codex_local" | "claude_local" | "opencode_local" | "pi_local" | "hermes_local";
  disabled?: boolean;
  initialProvider?: ProviderChoice;
  initialProtocol?: AiProviderRouting["protocol"];
  buttonLabel?: string;
  advancedOnly?: boolean;
  onComplete: (binding: Exclude<AiConnectionBinding, { mode: "responsible_user" }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const protocol = initialProtocol ?? (adapterType === "codex_local" ? "responses" : adapterType === "claude_local" ? "messages" : "chat");
  return <>
    <Button type="button" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>
      {buttonLabel ?? "Use another provider"}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-(--sz-85vh) overflow-y-auto sm:max-w-2xl" onKeyDown={event => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Connect a model provider</DialogTitle>
          <DialogDescription>Choose OpenRouter, 9Router, Omnirouter, or another compatible gateway, save the connection, then choose a model and test it with your agent.</DialogDescription>
        </DialogHeader>
        <AiProviderSetup companyId={companyId} agentId={agentId} environmentId={environmentId}
          initialProvider={initialProvider} initialProtocol={initialProtocol ?? protocol}
          advancedOnly={advancedOnly}
          submitLabel="Save connection" onCancel={() => setOpen(false)}
          onComplete={binding => { setOpen(false); onComplete(binding); }} />
      </DialogContent>
    </Dialog>
  </>;
}