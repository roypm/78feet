"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "cn";

export function ResourceImage({ src, className, alt = "", ...props }: ComponentProps<"img">) {
  const [failedSource, setFailedSource] = useState<string>();
  // The local fallback never retries itself if it is unavailable.
  const failed = failedSource === src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      src={failed ? "/uploads/class-types/placeholder.png" : src}
      onError={failed ? undefined : () => setFailedSource(String(src))}
      className={cn("bg-muted", className)}
    />
  );
}
