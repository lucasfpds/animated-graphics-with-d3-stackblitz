import { onMounted, onScopeDispose, ref, type Ref } from "vue";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Informa se o usuário pediu menos movimento.
 *
 * Começa em `false` (o valor assumido antes da montagem) e passa a acompanhar
 * a media query após a montagem, reagindo às mudanças de preferência.
 */
export const usePrefersReducedMotion = (): Ref<boolean> => {
  const prefersReducedMotion = ref(false);

  onMounted(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    prefersReducedMotion.value = mediaQuery.matches;

    const handleChange = (): void => {
      prefersReducedMotion.value = mediaQuery.matches;
    };

    mediaQuery.addEventListener("change", handleChange);
    onScopeDispose(() => mediaQuery.removeEventListener("change", handleChange));
  });

  return prefersReducedMotion;
};
