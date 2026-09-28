import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DataPoint } from "@/types/charts";
import barSeries from "../../../../__fixtures__/charts/bar-series.json";
import { BarChart, type BarChartProps } from ".";

const points = barSeries as DataPoint[];

const renderChart = (props: Partial<BarChartProps> = {}) =>
  render(
    <BarChart
      points={points}
      metric="revenue"
      title="Etapas do funil"
      description="Descrição acessível do gráfico de barras."
      duration={0}
      {...props}
    />,
  );

const getBars = (container: HTMLElement): SVGRectElement[] =>
  Array.from(
    container.querySelectorAll<SVGRectElement>("rect[data-role='bar']"),
  );

describe("BarChart", () => {
  it("should render one bar per data point", () => {
    const { container } = renderChart();

    expect(getBars(container)).toHaveLength(points.length);
  });

  it("should render a reference line per bar", () => {
    const { container } = renderChart();

    expect(
      container.querySelectorAll("line[data-role='bar-reference']"),
    ).toHaveLength(points.length);
  });

  it("should expose an accessible name for the chart", () => {
    renderChart();

    expect(
      screen.getByRole("group", { name: /Etapas do funil/ }),
    ).toBeInTheDocument();
  });

  it("should label each bar with its funnel stage", () => {
    const { container } = renderChart();
    const [first] = getBars(container);

    expect(first.getAttribute("aria-label")).toContain("Visitantes");
  });

  it("should show the tooltip when a bar receives focus", () => {
    const { container } = renderChart();
    const [first] = getBars(container);

    fireEvent.focus(first);

    expect(container.querySelector('[data-visible="true"]')).not.toBeNull();
  });

  it("should hide the tooltip when the pointer leaves the bar", () => {
    const { container } = renderChart();
    const [first] = getBars(container);

    fireEvent.mouseEnter(first);
    fireEvent.mouseLeave(first);

    expect(container.querySelector('[data-visible="true"]')).toBeNull();
  });

  it("should call onSelect with the clicked point", () => {
    const onSelect = vi.fn();
    const { container } = renderChart({ onSelect });

    fireEvent.click(getBars(container)[2]);

    expect(onSelect).toHaveBeenCalledWith(points[2]);
  });

  it("should mark the selected bar", () => {
    const { container } = renderChart({ selectedId: points[1].id });
    const bars = getBars(container);

    expect(bars[1].getAttribute("data-selected")).toBe("true");
    expect(bars[0].getAttribute("data-selected")).toBe("false");
  });

  it("should mark the hovered bar as active", () => {
    const { container } = renderChart();
    const bars = getBars(container);

    fireEvent.mouseEnter(bars[3]);

    expect(bars[3].getAttribute("data-active")).toBe("true");
  });

  it("should render an empty state when there are no points", () => {
    renderChart({ points: [] });

    expect(screen.getByText("Sem dados para exibir.")).toBeInTheDocument();
  });
});
