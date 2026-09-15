import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, MessageCircle, PlugZap, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getConnectionStatus, getWhatsappConfig, saveWhatsappConfig, testWhatsappConnection, type WhatsappConfig } from "@/services/whatsappService";

export function WhatsappConnectionCard() {
  const [config, setConfig] = useState<WhatsappConfig>({ provider: "z-api", instanceId: "", token: "", clientToken: "" });
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

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

  async function connect() {
    if (!config.instanceId.trim() || !config.token.trim()) {
      toast.error("Informe o ID da instância e o token da Z-API.");
      return;
    }
    setSaving(true);
    try {
      saveWhatsappConfig(config);
      await testWhatsappConnection(config);
      setConnected(true);
      const status = await getConnectionStatus();
      setPhoneNumber(status.phoneNumber);
      toast.success("WhatsApp conectado com sucesso.");
    } catch (error) {
      setConnected(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível conectar o WhatsApp.");
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
      toast.success("Conexão com a Z-API validada.");
    } catch (error) {
      setConnected(false);
      toast.error(error instanceof Error ? error.message : "A conexão não foi validada.");
    } finally {
      setTesting(false);
    }
  }

  function disconnect() {
    saveWhatsappConfig({ provider: "z-api", instanceId: "", token: "", clientToken: "" });
    setConfig({ provider: "z-api", instanceId: "", token: "", clientToken: "" });
    setConnected(false);
    setPhoneNumber(null);
    toast.success("WhatsApp desconectado do painel.");
  }

  const update = (key: keyof WhatsappConfig, value: string) => setConfig((current) => ({ ...current, [key]: value }));

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
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Configure a Z-API aqui mesmo. Depois de conectado, o botão de envio do CRM passa a enviar a mensagem pelo seu WhatsApp.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Provedor</Label><div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-medium">Z-API</div></div>
          <div className="space-y-2"><Label htmlFor="zapi-instance">ID da instância</Label><Input id="zapi-instance" value={config.instanceId} onChange={(e) => update("instanceId", e.target.value)} placeholder="Ex.: 3E8A..." autoComplete="off" /></div>
          <SecretField id="zapi-token" label="Token da instância" value={config.token} show={showToken} onToggle={() => setShowToken((value) => !value)} onChange={(value) => update("token", value)} placeholder="Token da Z-API" />
          <SecretField id="zapi-client-token" label="Client-Token (opcional)" value={config.clientToken} show={showClientToken} onToggle={() => setShowClientToken((value) => !value)} onChange={(value) => update("clientToken", value)} placeholder="Client-Token da conta" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void connect()} disabled={saving || testing}>{saving ? <Loader2 className="animate-spin" /> : <PlugZap />}{saving ? "Conectando..." : "Conectar WhatsApp"}</Button>
          <Button variant="outline" onClick={() => void test()} disabled={testing || !config.instanceId || !config.token}>{testing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{testing ? "Testando..." : "Testar conexão"}</Button>
          {connected && <Button variant="ghost" onClick={disconnect}><Unplug />Desconectar</Button>}
        </div>
        <p className="text-xs text-muted-foreground">As credenciais ficam salvas neste navegador nesta versão do MVP. Para produção multiusuário, o ideal é migrar esses segredos para uma função server-side protegida.</p>
      </CardContent>
    </Card>
  );
}

function SecretField({ id, label, value, show, onToggle, onChange, placeholder }: { id: string; label: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void; placeholder: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="pr-10" /><button type="button" aria-label={show ? `Ocultar ${label}` : `Mostrar ${label}`} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground" onClick={onToggle}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>;
}
