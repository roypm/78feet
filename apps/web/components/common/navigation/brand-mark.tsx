import Image from "next/image";
import { cn } from "cn";

/** Visible brand copy lives in the PNG; link label for screen readers. */
export const brandHomeLabel = "77 FEET, ir al inicio";

type BrandMarkProps = {
  variant?: "sidebar" | "sidebar-icon" | "login";
  className?: string;
};

export function BrandMark({ variant = "sidebar", className }: BrandMarkProps) {
  if (variant === "sidebar-icon") {
    return (
      <Image
        src="/brand/mark-icon-square.png"
        alt=""
        width={32}
        height={32}
        className={cn("size-8 shrink-0 object-contain", className)}
        priority
      />
    );
  }

  return (
    <Image
      src="/brand/mark-full-color.png"
      alt=""
      width={variant === "login" ? 160 : 132}
      height={variant === "login" ? 64 : 52}
      className={cn(
        "h-9 w-auto max-w-[8.25rem] shrink-0 object-contain object-left",
        variant === "login" && "h-14 max-w-[10rem]",
        className,
      )}
      priority
    />
  );
}
