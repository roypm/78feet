"use client";

import { ErrorState } from "@/components/common/feedback/error-state";

export default function Error({ reset }: { reset: () => void }) {
  return <ErrorState reset={reset} home="/staff/hoy" />;
}
