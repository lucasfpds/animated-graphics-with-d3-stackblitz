import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gráficos animados com D3.js",
  description:
    "Dashboard com gráficos de barras, linhas e pizza animados com D3.js, atualizados por um feed sintético determinístico.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
