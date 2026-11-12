import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MembersPreview } from "./preview";

type Props = { searchParams: Promise<{ data?: string }> };
async function Preview({ searchParams }: Props) {
  const { data } = await searchParams;
  return <MembersPreview initialMode={data} />;
}
export default function Page(props: Props) {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Suspense fallback={null}><Preview {...props} /></Suspense>;
}
