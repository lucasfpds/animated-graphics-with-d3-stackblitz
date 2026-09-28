"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onStoreChange: () => void): (() => void) => {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

  mediaQuery.addEventListener("change", onStoreChange);

  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
  };
};

const getSnapshot = (): boolean =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** O servidor não conhece a preferência do usuário. */
const getServerSnapshot = (): boolean => false;

/**
 * Informa se o usuário pediu menos movimento.
 *
 * Usa `useSyncExternalStore` para ler a media query como uma fonte externa:
 * sem `setState` dentro de efeito e sem mismatch de hidratação (o servidor e
 * o primeiro render do cliente veem `false`).
 */
export const usePrefersReducedMotion = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

