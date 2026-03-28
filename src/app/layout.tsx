import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Inter, DM_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { TRPCReactProvider } from "~/trpc/react";
import { CombinedProvider } from "~/components/providers/combined-provider";
import { TxWatcherBridge } from "~/components/providers/tx-watcher-provider";
import { Toaster } from "~/components/ui/sonner";
import { BRANDING } from "~/config";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: BRANDING.fullTitle,
  description: BRANDING.description,
  icons: [{ rel: "icon", url: BRANDING.logo.favicon }],
  openGraph: {
    title: BRANDING.fullTitle,
    description: BRANDING.description,
    images: [BRANDING.logo.ogImage],
    siteName: BRANDING.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRANDING.fullTitle,
    description: BRANDING.description,
    images: [BRANDING.logo.ogImage],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://cardano-xp.io"),
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} ${geistMono.variable} overflow-hidden overscroll-none`} suppressHydrationWarning>
      <body className="font-sans overflow-hidden overscroll-none">
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <CombinedProvider>
            <TRPCReactProvider>
              <TxWatcherBridge>
                {children}
              </TxWatcherBridge>
            </TRPCReactProvider>
            <Toaster position="top-right" richColors closeButton />
          </CombinedProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
