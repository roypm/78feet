import { useSearchParams } from "react-router";
import { pageNumber } from "@/lib/box/pagination";
import { CompositionPreview } from "./preview";

export default function Page() {
  if (process.env.NODE_ENV !== "development") throw new Error("NOT_FOUND");
  const [params] = useSearchParams();
  return <CompositionPreview initialMode={params.get("data") ?? "demo"} initialPage={pageNumber(params.get("pagina") ?? undefined)} />;
}
