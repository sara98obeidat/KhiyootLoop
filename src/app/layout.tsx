import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ModeBanner } from "@/components/ModeBanner";

export const metadata: Metadata = {
  title: { default: "KhiyootLoop — handmade crochet, made to order", template: "%s · KhiyootLoop" },
  description:
    "Design a handmade crochet bag or scarf: choose size, stitch, yarn, colour and a personalised tag, and see a concept preview.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbf7ef" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <ModeBanner />
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <div className="container">{children}</div>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
