This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3000 |
| `npm run dev:webpack` | Força o webpack no desenvolvimento (escape hatch) |
| `npm run build` | Build de produção |
| `npm run build:webpack` | Força o webpack no build (escape hatch) |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint (`eslint .`) |
| `npm run typecheck` | `tsc --noEmit` (rode `npx next typegen` antes) |
| `npm run test` | Testes unitários (Vitest, execução única) |
| `npm run test:watch` | Testes em modo watch |
| `npm run coverage` | Testes com cobertura |

## Rodando no StackBlitz (WebContainer)

O WebContainer do StackBlitz roda Node.js no navegador e **não** executa binários nativos, que é
justamente o que o Turbopack exige. Nesses ambientes o Next.js carrega os bindings WASM do SWC e o
Turbopack aborta com:

> Error: Turbopack is not supported on this platform (linux/x64) because native bindings are not
> available. Only WebAssembly (WASM) bindings were loaded, and Turbopack requires native bindings.

O projeto trata isso automaticamente: `npm run dev` e `npm run build` passam por
[`scripts/run-next.mjs`](./scripts/run-next.mjs), que detecta o WebContainer usando o mesmo sinal do
Next.js (`process.versions.webcontainer`) e adiciona `--webpack`. Basta importar o repositório e
rodar o script normalmente:

```
https://stackblitz.com/github/lucasfpds/animated-graphics-with-d3-stackblitz?startScript=dev
```

Para forçar o bundler, use as flags do CLI ou a variável de ambiente:

```bash
npm run dev:webpack              # webpack explícito
npm run dev -- --turbopack       # Turbopack explícito (falha onde não há bindings nativos)
NEXT_BUNDLER=webpack npm run dev # equivalente
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
