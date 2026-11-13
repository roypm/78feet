import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@78feet/contracts";
import { createStaffSchema } from "@78feet/domain";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/common/forms/form-actions";
import { FormInput } from "@/components/common/forms/form-control";
import { FormSelect } from "@/components/common/forms/form-select";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { api } from "@/lib/box/api";

const staffFormSchema = createStaffSchema.extend({
  role: z.string().refine((value): value is "coach" | "admin" => value === "coach" || value === "admin", "Elegí un rol"),
  phone: z.string().trim(),
  email: z.string().trim().min(1, "El correo es obligatorio").email("Email inválido"),
});

export function StaffForm() {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(staffFormSchema),
    defaultValues: { loginId: "", password: "", firstName: "", lastName: "", role: "", dni: "", phone: "", email: "" },
  });

  async function onSubmit(values: z.infer<typeof staffFormSchema>) {
    if (!begin()) return;
    try {
      await api("/api/v1/admin/staff", {
        method: "POST",
        body: JSON.stringify({ ...values, phone: values.phone || null }),
      });
      toast.success("Cuenta creada");
      form.reset();
      setOpen(false);
      void router.refresh("staff");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      trigger={<Button type="button" variant="outline" className="min-h-11">Añadir cuenta</Button>}
      open={open}
      onOpenChange={setOpen}
      busy={pending}
      title="Nueva cuenta de staff"
      description="Creá un acceso para una persona del equipo."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" autoComplete="off" error={form.formState.errors.firstName?.message} {...form.register("firstName")} />
          <FormInput label="Apellidos" autoComplete="off" error={form.formState.errors.lastName?.message} {...form.register("lastName")} />
          <FormInput label="Usuario" autoComplete="off" error={form.formState.errors.loginId?.message} {...form.register("loginId")} />
          <FormInput label="Contraseña" type="password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register("password")} />
          <FormSelect
            label="Rol"
            required
            disabled={pending}
            value={form.watch("role")}
            onValueChange={(value) => form.setValue("role", value, { shouldValidate: true })}
            error={form.formState.errors.role?.message}
            options={[
              { value: "", label: "Elegí un rol…" },
              { value: "coach", label: "Coach" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <FormInput label="DNI" autoComplete="off" error={form.formState.errors.dni?.message} {...form.register("dni")} />
          <FormInput label="Teléfono (opcional)" type="tel" autoComplete="tel" error={form.formState.errors.phone?.message} {...form.register("phone")} />
          <FormInput label="Correo" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register("email")} />
          <FormActions pending={pending} onCancel={() => setOpen(false)} submitLabel="Crear cuenta" pendingLabel="Creando…" />
        </fieldset>
      </form>
    </FormDialog>
  );
}
