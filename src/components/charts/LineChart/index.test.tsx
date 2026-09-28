import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DataPoint } from "@/types/charts";
import lineSeries from "../../../../__fixtures__/charts/line-series.json";
import { LineChart, type LineChartProps } from ".";

const points = lineSeries as DataPoint[];

const renderChart = (props: Partial<LineChartProps> = {}) =>
  render(
    <LineChart
      points={points}
      metric="users"
      title="Série temporal"
      description="Descrição acessível do gráfico de linhas."
      duration={0}
      {...props}
    />,
  );

const getElement = <TElement extends Element>(
  container: HTMLElement,
  selector: string,
): TElement => {
  const element = container.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Elemento não encontrado: ${selector}`);
  }

  return element;
};

describe("LineChart", () => {
  it("should render the line path with data", () => {
    const { container } = renderChart();

    expect(
      getElement(container, "path[data-role='line']").getAttribute("d"),
    ).toMatch(/^M/);
  });

  it("should render the comparison path", () => {
    const { container } = renderChart();

    expect(
      getElement(container, "path[data-role='comparison']").getAttribute("d"),
    ).toMatch(/^M/);
  });

  it("should render both axes with ticks", () => {
    const { container } = renderChart();

    expect(
      container.querySelectorAll("g[data-role='axis-x'] .tick").length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelectorAll("g[data-role='axis-y'] .tick").length,
    ).toBeGreaterThan(0);
  });

  it("should expose an accessible name for the chart", () => {
    renderChart();

    expect(
      screen.getByRole("group", { name: /Série temporal/ }),
    ).toBeInTheDocument();
  });

  it("should show the guide line and the marker on hover", () => {
    const { container } = renderChart();
    const overlay = getElement(container, "rect[data-role='overlay']");

    fireEvent.mouseMove(overlay, { clientX: 300 });

    expect(
      getElement(container, "line[data-role='guide']").getAttribute(
        "data-visible",
      ),
    ).toBe("true");
    expect(
      getElement(container, "circle[data-role='point-marker']").getAttribute(
        "data-visible",
      ),
    ).toBe("true");
  });

  it("should zoom in with the toolbar button", () => {
    const { container } = renderChart();
    const svg = getElement<SVGSVGElement>(container, "svg");

    expect(svg.getAttribute("data-zoom-k")).toBe("1.00");

    fireEvent.click(screen.getByRole("button", { name: "Ampliar" }));

    expect(svg.getAttribute("data-zoom-k")).toBe("1.50");
  });

  it("should restore the zoom with the reset button", () => {
    const { container } = renderChart();
    const svg = getElement<SVGSVGElement>(container, "svg");

    fireEvent.click(screen.getByRole("button", { name: "Ampliar" }));
    fireEvent.click(screen.getByRole("button", { name: "Restaurar zoom" }));

    expect(svg.getAttribute("data-zoom-k")).toBe("1.00");
  });

  it("should hide the guide line when the zoom changes", () => {
    const { container } = renderChart();
    const overlay = getElement(container, "rect[data-role='overlay']");

    fireEvent.mouseMove(overlay, { clientX: 200 });
    expect(
      getElement(container, "line[data-role='guide']").getAttribute(
        "data-visible",
      ),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Ampliar" }));

    expect(
      getElement(container, "line[data-role='guide']").getAttribute(
        "data-visible",
      ),
    ).toBe("false");
  });

  it("should render an empty state when there are no points", () => {
    renderChart({ points: [] });

    expect(screen.getByText("Sem dados para exibir.")).toBeInTheDocument();
  });
});
