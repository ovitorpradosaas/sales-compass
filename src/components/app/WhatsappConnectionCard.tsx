import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, MessageCircle, PlugZap, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConnectionStatus, getWhatsappConfig, saveWhatsappConfig, testWhatsappConnection, type WhatsappConfig, type WhatsappProviderId } from "@/services/whatsappService";

const providerLabels: Record<WhatsappProviderId, string> = {
  "z-api": "Z-API",
  "w-api": "W-API",
  evolution: "Evolution API",
};

export function WhatsappConnectionCard() {
  const [config, setConfig] = useState<WhatsappConfig>({ provider: "z-api", instanceId: "", token: "", clientToken: "", baseUrl: "" });
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const providerLabel = useMemo(() => providerLabels[config.provider], [config.provider]);

  useEffect(() => {
    setConfig(getWhatsappConfig());
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    try {
      const status = await getConnectionStatus();
      setConnected(status.connected);
      setPhoneNumber(status.phoneNumber);
    } catch {
      setConnected(false);
      setPhoneNumber(null);
    }
  }

  function changeProvider(provider: WhatsappProviderId) {
    setConfig((current) => ({ ...current, provider }));
    setConnected(false);
    setPhoneNumber(null);
  }

  async function connect() {
    if (!config.instanceId.trim() || !config.token.trim()) {
      toast.error(`Informe o ID da instância e o token da ${providerLabel}.`);
      return;
    }
    if (config.provider === "evolution" && !config.baseUrl.trim()) {
      toast.error("Informe a URL da sua Evolution API.");
      return;
    }
    setSaving(true);
    try {
      saveWhatsappConfig(config);
      await testWhatsappConnection(config);
      setConnected(true);
      const status = await getConnectionStatus();
      setPhoneNumber(status.phoneNumber);
      toast.success(`${providerLabel} conectado com sucesso.`);
    } catch (error) {
      setConnected(false);
      toast.error(error instanceof Error ? error.message : `Não foi possível conectar o ${providerLabel}.`);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      await testWhatsappConnection(config);
      setConnected(true);
      const status = await getConnectionStatus();
      setPhoneNumber(status.phoneNumber);
      toast.success(`Conexão com ${providerLabel} validada.`);
    } catch (error) {
      setConnected(false);
      toast.error(error instanceof Error ? error.message : "A conexão não foi validada.");
    } finally {
      setTesting(false);
    }
  }

  function disconnect() {
    const next = { provider: config.provider, instanceId: "", token: "", clientToken: "", baseUrl: config.baseUrl } as WhatsappConfig;
    saveWhatsappConfig(next);
    setConfig(next);
    setConnected(false);
    setPhoneNumber(null);
    toast.success("WhatsApp desconectado do painel.");
  }

  const update = (key: keyof WhatsappConfig, value: string) => setConfig((current) => ({ ...current, [key]: value }));

  const instancePlaceholder = config.provider === "evolution" ? "Ex.: minha-instancia" : "Ex.: 3E8A...";
  const tokenLabel = config.provider === "evolution" ? "API Key" : "Token";

  return (
    <Card className="glass rounded-2xl xl:col-span-2">
      <CardHeader className="border-b border-border/70 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm"><MessageCircle className="size-4 text-primary" />WhatsApp</CardTitle>
          <Badge variant="outline" className={`rounded-full ${connected ? "border-primary/30 bg-primary/10 text-primary" : ""}`}>
            {connected ? <><CheckCircle2 className="mr-1.5 size-3" />Conectado{phoneNumber ? ` · ${phoneNumber}` : ""}</> : <><Unplug className="mr-1.5 size-3" />Não conectado</>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-semibold">Conectar seu WhatsApp</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha o provedor que você já utiliza e configure a instância aqui mesmo. O CRM usa o mesmo canal para testar a conexão e enviar mensagens.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Provedor</Label><Select value={config.provider} onValueChange={(value) => changeProvider(value as WhatsappProviderId)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="z-api">Z-API</SelectItem><SelectItem value="w-api">W-API</SelectItem><SelectItem value="evolution">Evolution API</SelectItem></SelectContent></Select></div>
          {config.provider === "evolution" && <div className="space-y-2"><Label htmlFor="evolution-base-url">URL da Evolution API</Label><Input id="evolution-base-url" value={config.baseUrl} onChange={(e) => update("baseUrl", e.target.value)} placeholder="https://sua-evolution.com" autoComplete="off" /></div>}
          <div className="space-y-2"><Label htmlFor="whatsapp-instance">ID da instância</Label><Input id="whatsapp-instance" value={config.instanceId} onChange={(e) => update("instanceId", e.target.value)} placeholder={instancePlaceholder} autoComplete="off" /></div>
          <SecretField id="whatsapp-token" label={tokenLabel} value={config.token} show={showToken} onToggle={() => setShowToken((value) => !value)} onChange={(value) => update("token", value)} placeholder={`Token / chave da ${providerLabel}`} />
          {config.provider === "z-api" && <SecretField id="whatsapp-client-token" label="Client-Token (opcional)" value={config.clientToken} show={showClientToken} onToggle={() => setShowClientToken((value) => !value)} onChange={(value) => update("clientToken", value)} placeholder="Client-Token da conta" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void connect()} disabled={saving || testing}>{saving ? <Loader2 className="animate-spin" /> : <PlugZap />}{saving ? "Conectando..." : "Conectar WhatsApp"}</Button>
          <Button variant="outline" onClick={() => void test()} disabled={testing || !config.instanceId || !config.token || (config.provider === "evolution" && !config.baseUrl)}>{testing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{testing ? "Testando..." : "Testar conexão"}</Button>
          {connected && <Button variant="ghost" onClick={disconnect}><Unplug />Desconectar</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Provedores disponíveis: Z-API, W-API e Evolution API. As credenciais ficam salvas neste navegador nesta versão do MVP.</p>
      </CardContent>
    </Card>
  );
}

function SecretField({ id, label, value, show, onToggle, onChange, placeholder }: { id: string; label: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void; placeholder: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="pr-10" /><button type="button" aria-label={show ? `Ocultar ${label}` : `Mostrar ${label}`} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground" onClick={onToggle}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>;
}
