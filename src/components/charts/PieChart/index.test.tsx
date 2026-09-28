import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PieDatum } from "@/types/charts";
import pieSeries from "../../../../__fixtures__/charts/pie-series.json";
import { PieChart, type PieChartProps } from ".";

const data = pieSeries as PieDatum[];

const renderChart = (props: Partial<PieChartProps> = {}) =>
  render(
    <PieChart
      data={data}
      title="Participação por métrica"
      description="Descrição acessível do gráfico de pizza."
      duration={0}
      {...props}
    />,
  );

const getSlices = (container: HTMLElement): SVGPathElement[] =>
  Array.from(
    container.querySelectorAll<SVGPathElement>("path[data-role='slice']"),
  );

describe("PieChart", () => {
  it("should render one slice per datum", () => {
    const { container } = renderChart();

    expect(getSlices(container)).toHaveLength(data.length);
  });

  it("should label the slices with their share", () => {
    const { container } = renderChart();
    const labels = container.querySelectorAll("text[data-role='slice-label']");

    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0].textContent).toMatch(/%/);
  });

  it("should label each slice with value and share", () => {
    const { container } = renderChart();
    const [first] = getSlices(container);

    expect(first.getAttribute("aria-label")).toMatch(/Receita: .+\(.+%\)/);
  });

  it("should call onSelect with the series when a slice is clicked", () => {
    const onSelect = vi.fn();
    const { container } = renderChart({ onSelect });

    fireEvent.click(getSlices(container)[0]);

    expect(onSelect).toHaveBeenCalledWith("revenue");
  });

  it("should mark the selected slice as pressed", () => {
    const { container } = renderChart({ selectedSeries: "users" });
    const pressed = getSlices(container).filter(
      (slice) => slice.getAttribute("aria-pressed") === "true",
    );

    expect(pressed).toHaveLength(1);
    expect(pressed[0].getAttribute("aria-label")).toContain("Usuários");
  });

  it("should expose an accessible name for the chart", () => {
    renderChart();

    expect(
      screen.getByRole("group", { name: /Participação por métrica/ }),
    ).toBeInTheDocument();
  });

  it("should show the tooltip when a slice receives focus", () => {
    const { container } = renderChart();

    fireEvent.focus(getSlices(container)[1]);

    expect(container.querySelector('[data-visible="true"]')).not.toBeNull();
  });

  it("should call onSelect from the legend button", () => {
    const onSelect = vi.fn();
    const { container } = renderChart({ onSelect });
    const legend = container.querySelector("ul");

    if (!legend) {
      throw new Error("Legenda não encontrada");
    }

    fireEvent.click(within(legend).getByRole("button", { name: /Conversões/ }));

    expect(onSelect).toHaveBeenCalledWith("conversions");
  });

  it("should omit the legend when disabled", () => {
    const { container } = renderChart({ showLegend: false });

    expect(container.querySelector("ul")).toBeNull();
  });

  it("should render an empty state when there is no data", () => {
    renderChart({ data: [] });

    expect(screen.getByText("Sem dados para exibir.")).toBeInTheDocument();
  });
});
