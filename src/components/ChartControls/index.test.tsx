import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";

import type { SeriesKey } from "@/types/charts";
import {
  ChartControls,
  DEFAULT_INTERVAL_OPTIONS,
  type ChartControlsProps,
} from ".";

type Handlers = {
  onTogglePlaying: Mock<() => void>;
  onStep: Mock<() => void>;
  onShuffle: Mock<() => void>;
  onChangeMetric: Mock<(metric: SeriesKey) => void>;
  onChangeInterval: Mock<(intervalMs: number) => void>;
};

const renderControls = (props: Partial<ChartControlsProps> = {}): Handlers => {
  const handlers: Handlers = {
    onTogglePlaying: vi.fn<() => void>(),
    onStep: vi.fn<() => void>(),
    onShuffle: vi.fn<() => void>(),
    onChangeMetric: vi.fn<(metric: SeriesKey) => void>(),
    onChangeInterval: vi.fn<(intervalMs: number) => void>(),
  };

  render(
    <ChartControls
      isPlaying
      intervalMs={2400}
      metric="revenue"
      {...handlers}
      {...props}
    />,
  );

  return handlers;
};

describe("ChartControls", () => {
  it("should mark the current metric as pressed", () => {
    renderControls({ metric: "users" });

    expect(
      screen.getByRole("button", { name: "Usuários ativos" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Receita" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("should call onChangeMetric with the clicked metric", () => {
    const handlers = renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Conversões" }));

    expect(handlers.onChangeMetric).toHaveBeenCalledWith("conversions");
  });

  it("should show the pause label while playing and the play label when paused", () => {
    const { rerender } = render(
      <ChartControls
        isPlaying
        intervalMs={2400}
        metric="revenue"
        onTogglePlaying={vi.fn()}
        onStep={vi.fn()}
        onShuffle={vi.fn()}
        onChangeMetric={vi.fn()}
        onChangeInterval={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();

    rerender(
      <ChartControls
        isPlaying={false}
        intervalMs={2400}
        metric="revenue"
        onTogglePlaying={vi.fn()}
        onStep={vi.fn()}
        onShuffle={vi.fn()}
        onChangeMetric={vi.fn()}
        onChangeInterval={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Reproduzir" }),
    ).toBeInTheDocument();
  });

  it("should call the feed handlers", () => {
    const handlers = renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
    fireEvent.click(screen.getByRole("button", { name: "Embaralhar" }));

    expect(handlers.onTogglePlaying).toHaveBeenCalledTimes(1);
    expect(handlers.onStep).toHaveBeenCalledTimes(1);
    expect(handlers.onShuffle).toHaveBeenCalledTimes(1);
  });

  it("should render one option per configured interval", () => {
    renderControls();

    expect(screen.getAllByRole("option")).toHaveLength(
      DEFAULT_INTERVAL_OPTIONS.length,
    );
  });

  it("should call onChangeInterval with the selected interval", () => {
    const handlers = renderControls();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "1000" },
    });

    expect(handlers.onChangeInterval).toHaveBeenCalledWith(1000);
  });
});
