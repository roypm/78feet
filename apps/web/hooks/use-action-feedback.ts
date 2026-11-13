import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/lib/spa/router";

/** Keeps the action busy until its request finishes and the following navigation starts. */
export function useActionFeedback() {
  const nextRouter = useRouter();
  const [requestPending, setRequestPending] = useState(false);
  const [navigating, startTransition] = useTransition();
  const locked = useRef(false);
  const navigationStarted = useRef(false);
  const pending = requestPending || navigating;

  useEffect(() => {
    if (!pending) {
      locked.current = false;
      navigationStarted.current = false;
    }
  }, [pending]);

  const router = useMemo(
    () => ({
      ...nextRouter,
      push: (...args: Parameters<typeof nextRouter.push>) => {
        navigationStarted.current = true;
        startTransition(() => {
          void nextRouter.push(...args);
        });
      },
      refresh: (scope?: Parameters<typeof nextRouter.refresh>[0]) => {
        navigationStarted.current = true;
        startTransition(() => {
          void nextRouter.refresh(scope);
        });
      },
    }),
    [nextRouter],
  );

  function begin() {
    if (locked.current) return false;
    locked.current = true;
    setRequestPending(true);
    return true;
  }

  function setPending(value: boolean) {
    if (value) locked.current = true;
    else if (!navigationStarted.current) locked.current = false;
    setRequestPending(value);
  }

  return { router, pending, begin, setPending };
}
