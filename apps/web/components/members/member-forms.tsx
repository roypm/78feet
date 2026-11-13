import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@78feet/contracts";
import { createMemberSchema } from "@78feet/domain";
import { FormActions } from "@/components/common/forms/form-actions";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/common/forms/form-control";
import { FormSelect } from "@/components/common/forms/form-select";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import type { BoxSummary } from "@/lib/box/boxes";

const memberFormSchema = createMemberSchema.extend({
  tariffId: z.string().uuid("Elegí una tarifa"),
  paymentBoxId: z.string().uuid("Elegí la sede de pago"),
  phone: z.string().trim(),
  email: z.string().trim().min(1, "El correo es obligatorio").email("Email inválido"),
});

type Tariff = { id: string; name: string; active: boolean };

export function CreateMemberAltaButton({
  tariffs,
  boxes,
  canManageTariffs = false,
}: {
  tariffs: Tariff[];
  boxes: readonly BoxSummary[];
  canManageTariffs?: boolean;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const assignable = tariffs.filter((tariff) => tariff.active);
  const form = useForm({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      dni: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      tariffId: "",
      paymentBoxId: boxes[0]?.id ?? "",
    },
  });

  async function onSubmit(values: z.infer<typeof memberFormSchema>) {
    if (!begin()) return;
    try {
      const created = await api<{ id: string }>("/api/v1/admin/members", {
        method: "POST",
        body: JSON.stringify({ ...values, phone: values.phone || null }),
      });
      toast.success("Socio creado");
      setOpen(false);
      void router.push(`/staff/socios/${created.id}`);
      void router.refresh("member");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  if (assignable.length === 0) {
    return (
      <EmptyState
        compact
        title="Hace falta una tarifa activa"
        description={
          canManageTariffs
            ? "Creá o activá una tarifa antes de dar de alta a un socio."
            : "Pedile al admin que cree o active una tarifa antes de dar de alta a un socio."
        }
        href={canManageTariffs ? "/staff/tarifas" : undefined}
        action="Ver tarifas"
      />
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      busy={pending}
      wide
      trigger={
        <Button type="button" variant="outline" className="min-h-11">
          Alta de socio
        </Button>
      }
      title="Alta de socio"
      description="Datos del socio y tarifa inicial."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" autoComplete="given-name" error={form.formState.errors.firstName?.message} {...form.register("firstName")} />
          <FormInput label="Apellidos" autoComplete="family-name" error={form.formState.errors.lastName?.message} {...form.register("lastName")} />
          <FormInput label="DNI" error={form.formState.errors.dni?.message} {...form.register("dni")} />
          <FormInput label="Contraseña" type="password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register("password")} />
          <FormInput label="Teléfono" type="tel" autoComplete="tel" error={form.formState.errors.phone?.message} {...form.register("phone")} />
          <FormInput label="Email" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register("email")} />
          <FormSelect
            label="Box de pago"
            required
            disabled={pending}
            value={form.watch("paymentBoxId")}
            onValueChange={(value) => form.setValue("paymentBoxId", value, { shouldValidate: true })}
            error={form.formState.errors.paymentBoxId?.message}
            options={boxes.map((box) => ({ value: box.id, label: box.name }))}
          />
          <FormSelect
            label="Tarifa"
            required
            disabled={pending}
            value={form.watch("tariffId")}
            onValueChange={(value) => form.setValue("tariffId", value, { shouldValidate: true })}
            error={form.formState.errors.tariffId?.message}
            options={[
              { value: "", label: "Elegí una tarifa…" },
              ...assignable.map((tariff) => ({ value: tariff.id, label: tariff.name })),
            ]}
          />
          <FormActions
            pending={pending}
            onCancel={() => setOpen(false)}
            submitLabel="Crear socio"
            pendingLabel="Creando…"
            submitDisabled={assignable.length === 0}
          />
        </fieldset>
      </form>
    </FormDialog>
  );
}
