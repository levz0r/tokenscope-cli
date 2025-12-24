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
  title: "TokenScope - AI Coding Analytics",
  description: "Track your AI-assisted coding activity. Analytics for Claude Code including tool usage, file changes, git operations, and more.",
  keywords: ["AI coding", "Claude Code", "analytics", "developer tools", "code metrics", "git analytics", "AI assistant", "coding productivity"],
  authors: [{ name: "TokenScope" }],
  creator: "TokenScope",
  metadataBase: new URL("https://tokenscope.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tokenscope.dev",
    siteName: "TokenScope",
    title: "TokenScope - AI Coding Analytics",
    description: "Track your AI-assisted coding activity. Analytics for Claude Code including tool usage, file changes, and git operations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TokenScope - AI Coding Analytics",
    description: "Track your AI-assisted coding activity. Analytics for Claude Code.",
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
