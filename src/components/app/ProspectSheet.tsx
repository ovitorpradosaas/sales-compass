import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScoreBadge } from "@/components/app/ScoreBadge";
import { useActivities, useInvalidate, useProspectTags, useStages, useTags } from "@/lib/queries";
import type { Prospect } from "@/lib/types";

export interface ProspectSheetProps {
  prospect: Prospect | null;
  onOpenChange: (open: boolean) => void;
}

/** Ficha detalhada do prospect: empresa, contato, qualificação e timeline. */
export function ProspectSheet({ prospect, onOpenChange }: ProspectSheetProps) {
  const invalidate = useInvalidate();
  const { data: activities = [] } = useActivities(prospect?.id);
  const { data: stages = [] } = useStages();
  const { data: tags = [] } = useTags();
  const { data: links = [] } = useProspectTags();
  const [form, setForm] = useState<Partial<Prospect>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(prospect ?? {});
  }, [prospect]);

  if (!prospect) return null;

  const stage = stages.find((s) => s.id === prospect.stage_id);
  const prospectTagIds = links.filter((l) => l.prospect_id === prospect.id).map((l) => l.tag_id);

  function set<K extends keyof Prospect>(key: K, value: Prospect[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("prospects")
      .update({
        company: form.company ?? prospect.company,
        niche: form.niche ?? null,
        city: form.city ?? null,
        state: form.state ?? null,
        website: form.website ?? null,
        instagram: form.instagram ?? null,
        contact_name: form.contact_name ?? null,
        contact_role: form.contact_role ?? null,
        whatsapp: form.whatsapp ?? null,
        phone: form.phone ?? null,
        email: form.email ?? null,
        potential: form.potential ?? null,
        notes: form.notes ?? null,
        next_action: form.next_action ?? null,
        next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
      })
      .eq("id", prospect.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    invalidate(["prospects", "activities"]);
    toast.success("Ficha atualizada.");
  }

  async function toggleTag(tagId: string, active: boolean) {
    if (active) {
      await supabase.from("prospect_tags").delete().eq("prospect_id", prospect.id).eq("tag_id", tagId);
    } else {
      await supabase.from("prospect_tags").insert({ prospect_id: prospect.id, tag_id: tagId });
    }
    invalidate(["prospect_tags"]);
  }

  const localDateTime = form.next_action_at
    ? new Date(form.next_action_at).toISOString().slice(0, 16)
    : "";

  return (
    <Sheet open={Boolean(prospect)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {prospect.company}
            <ScoreBadge score={prospect.icp_score} />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Empresa</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome" value={form.company ?? ""} onChange={(v) => set("company", v)} />
              <Field label="Nicho" value={form.niche ?? ""} onChange={(v) => set("niche", v)} />
              <Field label="Cidade" value={form.city ?? ""} onChange={(v) => set("city", v)} />
              <Field label="Estado" value={form.state ?? ""} onChange={(v) => set("state", v)} />
              <Field label="Site" value={form.website ?? ""} onChange={(v) => set("website", v)} />
              <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => set("instagram", v)} />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Contato</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome" value={form.contact_name ?? ""} onChange={(v) => set("contact_name", v)} />
              <Field label="Cargo" value={form.contact_role ?? ""} onChange={(v) => set("contact_role", v)} />
              <Field label="WhatsApp" value={form.whatsapp ?? ""} onChange={(v) => set("whatsapp", v)} />
              <Field label="Telefone" value={form.phone ?? ""} onChange={(v) => set("phone", v)} />
              <Field label="E-mail" value={form.email ?? ""} onChange={(v) => set("email", v)} />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Qualificação</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Etapa: {stage?.name ?? "sem etapa"}</span>
              <span>·</span>
              <span>Status: {prospect.status}</span>
            </div>
            <Field label="Potencial" value={form.potential ?? ""} onChange={(v) => set("potential", v)} />
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const active = prospectTagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void toggleTag(t.id, active)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Badge variant={active ? "default" : "outline"}>{t.name}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Próxima ação</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="O que fazer"
                value={form.next_action ?? ""}
                onChange={(v) => set("next_action", v)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="next_at">Data e hora</Label>
                <Input
                  id="next_at"
                  type="datetime-local"
                  value={localDateTime}
                  onChange={(e) => set("next_action_at", e.target.value || null)}
                />
              </div>
            </div>
          </section>

          <div className="flex gap-2">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar ficha"}
            </Button>
            <Button asChild variant="outline">
              <Link to="/whatsapp">Abrir conversa</Link>
            </Button>
          </div>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Atividades</h3>
            {activities.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
            )}
            <ol className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">{a.type.replace(/_/g, " ")}</p>
                    {a.description && (
                      <p className="text-sm text-muted-foreground">{a.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
