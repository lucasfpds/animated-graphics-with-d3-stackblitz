import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";

import type { DataPoint, LineChartProps } from "@/types/charts";
import lineSeries from "../../../__fixtures__/charts/line-series.json";
import LineChart from "./LineChart.vue";

const points = lineSeries as DataPoint[];

const renderChart = (props: Partial<LineChartProps> = {}): VueWrapper =>
  mount(LineChart, {
    props: {
      points,
      metric: "users",
      title: "Série temporal",
      description: "Descrição acessível do gráfico de linhas.",
      duration: 0,
      ...props,
    },
  });

const attr = (wrapper: VueWrapper, selector: string, name: string): string => {
  const element = wrapper.find(selector);

  if (!element.exists()) {
    throw new Error(`Elemento não encontrado: ${selector}`);
  }

  return element.attributes(name) ?? "";
};

describe("LineChart", () => {
  it("should render the line path with data", () => {
    const wrapper = renderChart();

    expect(attr(wrapper, "path[data-role='line']", "d")).toMatch(/^M/);
  });

  it("should render the comparison path", () => {
    const wrapper = renderChart();

    expect(attr(wrapper, "path[data-role='comparison']", "d")).toMatch(/^M/);
  });

  it("should render both axes with ticks", () => {
    const wrapper = renderChart();

    expect(wrapper.findAll("g[data-role='axis-x'] .tick").length).toBeGreaterThan(
      0,
    );
    expect(wrapper.findAll("g[data-role='axis-y'] .tick").length).toBeGreaterThan(
      0,
    );
  });

  it("should expose an accessible name for the chart", () => {
    const wrapper = renderChart();

    expect(wrapper.find("svg").attributes("aria-labelledby")).toBeTruthy();
    expect(wrapper.find("svg title").text()).toContain("Série temporal");
  });

  it("should show the guide line and the marker on hover", async () => {
    const wrapper = renderChart();
    const overlay = wrapper.find("rect[data-role='overlay']");

    await overlay.trigger("mousemove", { clientX: 300 });

    expect(attr(wrapper, "line[data-role='guide']", "data-visible")).toBe("true");
    expect(attr(wrapper, "circle[data-role='point-marker']", "data-visible")).toBe(
      "true",
    );
  });

  it("should zoom in with the toolbar button", async () => {
    const wrapper = renderChart();

    expect(wrapper.find("svg").attributes("data-zoom-k")).toBe("1.00");

    await wrapper.find('button[aria-label="Ampliar"]').trigger("click");
    await nextTick();

    expect(wrapper.find("svg").attributes("data-zoom-k")).toBe("1.50");
  });

  it("should restore the zoom with the reset button", async () => {
    const wrapper = renderChart();

    await wrapper.find('button[aria-label="Ampliar"]').trigger("click");
    await wrapper.find('button[aria-label="Restaurar zoom"]').trigger("click");
    await nextTick();

    expect(wrapper.find("svg").attributes("data-zoom-k")).toBe("1.00");
  });

  it("should hide the guide line when the zoom changes", async () => {
    const wrapper = renderChart();
    const overlay = wrapper.find("rect[data-role='overlay']");

    await overlay.trigger("mousemove", { clientX: 200 });
    expect(attr(wrapper, "line[data-role='guide']", "data-visible")).toBe("true");

    await wrapper.find('button[aria-label="Ampliar"]').trigger("click");
    await nextTick();

    expect(attr(wrapper, "line[data-role='guide']", "data-visible")).toBe("false");
  });

  it("should render an empty state when there are no points", () => {
    const wrapper = renderChart({ points: [] });

    expect(wrapper.text()).toContain("Sem dados para exibir.");
  });
});
