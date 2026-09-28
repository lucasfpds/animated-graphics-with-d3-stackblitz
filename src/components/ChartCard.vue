<script setup lang="ts">
import { useCssModule, useId } from "vue";

import type { ChartCardHighlight } from "@/types/charts";

const $style = useCssModule();
const titleId = useId();

defineProps<{
  title: string;
  description: string;
  highlight?: ChartCardHighlight;
}>();
</script>

<template>
  <section :class="$style.card" :aria-labelledby="titleId">
    <header :class="$style.header">
      <div :class="$style.heading">
        <h2 :id="titleId" :class="$style.title">{{ title }}</h2>
        <p :class="$style.description">{{ description }}</p>
      </div>
      <div :class="$style.actions">
        <p v-if="highlight" :class="$style.highlight">
          <span :class="$style['highlight-label']">{{ highlight.label }}</span>
          <span :class="$style['highlight-value']">{{ highlight.value }}</span>
          <span
            v-if="highlight.variation"
            :class="$style['highlight-variation']"
            :data-trend="highlight.trend ?? 'flat'"
          >
            {{ highlight.variation }}
          </span>
        </p>
        <slot name="actions" />
      </div>
    </header>
    <div :class="$style.body">
      <slot />
    </div>
  </section>
</template>

<style module>
.card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-surface);
  box-shadow: var(--ds-shadow-sm);
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.heading {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title {
  font-size: var(--ds-font-size-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.description {
  margin-top: 4px;
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-sm);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.highlight {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.highlight-label {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.highlight-value {
  font-size: var(--ds-font-size-lg);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.highlight-variation {
  font-size: var(--ds-font-size-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.highlight-variation[data-trend="up"] {
  color: var(--ds-series-3);
}

.highlight-variation[data-trend="down"] {
  color: var(--ds-series-2);
}

.highlight-variation[data-trend="flat"] {
  color: var(--ds-foreground-muted);
}

/* Referência de posicionamento para o tooltip absoluto de cada gráfico. */
.body {
  position: relative;
}
</style>
