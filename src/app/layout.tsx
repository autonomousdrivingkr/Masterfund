import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Masterfund",
  description: "전 세계 자산을 한 곳에서 관리하세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={geist.variable}>
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
