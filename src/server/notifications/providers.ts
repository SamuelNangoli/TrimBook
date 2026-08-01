import "server-only";

import type { NotificationChannel } from "@prisma/client";

/**
 * Message delivery abstraction.
 *
 * Each outbound channel (email, SMS, WhatsApp) implements `MessageProvider`.
 * By default we use a Log provider that records what *would* be sent — so the
 * whole notification pipeline works with zero external credentials. To go live,
 * drop a real provider (Resend, Africa's Talking, Twilio, WhatsApp Cloud API)
 * behind the same interface and select it in `getProvider` via env vars.
 */

export type DeliveryResult = { ok: boolean; error?: string };

export interface MessageProvider {
  readonly channel: NotificationChannel;
  send(to: string, subject: string, body: string): Promise<DeliveryResult>;
}

class LogProvider implements MessageProvider {
  constructor(readonly channel: NotificationChannel) {}
  async send(to: string, subject: string, body: string): Promise<DeliveryResult> {
    if (!to) return { ok: false, error: "No recipient address/number on file." };
    if (process.env.NODE_ENV !== "production") {
      console.log(`[${this.channel}] → ${to}: ${subject} — ${body}`);
    }
    return { ok: true };
  }
}

/**
 * Resolve the provider for a channel. Real providers are wired here when their
 * env vars are present; otherwise the Log provider is used. (Real HTTP calls are
 * intentionally left as a clearly-marked extension point for Phase 7+/go-live.)
 */
export function getProvider(channel: NotificationChannel): MessageProvider {
  switch (channel) {
    case "EMAIL":
      // e.g. if (process.env.RESEND_API_KEY) return new ResendProvider();
      return new LogProvider("EMAIL");
    case "SMS":
      // e.g. if (process.env.SMS_API_KEY) return new AfricasTalkingProvider();
      return new LogProvider("SMS");
    case "WHATSAPP":
      // WhatsApp Cloud API — future integration.
      return new LogProvider("WHATSAPP");
    default:
      return new LogProvider(channel);
  }
}
