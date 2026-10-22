import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { Hydration } from "@/components/providers/Hydration";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE, SITE_URL } from "@/platform/brand";
import "./globals.css";
import "./runtime.css";

const GA_MEASUREMENT_ID = "G-TEZSLZ1PPY";
const THEME_BOOT = `(function(){try{var p=localStorage.getItem("sql-studio-v1");var theme="system";if(p){var j=JSON.parse(p);theme=(j&&j.state&&j.state.preferences&&j.state.preferences.theme)||(j&&j.preferences&&j.preferences.theme)||"system";}document.cookie="rt-theme="+theme+";path=/;max-age=31536000;SameSite=Lax";var dark=theme==="dark"||(theme==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.dataset.theme=dark?"dark":"light";root.style.colorScheme=dark?"dark":"light";root.style.backgroundColor=dark?"#000000":"#ffffff";var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",dark?"#000000":"#ffffff");}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: BRAND_NAME,
  keywords: ["learn SQL", "SQL course", "SQL practice", "SQL exercises", "SQL projects", "SQL playground", "SQLite", "learn Python", "Python course", "Python practice", "Python exercises", "Python projects", "Python playground"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const saved = cookieStore.get("rt-theme")?.value;
  const theme = saved === "dark" || saved === "light" ? saved : undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={theme}
      style={
        theme === "dark"
          ? { colorScheme: "dark", backgroundColor: "#000000" }
          : theme === "light"
            ? { colorScheme: "light", backgroundColor: "#ffffff" }
            : undefined
      }
    >
      <head>
        <meta name="theme-color" content={theme === "dark" ? "#000000" : "#ffffff"} />
        <script id="theme-boot">{THEME_BOOT}</script>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script id="google-analytics">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </script>
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
      </head>
      <body className="antialiased">
        <PostHogProvider>
          <Hydration>
            <AppShell>{children}</AppShell>
          </Hydration>
        </PostHogProvider>
      </body>
    </html>
  );
}
