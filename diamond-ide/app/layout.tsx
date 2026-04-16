import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { ErrorBoundary } from "../components/error-boundary";

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend"
});

export const metadata: Metadata = {
  title: "Diamond Compiler",
  description:
    "Browser-based IDE and compiler visualizer for the Diamond language with Flex, Bison, AST, symbol tables, TAC, and WebAssembly integration.",
  metadataBase: new URL("https://diamond-ide.vercel.app"),
  openGraph: {
    title: "Diamond Compiler",
    description:
      "A Bengali-flavoured programming language with an in-browser compiler, AST visualization, and step-through debugger.",
    type: "website"
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${lexend.variable} min-h-screen bg-[var(--page-bg)] text-slate-100 antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
