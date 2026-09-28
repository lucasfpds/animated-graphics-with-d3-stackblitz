<script setup lang="ts">
import { computed, useCssModule } from "vue";

import type { ChartTooltipState } from "@/types/charts";

const $style = useCssModule();

const props = defineProps<{
  state: ChartTooltipState;
}>();

const position = computed(() => ({
  "--tooltip-x": `${props.state.x}px`,
  "--tooltip-y": `${props.state.y}px`,
}));

const announcement = computed(() =>
  props.state.visible
    ? `${props.state.title}: ${props.state.rows
        .map((row) => `${row.label} ${row.value}`)
        .join(", ")}`
    : "",
);
</script>

<template>
  <div
    :class="$style.tooltip"
    :data-visible="state.visible"
    :style="position"
    aria-hidden="true"
  >
    <p :class="$style.title">{{ state.title }}</p>
    <dl :class="$style.rows">
      <div v-for="row in state.rows" :key="row.label" :class="$style.row">
        <dt :class="$style.label">{{ row.label }}</dt>
        <dd :class="$style.value">{{ row.value }}</dd>
      </div>
    </dl>
  </div>
  <span :class="$style['live-region']" aria-live="polite">
    {{ announcement }}
  </span>
</template>

<style module>
.tooltip {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  min-width: 120px;
  padding: 10px 12px;
  transform: translate3d(var(--tooltip-x, 0), var(--tooltip-y, 0), 0)
    translate(-50%, calc(-100% - 12px));
  border-radius: var(--ds-radius-md);
  background: var(--ds-tooltip-background);
  color: var(--ds-tooltip-foreground);
  box-shadow: var(--ds-tooltip-shadow);
  font-size: var(--ds-font-size-xs);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--ds-duration-fast) var(--ds-ease-out);
}

.tooltip[data-visible="true"] {
  opacity: 1;
}

.title {
  font-weight: 600;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.label {
  opacity: 0.78;
}

.value {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.live-region {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
