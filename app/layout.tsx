import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/Scene/AppShell";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const data = resume as ResumeData;

export const metadata: Metadata = {
  title: `${data.profile.name} — ${data.profile.role}`,
  description: data.profile.tagline,
  openGraph: {
    title: `${data.profile.name} — ${data.profile.role}`,
    description: data.profile.tagline,
    url: "https://your-resume-url.com",
    siteName: "Interactive 3D Portfolio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${data.profile.name} — ${data.profile.role}`,
    description: data.profile.tagline,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${monoFont.variable}`}>
      <body className="font-display bg-void text-fog">


        {/* The 3D experience lives in the layout so it survives route
            changes — navigation only swaps the DOM overlay above it. */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
