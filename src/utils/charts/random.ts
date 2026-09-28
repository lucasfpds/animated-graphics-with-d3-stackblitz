/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 *
 * Determinismo é requisito do projeto: a mesma seed precisa produzir a mesma
 * série no servidor, no cliente e nos testes — caso contrário haveria mismatch
 * de hidratação e testes instáveis.
 */

export type RandomSource = () => number;

export const mulberry32 = (seed: number): RandomSource => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Número real em `[min, max)`. */
export const randomBetween = (
  random: RandomSource,
  min: number,
  max: number,
): number => min + random() * (max - min);

/** Inteiro em `[min, max]` (inclusivo nas duas pontas). */
export const randomIntBetween = (
  random: RandomSource,
  min: number,
  max: number,
): number => Math.floor(randomBetween(random, min, max + 1));

/** Escolhe um item de uma lista não vazia. */
export const pickOne = <T,>(random: RandomSource, items: readonly T[]): T => {
  if (items.length === 0) {
    throw new Error("pickOne precisa de uma lista com ao menos um item");
  }

  return items[randomIntBetween(random, 0, items.length - 1)];
};
