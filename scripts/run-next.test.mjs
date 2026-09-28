import { describe, expect, it } from "vitest";

import { buildNextArgs, selectBundler } from "./run-next.mjs";

// `versions` e `env` são injetados para simular o StackBlitz sem depender do
// ambiente real de execução.
const local = { versions: {}, env: {} };
const webContainer = { versions: { webcontainer: "1" }, env: {} };

describe("selectBundler", () => {
  it("usa Turbopack quando há bindings nativos disponíveis", () => {
    expect(selectBundler([], local).bundler).toBe("turbopack");
  });

  it("cai para webpack no WebContainer, onde só existem bindings WASM", () => {
    expect(selectBundler([], webContainer).bundler).toBe("webpack");
  });

  it("respeita NEXT_BUNDLER=webpack fora do WebContainer", () => {
    const result = selectBundler([], { versions: {}, env: { NEXT_BUNDLER: "webpack" } });

    expect(result.bundler).toBe("webpack");
    expect(result.reason).toContain("NEXT_BUNDLER");
  });

  it("ignora NEXT_BUNDLER com valor desconhecido", () => {
    const result = selectBundler([], { versions: {}, env: { NEXT_BUNDLER: "esbuild" } });

    expect(result.bundler).toBe("turbopack");
  });

  it("dá prioridade à flag --webpack explícita", () => {
    expect(selectBundler(["--webpack"], local).bundler).toBe("webpack");
  });

  it("respeita --turbopack explícito mesmo no WebContainer", () => {
    expect(selectBundler(["--turbopack"], webContainer).bundler).toBe("turbopack");
    expect(selectBundler(["--turbo"], webContainer).bundler).toBe("turbopack");
  });
});

describe("buildNextArgs", () => {
  it("não adiciona flag no caminho padrão (Turbopack é o padrão do Next 16)", () => {
    expect(buildNextArgs("dev", [], "turbopack")).toEqual(["dev"]);
  });

  it("adiciona --webpack ao trocar de bundler", () => {
    expect(buildNextArgs("build", [], "webpack")).toEqual(["build", "--webpack"]);
  });

  it("não duplica --webpack quando a flag vem do usuário", () => {
    expect(buildNextArgs("dev", ["--webpack", "-p", "4000"], "webpack")).toEqual([
      "dev",
      "--webpack",
      "-p",
      "4000",
    ]);
  });
});
