#!/usr/bin/env node
/**
 * Executa o CLI do Next escolhendo o bundler conforme o ambiente.
 *
 * O Turbopack depende de bindings nativos (Rust) e não funciona onde só
 * existem bindings WASM, como no WebContainer do StackBlitz:
 *
 *   Error: Turbopack is not supported on this platform (linux/x64) because
 *   native bindings are not available. Only WebAssembly (WASM) bindings were
 *   loaded, and Turbopack requires native bindings.
 *
 * O próprio Next.js usa `process.versions.webcontainer` para detectar esse
 * cenário e carregar o SWC em WASM (node_modules/next/dist/build/swc/index.js),
 * então usamos o mesmo sinal para adicionar `--webpack`.
 *
 * Overrides, em ordem de prioridade:
 *   1. `--webpack` ou `--turbopack` na linha de comando;
 *   2. `NEXT_BUNDLER=webpack|turbopack` no ambiente;
 *   3. detecção de WebContainer;
 *   4. padrão do Next 16 (Turbopack).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const WEBPACK = "webpack";
const TURBOPACK = "turbopack";

/** Resolve o bundler a usar e o motivo, para permitir override e teste. */
export function selectBundler(
  passthrough = [],
  { env = process.env, versions = process.versions } = {},
) {
  if (passthrough.includes("--webpack")) {
    return { bundler: WEBPACK, reason: "flag --webpack" };
  }
  if (passthrough.includes("--turbopack") || passthrough.includes("--turbo")) {
    return { bundler: TURBOPACK, reason: "flag --turbopack" };
  }

  const override =
    typeof env.NEXT_BUNDLER === "string"
      ? env.NEXT_BUNDLER.trim().toLowerCase()
      : "";
  if (override === WEBPACK || override === TURBOPACK) {
    return { bundler: override, reason: "variável NEXT_BUNDLER" };
  }

  if (versions?.webcontainer) {
    return { bundler: WEBPACK, reason: "WebContainer (apenas bindings WASM)" };
  }

  return { bundler: TURBOPACK, reason: "padrão local" };
}

/** Monta os argumentos do CLI sem duplicar a flag já informada pelo usuário. */
export function buildNextArgs(command, passthrough, bundler) {
  const needsFlag = bundler === WEBPACK && !passthrough.includes("--webpack");
  return [command, ...(needsFlag ? ["--webpack"] : []), ...passthrough];
}

function main() {
  const [command = "dev", ...passthrough] = process.argv.slice(2);
  const { bundler, reason } = selectBundler(passthrough);
  const args = buildNextArgs(command, passthrough, bundler);

  console.log(`[next] next ${args.join(" ")} — bundler: ${bundler} (${reason})`);

  const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, ...args], {
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => child.kill(signal));
  }

  child.on("exit", (code, signal) => {
    process.exit(signal ? 1 : (code ?? 0));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
