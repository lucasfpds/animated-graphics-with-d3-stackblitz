<script setup lang="ts">
import { useCssModule } from "vue";

import type { ChartLegendItem } from "@/types/charts";
import type { SeriesKey } from "@/types/charts";

const $style = useCssModule();

const props = defineProps<{
  items: readonly ChartLegendItem[];
  /** Métrica em destaque (usada pelo gráfico de pizza). */
  selectedSeries?: SeriesKey | null;
  onSelect?: (series: SeriesKey) => void;
}>();

const handleSelect = (item: ChartLegendItem): void => {
  if (item.series) {
    props.onSelect?.(item.series);
  }
};
</script>

<template>
  <ul :class="$style.legend">
    <li v-for="item in items" :key="item.id" :class="$style['item-wrap']">
      <button
        v-if="onSelect && item.series"
        type="button"
        :class="$style['item-button']"
        :aria-pressed="selectedSeries === item.series"
        @click="handleSelect(item)"
      >
        <span :class="[$style.swatch, item.className]" aria-hidden="true" />
        <span :class="$style.label">{{ item.label }}</span>
        <span v-if="item.value" :class="$style.value">{{ item.value }}</span>
      </button>
      <span v-else :class="$style.item">
        <span :class="[$style.swatch, item.className]" aria-hidden="true" />
        <span :class="$style.label">{{ item.label }}</span>
        <span v-if="item.value" :class="$style.value">{{ item.value }}</span>
      </span>
    </li>
  </ul>
</template>

<style module>
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  margin-top: 4px;
  list-style: none;
  padding: 0;
}

.item-wrap {
  display: flex;
  align-items: center;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-series-color, var(--ds-foreground-muted));
}

.label {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-sm);
}

.value {
  color: var(--ds-foreground);
  font-size: var(--ds-font-size-sm);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.item,
.item-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.item-button {
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: var(--ds-radius-full);
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition:
    border-color var(--ds-duration-fast) var(--ds-ease-out),
    background var(--ds-duration-fast) var(--ds-ease-out);
}

.item-button:hover {
  border-color: var(--ds-border);
}

.item-button[aria-pressed="true"] {
  border-color: var(--ds-accent);
  background: var(--ds-accent-soft);
}
</style>