import type { Metadata } from "next";
import { Fraunces, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { PeriodProvider } from "@/lib/PeriodContext";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Observatorio de inflación",
  description: "Seguimiento personalizado de inflación en Argentina",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Observatorio de inflación",
    description: "Seguimiento personalizado de inflación en Argentina",
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <PeriodProvider>
          <Navigation />
          <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
            {children}
          </main>
        </PeriodProvider>
      </body>
    </html>
  );
}
