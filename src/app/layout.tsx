import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";
import "../styles/print.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-sans-loaded",
  display: "swap",
  weight: "100 900",
});

const sourceSerif = localFont({
  src: "./fonts/SourceSerif4-Variable.woff2",
  variable: "--font-serif-loaded",
  display: "swap",
  weight: "200 900",
});

export const metadata: Metadata = {
  title: "Resume Maker",
  description:
    "Build a professional resume locally in your browser and print it to PDF.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
