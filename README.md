# Gráficos animados com D3.js (Vue 3)

Dashboard com gráficos de barras, linhas e pizza animados com **D3.js**, montado
em **Vue 3 + Vite + TypeScript**. Os dados vêm de um feed sintético
determinístico (PRNG semeado com mulberry32): o mesmo tick produz exatamente os
mesmos números no cliente e nos testes.

## Requisitos

- Node.js 22+ (ou 24+)

## Começando

```bash
npm install
npm run dev
```

Abra http://localhost:3000 no navegador.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Type-check + build de produção (`vue-tsc --noEmit && vite build`) |
| `npm run preview` | Serve o build de produção |
| `npm run lint` | ESLint (Vue + TypeScript) |
| `npm run typecheck` | `vue-tsc --noEmit` |
| `npm run test` | Testes unitários (Vitest + Vue Test Utils) |
| `npm run test:watch` | Testes em modo watch |
| `npm run coverage` | Testes com cobertura |

## Estrutura

```
src/
  main.ts                  entry: cria o app e importa o CSS global
  App.vue                  dashboard (estado da UI)
  styles/globals.css       design tokens + classes globais de série
  components/              ChartCard, ChartControls, ChartLegend, ChartTooltip
  components/charts/       BarChart, LineChart, PieChart
  composables/             use-live-series, use-chart-dimensions, use-prefers-reduced-motion
  types/charts.ts          tipos compartilhados
  utils/charts/            matemática pura (escalas, geometria, geradores, formato)
```

O **D3 desenha o SVG dentro de cada gráfico** (join por `id` + transições). O Vue
cuida do estado reativo (tooltip, seleção, zoom); a parte mais arriscada
(interpolação, zoom, geometria) fica em funções puras testáveis em `utils/charts`.

## Rodando no StackBlitz (WebContainer)

O WebContainer do StackBlitz roda Node.js no navegador e **não** executa binários
nativos. O projeto foi ajustado para não depender de nenhum deles:

1. **Vite em vez de Turbopack/Next.** O Vite é JavaScript puro, então sobe sem
   bindings nativos.
2. **Sem Tailwind no build.** Os estilos são CSS Modules (`<style module>`) +
   design tokens em `globals.css`, sem PostCSS/Tailwind (que dependem de binário
   Rust).
3. **Sem `next/font`.** A tipografia usa a pilha de fontes do sistema.

Basta importar o repositório e rodar normalmente:

```
https://stackblitz.com/github/lucasfpds/animated-graphics-with-d3-stackblitz
```

## Acessibilidade

- Cada gráfico é um `<svg role="group">` com `<title>` e `<desc>`.
- Barras e fatias são focáveis (`tabindex=0` + `role="button"`) e reagem a
  Enter/clique.
- `prefers-reduced-motion` zera a duração das transições do D3.
