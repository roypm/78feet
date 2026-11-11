"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { nextNewTrainingVisit } from "@/lib/ui/new-training-visit";

const NewTrainingVisitContext = createContext(0);

export function NewTrainingVisitProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const visit = useRef(0);
  if (previousPath.current !== pathname) {
    visit.current = nextNewTrainingVisit(previousPath.current, pathname, visit.current);
    previousPath.current = pathname;
  }
  return <NewTrainingVisitContext.Provider value={visit.current}>{children}</NewTrainingVisitContext.Provider>;
}

export function useNewTrainingVisit() {
  return useContext(NewTrainingVisitContext);
}
