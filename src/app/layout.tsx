import type { Metadata } from "next";
import Script from "next/script";
import { AppShell } from "@/components/shell/AppShell";
import { Hydration } from "@/components/providers/Hydration";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE, SITE_URL } from "@/platform/brand";
import "./globals.css";
import "./runtime.css";

const GA_MEASUREMENT_ID = "G-TEZ5LZ1PPY";

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: BRAND_NAME,
  keywords: ["learn SQL", "SQL course", "SQL practice", "SQL exercises", "SQL projects", "SQL playground", "SQLite"],
  openGraph: {
    siteName: BRAND_NAME,
    type: "website",
    url: "/",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${BRAND_NAME} — Learn by doing.` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script id="google-analytics" src="/google-tag.js" />
        <meta name="theme-color" content="#ffffff" />
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
        <link
          rel="preload"
          href="/fonts/source-serif-4-latin.woff2"
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
