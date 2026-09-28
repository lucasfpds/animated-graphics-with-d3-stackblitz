import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import type { BarChartProps, DataPoint } from "@/types/charts";
import barSeries from "../../../__fixtures__/charts/bar-series.json";
import BarChart from "./BarChart.vue";

const points = barSeries as DataPoint[];

const renderChart = (props: Partial<BarChartProps> = {}): VueWrapper =>
  mount(BarChart, {
    props: {
      points,
      metric: "revenue",
      title: "Etapas do funil",
      description: "Descrição acessível do gráfico de barras.",
      duration: 0,
      ...props,
    },
  });

const getBars = (wrapper: VueWrapper) =>
  wrapper.findAll<SVGRectElement>("rect[data-role='bar']");

describe("BarChart", () => {
  it("should render one bar per data point", () => {
    const wrapper = renderChart();

    expect(getBars(wrapper)).toHaveLength(points.length);
  });

  it("should render a reference line per bar", () => {
    const wrapper = renderChart();

    expect(
      wrapper.findAll("line[data-role='bar-reference']"),
    ).toHaveLength(points.length);
  });

  it("should expose an accessible name for the chart", () => {
    const wrapper = renderChart();

    expect(wrapper.find("svg").attributes("aria-labelledby")).toBeTruthy();
    expect(wrapper.find("svg title").text()).toContain("Etapas do funil");
  });

  it("should label each bar with its funnel stage", () => {
    const wrapper = renderChart();
    const first = getBars(wrapper)[0];

    expect(first.element.getAttribute("aria-label")).toContain("Visitantes");
  });

  it("should show the tooltip when a bar receives focus", async () => {
    const wrapper = renderChart();
    const first = getBars(wrapper)[0];

    await first.trigger("focus");

    expect(wrapper.find('[data-visible="true"]').exists()).toBe(true);
  });

  it("should hide the tooltip when the pointer leaves the bar", async () => {
    const wrapper = renderChart();
    const first = getBars(wrapper)[0];

    await first.trigger("mouseenter");
    await first.trigger("mouseleave");

    expect(wrapper.find('[data-visible="true"]').exists()).toBe(false);
  });

  it("should call onSelect with the clicked point", async () => {
    const onSelect = vi.fn();
    const wrapper = renderChart({ onSelect });

    await getBars(wrapper)[2].trigger("click");

    expect(onSelect).toHaveBeenCalledWith(points[2]);
  });

  it("should mark the selected bar", () => {
    const wrapper = renderChart({ selectedId: points[1].id });
    const bars = getBars(wrapper);

    expect(bars[1].element.getAttribute("data-selected")).toBe("true");
    expect(bars[0].element.getAttribute("data-selected")).toBe("false");
  });

  it("should mark the hovered bar as active", async () => {
    const wrapper = renderChart();
    const bars = getBars(wrapper);

    await bars[3].trigger("mouseenter");

    expect(bars[3].element.getAttribute("data-active")).toBe("true");
  });

  it("should render an empty state when there are no points", () => {
    const wrapper = renderChart({ points: [] });

    expect(wrapper.text()).toContain("Sem dados para exibir.");
  });
});
