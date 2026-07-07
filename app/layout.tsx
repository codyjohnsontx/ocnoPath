import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta"
});

export const metadata: Metadata = {
  title: "OncoPath | A calmer path through cancer trials",
  description:
    "OncoPath makes public cancer trial information easy to understand and helps you walk into your next appointment with the right questions for your care team."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${jakarta.variable} flex min-h-screen flex-col overflow-x-hidden bg-lav antialiased`}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
