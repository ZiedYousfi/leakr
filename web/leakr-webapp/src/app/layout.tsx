import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Fira_Mono, Fira_Sans } from "next/font/google";
import { Header } from '@/components/layout/Header'
import Footer from "@/components/layout/Footer";
import "./globals.css";

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leakr",
  description:
    "Discover, manage, and organize content from your favorite creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <ClerkProvider>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8988091393037410"
          crossOrigin="anonymous"
        ></script>
        <meta name="google-adsense-account" content="ca-pub-8988091393037410"></meta>
      </head>
      <body className={`${firaMono.variable} ${firaSans.variable} antialiased`}>
        <SpeedInsights />
        <Analytics /> {/* Vercel Analytics */}
        {children}
        <Header />
        <Footer />
      </body>
      </ClerkProvider>
    </html>
  );
}
