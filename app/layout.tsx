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
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const data = resume as ResumeData;

const SITE_URL = "https://varunns.vercel.app";

// Search results and link previews (LinkedIn, Slack, WhatsApp) are often a
// recruiter's first look, so describe the person, not the 3D sphere.
const currentRole = data.sections
  .find((s) => /experience/i.test(s.title))
  ?.cards[0];
const description = [
  `${data.profile.name} — ${data.profile.role}.`,
  currentRole &&
    `${currentRole.eyebrow ?? currentRole.subtitle} at ${currentRole.title}.`,
  "Experience, projects, certifications and resume.",
]
  .filter(Boolean)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${data.profile.name} — ${data.profile.role}`,
  description,
  openGraph: {
    title: `${data.profile.name} — ${data.profile.role}`,
    description,
    url: SITE_URL,
    siteName: data.profile.name,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${data.profile.name} — ${data.profile.role}`,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe7" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
};


// Stamp the theme on <html> before first paint so neither the CSS tokens
// nor the WebGL clear color ever flash the wrong room.
const themeInit = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${monoFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-display bg-void text-fog">


        {/* The 3D experience lives in the layout so it survives route
            changes — navigation only swaps the DOM overlay above it. */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
