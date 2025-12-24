import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TokenScope - AI Coding Analytics | Developer Productivity Metrics",
  description: "Track your AI-assisted coding activity. Analytics for AI coding tools with tool usage, file changes, git operations. Measure ROI, drive velocity, and enable innovation.",
  keywords: [
    "claude code analytics",
    "anthropic analytics",
    "AI coding analytics",
    "github copilot analytics",
    "openai codex analytics",
    "gemini analytics",
    "AI assistant metrics",
    "LLM coding tracker",
    "AI pair programming",
    "developer productivity AI",
    "code generation metrics",
    "Claude Code",
    "cursor analytics",
    "AI coding tools",
  ],
  authors: [{ name: "TokenScope" }],
  creator: "TokenScope",
  metadataBase: new URL("https://tokenscope.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tokenscope.dev",
    siteName: "TokenScope",
    title: "TokenScope - AI Coding Analytics | Developer Productivity Metrics",
    description: "Track your AI-assisted coding activity. Analytics for AI coding tools. Measure ROI, drive velocity, and enable innovation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TokenScope - AI Coding Analytics",
    description: "Track your AI-assisted coding activity. Measure ROI, drive velocity, and enable innovation with AI coding tools.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
