import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import type { PieChartProps, PieDatum } from "@/types/charts";
import pieSeries from "../../../__fixtures__/charts/pie-series.json";
import PieChart from "./PieChart.vue";

const data = pieSeries as PieDatum[];

const renderChart = (props: Partial<PieChartProps> = {}): VueWrapper =>
  mount(PieChart, {
    props: {
      data,
      title: "Participação por métrica",
      description: "Descrição acessível do gráfico de pizza.",
      duration: 0,
      ...props,
    },
  });

const getSlices = (wrapper: VueWrapper) =>
  wrapper.findAll<SVGPathElement>("path[data-role='slice']");

describe("PieChart", () => {
  it("should render one slice per datum", () => {
    const wrapper = renderChart();

    expect(getSlices(wrapper)).toHaveLength(data.length);
  });

  it("should label the slices with their share", () => {
    const wrapper = renderChart();
    const labels = wrapper.findAll("text[data-role='slice-label']");

    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0].text()).toMatch(/%/);
  });

  it("should label each slice with value and share", () => {
    const wrapper = renderChart();
    const first = getSlices(wrapper)[0];

    expect(first.element.getAttribute("aria-label")).toMatch(/Receita: .+\(.+%\)/);
  });

  it("should call onSelect with the series when a slice is clicked", async () => {
    const onSelect = vi.fn();
    const wrapper = renderChart({ onSelect });

    await getSlices(wrapper)[0].trigger("click");

    expect(onSelect).toHaveBeenCalledWith("revenue");
  });

  it("should mark the selected slice as pressed", () => {
    const wrapper = renderChart({ selectedSeries: "users" });
    const pressed = getSlices(wrapper).filter(
      (slice) => slice.element.getAttribute("aria-pressed") === "true",
    );

    expect(pressed).toHaveLength(1);
    expect(pressed[0].element.getAttribute("aria-label")).toContain("Usuários");
  });

  it("should expose an accessible name for the chart", () => {
    const wrapper = renderChart();

    expect(wrapper.find("svg").attributes("aria-labelledby")).toBeTruthy();
    expect(wrapper.find("svg title").text()).toContain("Participação por métrica");
  });

  it("should show the tooltip when a slice receives focus", async () => {
    const wrapper = renderChart();

    await getSlices(wrapper)[1].trigger("focus");

    expect(wrapper.find('[data-visible="true"]').exists()).toBe(true);
  });

  it("should call onSelect from the legend button", async () => {
    const onSelect = vi.fn();
    const wrapper = renderChart({ onSelect });

    const legendButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Conversões"));

    await legendButton?.trigger("click");

    expect(onSelect).toHaveBeenCalledWith("conversions");
  });

  it("should omit the legend when disabled", () => {
    const wrapper = renderChart({ showLegend: false });

    expect(wrapper.find("ul").exists()).toBe(false);
  });

  it("should render an empty state when there is no data", () => {
    const wrapper = renderChart({ data: [] });

    expect(wrapper.text()).toContain("Sem dados para exibir.");
  });
});
