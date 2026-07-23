import type { Metadata } from "next";
import { Fraunces, Ubuntu, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { PeriodProvider } from "@/lib/PeriodContext";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const ubuntuMono = Ubuntu_Mono({
  variable: "--font-ubuntu-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
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
      className={`${fraunces.variable} ${ubuntu.variable} ${ubuntuMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <PeriodProvider>
          <Navigation />
          <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
            {children}
          </main>
        </PeriodProvider>
      </body>
    </html>
  );
}
