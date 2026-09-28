import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi, type Mock } from "vitest";

import type { SeriesKey } from "@/types/charts";
import ChartControls, {
  DEFAULT_INTERVAL_OPTIONS,
  type ChartControlsProps,
} from "./ChartControls.vue";

type Handlers = {
  onTogglePlaying: Mock<() => void>;
  onStep: Mock<() => void>;
  onShuffle: Mock<() => void>;
  onChangeMetric: Mock<(metric: SeriesKey) => void>;
  onChangeInterval: Mock<(intervalMs: number) => void>;
};

const renderControls = (
  props: Partial<ChartControlsProps> = {},
): { wrapper: VueWrapper; handlers: Handlers } => {
  const handlers: Handlers = {
    onTogglePlaying: vi.fn<() => void>(),
    onStep: vi.fn<() => void>(),
    onShuffle: vi.fn<() => void>(),
    onChangeMetric: vi.fn<(metric: SeriesKey) => void>(),
    onChangeInterval: vi.fn<(intervalMs: number) => void>(),
  };

  const wrapper = mount(ChartControls, {
    props: {
      isPlaying: true,
      intervalMs: 2400,
      metric: "revenue",
      ...handlers,
      ...props,
    },
  });

  return { wrapper, handlers };
};

const buttonByText = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll("button").find((button) => button.text() === text);

describe("ChartControls", () => {
  it("should mark the current metric as pressed", () => {
    const { wrapper } = renderControls({ metric: "users" });

    expect(buttonByText(wrapper, "Usuários ativos")?.attributes("aria-pressed")).toBe(
      "true",
    );
    expect(buttonByText(wrapper, "Receita")?.attributes("aria-pressed")).toBe(
      "false",
    );
  });

  it("should call onChangeMetric with the clicked metric", async () => {
    const { wrapper, handlers } = renderControls();

    await buttonByText(wrapper, "Conversões")?.trigger("click");

    expect(handlers.onChangeMetric).toHaveBeenCalledWith("conversions");
  });

  it("should show the pause label while playing and the play label when paused", async () => {
    const { wrapper } = renderControls();

    expect(buttonByText(wrapper, "Pausar")).toBeTruthy();

    await wrapper.setProps({ isPlaying: false });

    expect(buttonByText(wrapper, "Reproduzir")).toBeTruthy();
  });

  it("should call the feed handlers", async () => {
    const { wrapper, handlers } = renderControls();

    await buttonByText(wrapper, "Pausar")?.trigger("click");
    await buttonByText(wrapper, "Avançar")?.trigger("click");
    await buttonByText(wrapper, "Embaralhar")?.trigger("click");

    expect(handlers.onTogglePlaying).toHaveBeenCalledTimes(1);
    expect(handlers.onStep).toHaveBeenCalledTimes(1);
    expect(handlers.onShuffle).toHaveBeenCalledTimes(1);
  });

  it("should render one option per configured interval", () => {
    const { wrapper } = renderControls();

    expect(wrapper.findAll("option")).toHaveLength(
      DEFAULT_INTERVAL_OPTIONS.length,
    );
  });

  it("should call onChangeInterval with the selected interval", async () => {
    const { wrapper, handlers } = renderControls();

    await wrapper.find("select").setValue("1000");

    expect(handlers.onChangeInterval).toHaveBeenCalledWith(1000);
  });
});
