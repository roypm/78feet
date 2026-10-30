"use client";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { ApiError } from "@/lib/box/api";
import { patchInstance, instanceEditFromForm, type InstanceEdit } from "@/lib/box/instance-mutations";

export function useInstanceEdit(instanceId: string, onSaved?: () => void) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [capacityConfirmation, setCapacityConfirmation] = useState<{
    body: InstanceEdit;
    message: string;
  } | null>(null);

  async function send(body: InstanceEdit, confirmCapacity = false) {
    if (!begin()) return;
    try {
      const payload = await patchInstance(instanceId, body, confirmCapacity);
      setCapacityConfirmation(null);
      if (payload.cancelledBookingCount > 0) {
        toast.success(`Guardado. ${payload.cancelledBookingCount} reservas canceladas.`);
      } else {
        toast.success("Clase actualizada");
      }
      router.refresh();
      onSaved?.();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        setCapacityConfirmation({ body, message: error.message });
        return;
      }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await send(instanceEditFromForm(form));
  }

  function confirmCapacityChange() {
    if (!capacityConfirmation) return;
    const { body } = capacityConfirmation;
    void send(body, true);
  }

  return { pending, capacityConfirmation, setCapacityConfirmation, onSubmit, confirmCapacityChange };
}
