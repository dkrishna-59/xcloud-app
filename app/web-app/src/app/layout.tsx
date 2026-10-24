import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";
import { SearchProvider } from "@/context/search-context";
import { VaultProvider } from "@/context/vault-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PasscodeLockOverlay } from "@/components/layout/PasscodeLockOverlay";

import { LoginGate } from "@/components/auth/LoginGate";
import { Loader2 } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XCloud - Secure Cloud Storage",
  description: "Next-generation E2E encrypted cloud storage for your digital life. 1TB free secure vault with global multi-region redundancy.",
  keywords: ["cloud storage", "secure vault", "encryption", "XCloud", "file sharing"],
  authors: [{ name: "XCloud Team" }],
  openGraph: {
    title: "XCloud - Secure Cloud Storage",
    description: "The safest place for your digital life. 1TB encrypted storage.",
    url: "https://xcloud.app",
    siteName: "XCloud",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "XCloud Secure Storage",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XCloud - Secure Cloud Storage",
    description: "Zero-knowledge encrypted cloud storage.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.theme || 'system';
                const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-white text-blue-600">
            <Loader2 className="animate-spin" size={48} />
          </div>
        }>
          <AuthProvider>
            <ToastProvider>
              <SearchProvider>
                <LoginGate>
                  <VaultProvider>
                    <PasscodeLockOverlay />
                    <div className="flex min-h-screen overflow-hidden relative">
                      {/* Fluid Background Ambient Glow Orbs */}
                      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#6750A4]/10 dark:bg-[#D0BCFF]/10 rounded-full blur-[120px] pointer-events-none animate-liquid-float" />
                      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#EADDFF]/20 dark:bg-[#4F378B]/15 rounded-full blur-[140px] pointer-events-none animate-liquid-float-delayed" />

                      <Sidebar />
                      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
                        <Header />
                        <div className="flex-1 overflow-y-auto">
                          {children}
                        </div>
                      </div>
                    </div>
                  </VaultProvider>
                </LoginGate>
              </SearchProvider>
            </ToastProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
