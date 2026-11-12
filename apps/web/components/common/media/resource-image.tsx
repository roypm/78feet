"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "cn";

export function ResourceImage({ src, className, alt = "", style, width, height, ...props }: ComponentProps<"img">) {
  const [failedSource, setFailedSource] = useState<string>();
  if (!src || failedSource === src) {
    return <span role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={!alt || undefined}
      className={cn("block bg-muted", className)} style={{ width, height, ...style }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} src={src} alt={alt} width={width} height={height} style={style}
      onError={() => setFailedSource(String(src))} className={cn("bg-muted", className)} />
  );
}
