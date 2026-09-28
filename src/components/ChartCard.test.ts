import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ChartCard from "./ChartCard.vue";

describe("ChartCard", () => {
  it("should render the title, the description and the content", () => {
    const wrapper = mount(ChartCard, {
      props: { title: "Receita", description: "Resumo do período" },
      slots: { default: "<span>conteúdo do gráfico</span>" },
    });

    expect(wrapper.find("h2").text()).toBe("Receita");
    expect(wrapper.find("p").text()).toContain("Resumo do período");
    expect(wrapper.text()).toContain("conteúdo do gráfico");
  });

  it("should name the section after its title", () => {
    const wrapper = mount(ChartCard, {
      props: { title: "Receita", description: "Resumo do período" },
      slots: { default: "<span />" },
    });

    const section = wrapper.find("section");

    expect(section.attributes("aria-labelledby")).toBeTruthy();
    expect(wrapper.find("h2").text()).toBe("Receita");
  });

  it("should render the highlight with its trend direction", () => {
    const wrapper = mount(ChartCard, {
      props: {
        title: "Receita",
        description: "Resumo do período",
        highlight: {
          label: "Total",
          value: "R$ 1.000",
          variation: "+10%",
          trend: "up",
        },
      },
      slots: { default: "<span />" },
    });

    expect(wrapper.text()).toContain("Total");
    expect(wrapper.text()).toContain("R$ 1.000");
    expect(wrapper.get('[data-trend="up"]').text()).toBe("+10%");
  });

  it("should render the actions slot", () => {
    const wrapper = mount(ChartCard, {
      props: { title: "Receita", description: "Resumo do período" },
      slots: {
        default: "<span />",
        actions: '<button type="button">Ação</button>',
      },
    });

    expect(wrapper.get("button").text()).toBe("Ação");
  });

  it("should omit the highlight when it is not provided", () => {
    const wrapper = mount(ChartCard, {
      props: { title: "Receita", description: "Resumo do período" },
      slots: { default: "<span />" },
    });

    expect(wrapper.find("[data-trend]").exists()).toBe(false);
  });
});
