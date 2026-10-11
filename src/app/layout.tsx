import type { Metadata } from "next";
import Script from "next/script";
import { AppShell } from "@/components/shell/AppShell";
import { Hydration } from "@/components/providers/Hydration";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQL Studio — Learn SQL by writing SQL",
  description:
    "Learn SQL step by step, solve problems, and work on projects in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FAFAF9" />
        <link
          rel="preload"
          href="/fonts/geist-sans.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/geist-mono.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <Script src="/theme-boot.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased">
        <Hydration>
          <AppShell>{children}</AppShell>
        </Hydration>
      </body>
    </html>
  );
}
