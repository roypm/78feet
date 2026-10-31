"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type InvalidEvent } from "react";
import { ImageIcon, UploadIcon, XIcon } from "lucide-react";
import { ResourceImage } from "@/components/feedback/resource-image";
import { Field } from "@/components/staff/field";
import { Button } from "@/components/ui/button";
import { CLASS_IMAGE_ACCEPT, classImageFileError } from "@/lib/box/image-upload";

type Selection = {
  file: File;
  url?: string;
  status: "checking" | "ready" | "error";
  error?: string;
};

function formatFileSize(bytes: number): string {
  const megabytes = bytes >= 1024 * 1024;
  const value = bytes / (megabytes ? 1024 * 1024 : 1024);
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)} ${megabytes ? "MB" : "KB"}`;
}

export function ImageUploadField({ label = "Imagen", name = "image", currentImageUrl, required = false, disabled = false }: {
  label?: string;
  name?: string;
  currentImageUrl?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showError, setShowError] = useState(false);
  const previewUrl = selection?.status !== "error" ? selection?.url : undefined;
  const checking = selection?.status === "checking";
  const validationError = selection?.status === "error" ? selection.error ?? "No se pudo leer la imagen."
    : checking ? "Esperá a que termine de cargar la vista previa."
    : required && !selection ? "Seleccioná una imagen." : "";
  const error = selection?.status === "error" || showError ? validationError : "";

  useEffect(() => { inputRef.current?.setCustomValidity(validationError); }, [validationError]);

  useEffect(() => {
    const url = selection?.url;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [selection?.url]);

  useEffect(() => {
    const form = inputRef.current?.form;
    function reset() { setSelection(null); setShowError(false); }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setShowError(false);
    if (!file) { setSelection(null); return; }
    const error = classImageFileError(file);
    setSelection(error ? { file, status: "error", error } : { file, url: URL.createObjectURL(file), status: "checking" });
  }

  function finishPreview(url: string, failed = false) {
    setSelection((current) => current?.url === url ? {
      ...current,
      status: failed ? "error" : "ready",
      error: failed ? "No se pudo leer esta imagen. Elegí otro archivo." : undefined,
    } : current);
  }

  function clearSelection() {
    if (inputRef.current) inputRef.current.value = "";
    setSelection(null);
    setShowError(false);
    triggerRef.current?.focus();
  }

  function onInvalid(event: InvalidEvent<HTMLInputElement>) {
    event.preventDefault();
    setShowError(true);
    if (event.currentTarget.form?.querySelector("input:invalid") === event.currentTarget) triggerRef.current?.focus();
  }

  return (
    <Field label={label} htmlFor={id} invalid={Boolean(error)} disabled={disabled}>
      <input
        ref={inputRef} id={id} type="file" name={name} accept={CLASS_IMAGE_ACCEPT} required={required} disabled={disabled}
        tabIndex={-1} className="sr-only" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        aria-invalid={Boolean(error)} onChange={onChange} onInvalid={onInvalid}
      />
      <div data-slot="image-upload-field" className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-start gap-3 rounded-lg border border-input bg-card p-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
        <div aria-busy={checking} className="flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {previewUrl ? (
            // A local object URL is previewed without uploading or cropping the image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Vista previa de la imagen seleccionada" className="size-full object-contain"
              onLoad={() => finishPreview(previewUrl)} onError={() => finishPreview(previewUrl, true)} />
          ) : currentImageUrl ? (
            <ResourceImage src={currentImageUrl} alt="Imagen actual del tipo de clase" className="size-full object-contain" />
          ) : <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="min-w-0" aria-live="polite">
            <p className="line-clamp-2 break-all text-sm font-medium" title={selection?.file.name}>
              {selection?.file.name ?? (currentImageUrl ? "Imagen actual" : "Sin imagen seleccionada")}
            </p>
            {selection && <p className="text-xs text-muted-foreground">{formatFileSize(selection.file.size)}</p>}
            {checking && <p className="text-xs text-muted-foreground" role="status">Cargando vista previa…</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button ref={triggerRef} type="button" variant="outline" className="min-h-11 sm:min-h-8" disabled={disabled}
              aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} aria-invalid={Boolean(error)}
              onClick={() => inputRef.current?.click()}>
              <UploadIcon data-icon="inline-start" />
              {selection || currentImageUrl ? "Cambiar imagen" : "Elegir imagen"}
            </Button>
            {selection && <Button type="button" variant="ghost" className="min-h-11 sm:min-h-8" disabled={disabled}
              aria-label="Descartar imagen seleccionada" onClick={clearSelection}>
              <XIcon data-icon="inline-start" />Descartar
            </Button>}
          </div>
        </div>
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        JPEG, PNG o WebP. Máximo 5 MB.{required ? " Obligatoria para crear el tipo." : ""}{currentImageUrl ? " Sin otra selección se conserva la imagen actual." : ""}
      </p>
      {error && <p id={`${id}-error`} className="text-sm text-destructive" role="alert">{error}</p>}
    </Field>
  );
}
