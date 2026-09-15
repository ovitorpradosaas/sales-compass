import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ConfigSchema = z.object({
  provider: z.enum(["z-api", "w-api", "evolution"]),
  instanceId: z.string().min(1),
  token: z.string().min(1),
  clientToken: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
});

const SendSchema = ConfigSchema.extend({ phone: z.string().min(1), body: z.string().min(1) });

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function zapiUrl(config: z.infer<typeof ConfigSchema>) {
  return `https://api.z-api.io/instances/${encodeURIComponent(config.instanceId.trim())}/token/${encodeURIComponent(config.token.trim())}`;
}

function providerBaseUrl(config: z.infer<typeof ConfigSchema>) {
  if (config.provider === "evolution") {
    const base = cleanBaseUrl(config.baseUrl);
    if (!base) throw new Error("Informe a URL da sua Evolution API.");
    return base;
  }
  return config.provider === "w-api" ? "https://api.w-api.app/v1" : zapiUrl(config);
}

function headers(config: z.infer<typeof ConfigSchema>): HeadersInit {
  if (config.provider === "z-api") {
    return config.clientToken.trim()
      ? { "Content-Type": "application/json", "Client-Token": config.clientToken.trim() }
      : { "Content-Type": "application/json" };
  }
  return config.provider === "w-api"
    ? { "Content-Type": "application/json", Authorization: `Bearer ${config.token.trim()}` }
    : { "Content-Type": "application/json", apikey: config.token.trim() };
}

async function parse(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function providerError(provider: string, response: Response, payload: Record<string, unknown>) {
  return String(payload.message ?? payload.error ?? payload.response ?? `${provider} retornou HTTP ${response.status}.`);
}

export const checkWhatsappConnection = createServerFn({ method: "POST" }).validator(ConfigSchema).handler(async ({ data }) => {
  let response: Response;
  if (data.provider === "z-api") {
    response = await fetch(`${zapiUrl(data)}/status`, { headers: headers(data), signal: AbortSignal.timeout(8000) });
  } else if (data.provider === "w-api") {
    response = await fetch(`${providerBaseUrl(data)}/instance/status-instance?instanceId=${encodeURIComponent(data.instanceId.trim())}`, { headers: headers(data), signal: AbortSignal.timeout(8000) });
  } else {
    response = await fetch(`${providerBaseUrl(data)}/instance/connectionState/${encodeURIComponent(data.instanceId.trim())}`, { headers: headers(data), signal: AbortSignal.timeout(8000) });
  }
  const payload = await parse(response);
  if (!response.ok) throw new Error(providerError(data.provider, response, payload));
  if (data.provider === "evolution") {
    const state = String(payload.state ?? (payload.instance as Record<string, unknown> | undefined)?.state ?? "").toLowerCase();
    return { connected: state === "open" || state === "connected", phoneNumber: null };
  }
  if (data.provider === "w-api") {
    const connected = Boolean(payload.connected ?? payload.isConnected);
    let phoneNumber = String(payload.connectedPhone ?? payload.phoneNumber ?? payload.phone ?? "") || null;
    if (connected && !phoneNumber) {
      const deviceResponse = await fetch(`${providerBaseUrl(data)}/instance/device?instanceId=${encodeURIComponent(data.instanceId.trim())}`, { headers: headers(data), signal: AbortSignal.timeout(8000) });
      if (deviceResponse.ok) {
        const device = await parse(deviceResponse);
        phoneNumber = String(device.connectedPhone ?? device.phoneNumber ?? "") || null;
      }
    }
    return { connected, phoneNumber };
  }
  return { connected: Boolean(payload.connected ?? payload.value), phoneNumber: String(payload.phoneNumber ?? payload.phone ?? "") || null };
});

export const sendWhatsappText = createServerFn({ method: "POST" }).validator(SendSchema).handler(async ({ data }) => {
  const phone = data.phone.replace(/\D/g, "");
  let url: string;
  let body: Record<string, unknown>;
  if (data.provider === "z-api") {
    url = `${zapiUrl(data)}/send-text`;
    body = { phone, message: data.body };
  } else if (data.provider === "w-api") {
    url = `${providerBaseUrl(data)}/message/send-text?instanceId=${encodeURIComponent(data.instanceId.trim())}`;
    body = { phone, message: data.body };
  } else {
    url = `${providerBaseUrl(data)}/message/sendText/${encodeURIComponent(data.instanceId.trim())}`;
    body = { number: phone, text: data.body };
  }
  const response = await fetch(url, { method: "POST", headers: headers(data), body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const payload = await parse(response);
  if (!response.ok) throw new Error(providerError(data.provider, response, payload));
  return { providerMessageId: String(payload.zaapId ?? payload.messageId ?? payload.insertedId ?? payload.key?.id ?? payload.id ?? "") || null };
});
