import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createApiClient } from "@78feet/api-client";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PendingButton } from "@/components/common/feedback/pending-button";
import { ProfileAvatar } from "@/components/common/media/profile-avatar";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  PROFILE_IMAGE_ACCEPT,
  profileImageFileError,
} from "@/lib/box/profile-image-upload";

export function ProfilePhotoEditor({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { router, pending, begin, setPending } = useActionFeedback();
  const [localImage, setLocalImage] = useState({
    source: imageUrl,
    value: imageUrl,
  });
  const currentImageUrl =
    localImage.source === imageUrl ? localImage.value : imageUrl;
  const setCurrentImageUrl = (value: string | null) =>
    setLocalImage({ source: imageUrl, value });
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setError("");
    if (!file) return;
    const validationError = profileImageFileError(file);
    if (validationError) {
      setPreview(null);
      setError(validationError);
      event.currentTarget.value = "";
      return;
    }
    setPreview({ file, url: URL.createObjectURL(file) });
  }

  async function uploadPhoto() {
    if (!preview || !begin()) return;
    try {
      const { data: body } = await createApiClient().POST(
        "/api/v1/me/profile-image",
        { body: { image: preview.file } },
      );
      if (!body?.imageUrl) throw new Error("No se pudo guardar la foto.");
      setCurrentImageUrl(body.imageUrl);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      setError("");
      toast.success("Foto de perfil actualizada");
      router.refresh("session");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo guardar la foto.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function removePhoto() {
    if (!begin()) return;
    try {
      await createApiClient().DELETE("/api/v1/me/profile-image");
      setCurrentImageUrl(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      setError("");
      toast.success("Foto de perfil quitada");
      router.refresh("session");
    } catch (removeError) {
      const message =
        removeError instanceof Error
          ? removeError.message
          : "No se pudo quitar la foto.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const displayedImageUrl = preview?.url ?? currentImageUrl;

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
      <ProfileAvatar name={name} imageUrl={displayedImageUrl} size="lg" />
      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <h2 className="font-medium">Foto de perfil</h2>
          <p className="text-sm text-muted-foreground">
            Se muestra recortada al centro en el roster de las clases.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={PROFILE_IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label="Elegir foto de perfil"
          disabled={pending}
          onChange={chooseFile}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              inputRef.current?.click();
            }}
          >
            <ImagePlus data-icon="inline-start" />
            {currentImageUrl || preview ? "Cambiar foto" : "Elegir foto"}
          </Button>
          {preview ? (
            <PendingButton
              type="button"
              className="min-h-11"
              pending={pending}
              pendingLabel="Subiendo…"
              disabled={pending}
              onClick={() => void uploadPhoto()}
            >
              Guardar foto
            </PendingButton>
          ) : null}
          {currentImageUrl && !preview ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={pending}
              onClick={() => void removePhoto()}
            >
              <Trash2 data-icon="inline-start" />
              Quitar foto
            </Button>
          ) : null}
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={pending}
              onClick={() => setPreview(null)}
            >
              Descartar
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG o WebP · máximo 5 MB.
        </p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
