<script lang="ts">
import type { SeriesKey } from "@/types/charts";

export const DEFAULT_INTERVAL_OPTIONS = [1000, 2400, 5000] as const;

export type ChartControlsProps = {
  isPlaying: boolean;
  intervalMs: number;
  metric: SeriesKey;
  intervalOptions?: readonly number[];
  onTogglePlaying: () => void;
  /** Avança um ponto com o feed pausado. */
  onStep: () => void;
  /** Gera um histórico novo. */
  onShuffle: () => void;
  onChangeMetric: (metric: SeriesKey) => void;
  onChangeInterval: (intervalMs: number) => void;
};
</script>

<script setup lang="ts">
import { useCssModule } from "vue";

import { SERIES_KEYS, SERIES_META, formatDecimal } from "@/utils/charts";

const $style = useCssModule();

const props = withDefaults(defineProps<ChartControlsProps>(), {
  intervalOptions: () => DEFAULT_INTERVAL_OPTIONS,
});

const handleIntervalChange = (event: Event): void => {
  props.onChangeInterval(Number((event.target as HTMLSelectElement).value));
};
</script>

<template>
  <div :class="$style.controls">
    <div
      :class="$style.group"
      role="group"
      aria-label="Métrica exibida"
    >
      <button
        v-for="key in SERIES_KEYS"
        :key="key"
        type="button"
        :class="$style.option"
        :aria-pressed="key === metric"
        @click="onChangeMetric(key)"
      >
        {{ SERIES_META[key].label }}
      </button>
    </div>
    <div :class="$style.actions">
      <button
        type="button"
        :class="$style.action"
        :aria-pressed="isPlaying"
        @click="onTogglePlaying"
      >
        {{ isPlaying ? "Pausar" : "Reproduzir" }}
      </button>
      <button type="button" :class="$style.action" @click="onStep">
        Avançar
      </button>
      <button type="button" :class="$style.action" @click="onShuffle">
        Embaralhar
      </button>
      <label :class="$style.field">
        <span :class="$style['field-label']">Intervalo</span>
        <select
          :class="$style.select"
          :value="intervalMs"
          @change="handleIntervalChange"
        >
          <option v-for="option in intervalOptions" :key="option" :value="option">
            {{ `${formatDecimal(option / 1000)}s` }}
          </option>
        </select>
      </label>
    </div>
  </div>
</template>

<style module>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-surface);
  box-shadow: var(--ds-shadow-sm);
}

.group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-surface-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.option {
  padding: 7px 14px;
  border: 0;
  border-radius: var(--ds-radius-full);
  background: transparent;
  color: var(--ds-foreground-muted);
  font: inherit;
  font-size: var(--ds-font-size-sm);
  cursor: pointer;
  transition:
    background var(--ds-duration-fast) var(--ds-ease-out),
    color var(--ds-duration-fast) var(--ds-ease-out);
}

.option:hover {
  color: var(--ds-foreground);
}

.option[aria-pressed="true"] {
  background: var(--ds-surface);
  color: var(--ds-foreground);
  box-shadow: var(--ds-shadow-sm);
  font-weight: 600;
}

.action {
  padding: 8px 14px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-full);
  background: var(--ds-surface);
  color: var(--ds-foreground);
  font: inherit;
  font-size: var(--ds-font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color var(--ds-duration-fast) var(--ds-ease-out),
    background var(--ds-duration-fast) var(--ds-ease-out);
}

.action:hover {
  border-color: var(--ds-accent);
}

.action[aria-pressed="true"] {
  border-color: var(--ds-accent);
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.select {
  padding: 6px 10px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface);
  color: var(--ds-foreground);
  font: inherit;
  font-size: var(--ds-font-size-sm);
}
</style>
