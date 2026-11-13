import { useSearchParams } from "react-router";
import { MembersPreview } from "./preview";

export default function Page() {
  if (process.env.NODE_ENV !== "development") throw new Error("NOT_FOUND");
  const [params] = useSearchParams();
  return <MembersPreview initialMode={params.get("data") ?? undefined} />;
}
