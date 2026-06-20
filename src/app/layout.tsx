import { ThemeProvider } from "@mind-studio/ui";
import { mind } from "@mind-studio/ui/themes";
import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BrokerThemeSync } from "@/components/BrokerThemeSync";
import Header from "@/components/Header";
import { StandaloneOnly } from "@/components/StandaloneOnly";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mind Photos — your photos, in your pod",
  description:
    "A privacy-first photo gallery built on Solid Pods. Your photos never leave your pod.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-mind-theme="mind"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider
          theme={mind}
          defaultTheme="dark"
          enableSystem={false}
          storageKey="mind-photos-theme"
        >
          <BrokerThemeSync />
          <StandaloneOnly>
            <Header />
          </StandaloneOnly>
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
