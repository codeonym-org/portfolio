import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Rajdhani } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// the System's voice: everything it says is set in this serif
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Eurostile-style display face for the wordmark and ranks (self-hosted)
const michroma = localFont({
  src: "../fonts/michroma-latin.woff2",
  variable: "--font-michroma",
  display: "swap",
});

// the System's announcements: notices, prompts and their buttons (SIL Open Font Licence, hosted with the site)
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://portfolio.codeonym.work"),
  title: "CODEONYM — AI Agent Engineer",
  description:
    "Bouarour Ayoub (codeonym) — AI Agent Engineer shipping production-grade multi-agent systems, grounded via MCP and delivered through CopilotKit/AG-UI. A portfolio with no pages: ask THE SYSTEM, and it rearranges the whole record around your question.",
};

export const viewport: Viewport = {
  themeColor: "#05040b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geist.variable} ${instrument.variable} ${michroma.variable} ${rajdhani.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
