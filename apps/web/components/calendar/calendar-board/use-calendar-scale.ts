"use client";

import { useSyncExternalStore } from "react";
import { PX_PER_HOUR, PX_PER_HOUR_LARGE, PX_PER_HOUR_MEDIUM } from "@/lib/box/column";

const DENSITY_KEY = "78feet.calendario.densidad";
const DENSITY_CHANGE_EVENT = "78feet:calendario-densidad";
const DESKTOP_QUERY = "(min-width: 768px)";
type Density = "pequeno" | "mediano" | "grande";
const PX_BY_DENSITY: Record<Density, number> = {
  pequeno: PX_PER_HOUR,
  mediano: PX_PER_HOUR_MEDIUM,
  grande: PX_PER_HOUR_LARGE,
};

function subscribeDesktop(callback: () => void): () => void {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function subscribeDensity(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(DENSITY_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DENSITY_CHANGE_EVENT, callback);
  };
}

function getDensitySnapshot(): Density {
  const stored = window.localStorage.getItem(DENSITY_KEY);
  return stored === "mediano" || stored === "grande" ? stored : "pequeno";
}

function saveDensity(next: Density): void {
  window.localStorage.setItem(DENSITY_KEY, next);
  window.dispatchEvent(new Event(DENSITY_CHANGE_EVENT));
}

export function useCalendarScale(): {
  desktop: boolean;
  density: Density;
  choose: (next: Density) => void;
  pxPerHour: number;
} {
  const desktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false);
  const density = useSyncExternalStore<Density>(subscribeDensity, getDensitySnapshot, () => "pequeno");

  function choose(next: Density) {
    saveDensity(next);
  }

  return {
    desktop,
    density,
    choose,
    pxPerHour: desktop ? PX_BY_DENSITY[density] : PX_PER_HOUR,
  };
}
