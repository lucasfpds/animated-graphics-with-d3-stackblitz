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
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3000 (webpack) |
| `npm run build` | Build de produção (webpack) |
| `npm run start` | Serve o build de produção |
| `npm run css:build` | Regenera `src/app/tailwind.css` a partir de `src/app/tailwind.input.css` |
| `npm run lint` | ESLint (`eslint .`) |
| `npm run typecheck` | `tsc --noEmit` (rode `npx next typegen` antes) |
| `npm run test` | Testes unitários (Vitest, execução única) |
| `npm run test:watch` | Testes em modo watch |
| `npm run coverage` | Testes com cobertura |

## Rodando no StackBlitz (WebContainer)

O WebContainer do StackBlitz roda Node.js no navegador e **não** consegue executar binários nativos.
O projeto foi ajustado para não depender de nenhum deles:

1. **Sem Turbopack.** `npm run dev` e `npm run build` usam `next dev --webpack` e
   `next build --webpack`. O Turbopack só funciona com bindings nativos (Rust) e abortava com:

   > Error: Turbopack is not supported on this platform (linux/x64) because native bindings are not
   > available. Only WebAssembly (WASM) bindings were loaded, and Turbopack requires native bindings.

   O SWC continua disponível em WASM (`@next/swc-wasm-nodejs`), que o Next.js baixa e usa sozinho
   quando não há binário nativo — nada a configurar.

2. **Sem Tailwind no build.** O Tailwind v4 depende do `@tailwindcss/oxide` (Rust) e falharia com
   "Cannot find native binding". O CSS do Tailwind é pré-compilado e versionado em
   [`src/app/tailwind.css`](./src/app/tailwind.css), importado por `globals.css`; não existe mais
   `postcss.config.mjs`.

Basta importar o repositório e rodar normalmente:

```
https://stackblitz.com/github/lucasfpds/animated-graphics-with-d3-stackblitz
```

Ao usar **novas** classes utilitárias do Tailwind nos componentes, rode `npm run css:build` para
atualizar o CSS versionado (esse passo precisa de ambiente com binários nativos, ou seja, local).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
