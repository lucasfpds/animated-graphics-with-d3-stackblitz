import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartCard } from ".";

describe("ChartCard", () => {
  it("should render the title, the description and the content", () => {
    render(
      <ChartCard title="Receita" description="Resumo do período">
        <span>conteúdo do gráfico</span>
      </ChartCard>,
    );

    expect(
      screen.getByRole("heading", { name: "Receita" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Resumo do período")).toBeInTheDocument();
    expect(screen.getByText("conteúdo do gráfico")).toBeInTheDocument();
  });

  it("should name the section after its title", () => {
    render(
      <ChartCard title="Receita" description="Resumo do período">
        <span />
      </ChartCard>,
    );

    expect(screen.getByRole("region", { name: "Receita" })).toBeInTheDocument();
  });

  it("should render the highlight with its trend direction", () => {
    render(
      <ChartCard
        title="Receita"
        description="Resumo do período"
        highlight={{
          label: "Total",
          value: "R$ 1.000",
          variation: "+10%",
          trend: "up",
        }}
      >
        <span />
      </ChartCard>,
    );

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.000")).toBeInTheDocument();
    expect(screen.getByText("+10%")).toHaveAttribute("data-trend", "up");
  });

  it("should render the actions slot", () => {
    render(
      <ChartCard
        title="Receita"
        description="Resumo do período"
        actions={
          <button type="button" onClick={() => undefined}>
            Ação
          </button>
        }
      >
        <span />
      </ChartCard>,
    );

    expect(screen.getByRole("button", { name: "Ação" })).toBeInTheDocument();
  });

  it("should omit the highlight when it is not provided", () => {
    const { container } = render(
      <ChartCard title="Receita" description="Resumo do período">
        <span />
      </ChartCard>,
    );

    expect(container.querySelector("[data-trend]")).toBeNull();
  });
});
