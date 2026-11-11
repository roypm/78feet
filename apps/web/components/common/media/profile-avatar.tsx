"use client";

import { useState } from "react";
import { cn } from "cn";

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-20 text-2xl",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts.at(-1) ?? "")[0] ?? "" : "";
  return `${first}${last}`.toLocaleUpperCase();
}

export function ProfileAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: {
  name: string;
  imageUrl: string | null | undefined;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-border",
        sizeClasses[size],
        className,
      )}
    >
      {showImage ? (
        // The avatar is private and served by the app's authenticated image route.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl!} alt="" className="size-full object-cover" onError={() => setFailedUrl(imageUrl!)} />
      ) : (
        initials(name) || "?"
      )}
    </span>
  );
}
