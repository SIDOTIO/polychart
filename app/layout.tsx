import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolyChart — Polymarket Charting",
  description: "Professional candlestick charts for Polymarket prediction markets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
