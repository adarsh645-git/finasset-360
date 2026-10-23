import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Document } from "@/components/Document";
import { resolveTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinAsset 360",
  description: "A multi-tenant net-worth tracker.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <Document theme={theme} className={`${geistSans.variable} ${geistMono.variable}`}>
      {children}
    </Document>
  );
}
