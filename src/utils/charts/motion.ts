/**
 * Regras de movimento: a duração das transições do D3 é sempre resolvida
 * aqui, para que `prefers-reduced-motion` tenha um único ponto de controle.
 */

export const DEFAULT_TRANSITION_DURATION = 640;

/**
 * Retorna `0` quando o usuário pede menos movimento — o D3 aplica o estado
 * final imediatamente, sem animação.
 */
export const resolveTransitionDuration = (
  duration: number,
  prefersReducedMotion: boolean,
): number => (prefersReducedMotion ? 0 : duration);
