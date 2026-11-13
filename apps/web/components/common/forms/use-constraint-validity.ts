import { useEffect, useRef, useState, type InvalidEvent, type RefObject } from "react";
import {
  constraintMessage,
  suppressNativeInvalid,
  type ConstraintControl,
} from "@/lib/ui/field-validity";

export function useConstraintValidity<T extends ConstraintControl>() {
  const ref = useRef<T>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const form = ref.current?.form;
    function reset() {
      setError("");
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  return {
    ref: ref as RefObject<T | null>,
    error,
    invalid: Boolean(error),
    onInvalid(event: InvalidEvent<T>) {
      const first = suppressNativeInvalid(event);
      setError(constraintMessage(event.currentTarget));
      if (first) event.currentTarget.focus();
    },
    onInput(control: T) {
      if (!error) return;
      setError(constraintMessage(control));
    },
    onBlur(control: T) {
      setError(constraintMessage(control));
    },
  };
}
