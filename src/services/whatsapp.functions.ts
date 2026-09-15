import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ConfigSchema = z.object({
  provider: z.literal("z-api"),
  instanceId: z.string().min(1),
  token: z.string().min(1),
  clientToken: z.string().optional().default(""),
});

const SendSchema = ConfigSchema.extend({ phone: z.string().min(1), body: z.string().min(1) });

function baseUrl(config: z.infer<typeof ConfigSchema>) {
  return `https://api.z-api.io/instances/${encodeURIComponent(config.instanceId.trim())}/token/${encodeURIComponent(config.token.trim())}`;
}

function headers(config: z.infer<typeof ConfigSchema>): HeadersInit {
  return config.clientToken.trim()
    ? { "Content-Type": "application/json", "Client-Token": config.clientToken.trim() }
    : { "Content-Type": "application/json" };
}

async function parse(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export const checkWhatsappConnection = createServerFn({ method: "POST" }).validator(ConfigSchema).handler(async ({ data }) => {
  const response = await fetch(`${baseUrl(data)}/status`, { headers: headers(data), signal: AbortSignal.timeout(8000) });
  const payload = await parse(response);
  if (!response.ok) throw new Error(String(payload.message ?? payload.error ?? `Z-API retornou HTTP ${response.status}.`));
  const connected = Boolean(payload.connected ?? payload.value);
  return { connected, phoneNumber: String(payload.phoneNumber ?? payload.phone ?? "") || null };
});

export const sendWhatsappText = createServerFn({ method: "POST" }).validator(SendSchema).handler(async ({ data }) => {
  const response = await fetch(`${baseUrl(data)}/send-text`, {
    method: "POST",
    headers: headers(data),
    body: JSON.stringify({ phone: data.phone.replace(/\D/g, ""), message: data.body }),
    signal: AbortSignal.timeout(10000),
  });
  const payload = await parse(response);
  if (!response.ok) throw new Error(String(payload.message ?? payload.error ?? `Z-API retornou HTTP ${response.status}.`));
  return { providerMessageId: String(payload.zaapId ?? payload.messageId ?? payload.id ?? "") || null };
});
