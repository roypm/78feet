import { ResourceImage } from "@/components/feedback/resource-image";
import { cn } from "cn";

export function ClassTypeThumb({
  imageUrl,
  className,
}: {
  imageUrl: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return <ResourceImage src={imageUrl} alt="" className={cn("object-cover", className)} />;
  }
  return <span className={cn("block bg-muted", className)} aria-hidden />;
}
