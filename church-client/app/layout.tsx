import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteFrame } from "@/components/layout/site-frame";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AudioPlayerProvider } from "@/components/audio/audio-player";
import { CurrencyProvider } from "@/components/currency/currency-context";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "MFM Ficgayo · Maison du Feu",
  description:
    "Église MFM Ficgayo — un lieu de grâce, de feu et de miracles au cœur d'Abidjan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${jakarta.variable} ${cormorant.variable} h-full`}
    >
      <body className="min-h-full">
        <CurrencyProvider>
          <AudioPlayerProvider>
            <SiteFrame navbar={<Navbar />} footer={<Footer />}>
              {children}
            </SiteFrame>
          </AudioPlayerProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
