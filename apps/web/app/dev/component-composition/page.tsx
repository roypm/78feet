import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CompositionPreview } from "./preview";

async function Preview({ searchParams }: { searchParams: Promise<{ data?: string; pagina?: string }> }) {
  const { data, pagina } = await searchParams;
  return <CompositionPreview initialMode={data ?? "demo"} initialPage={pageNumber(pagina)} />;
}

export default function Page(props: { searchParams: Promise<{ data?: string; pagina?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <Suspense fallback={null}>
      <Preview {...props} />
    </Suspense>
  );
}
