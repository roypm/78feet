"use client";

import { ErrorState } from "@/components/common/feedback/error-state";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <ErrorState reset={reset} standalone />
    </main>
  );
}
