import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knot - Split rides. Stay safe. Save money.",
  description:
    "Find travelers heading to the same destination and split your ride costs. Match with verified users and save on every trip.",
  keywords: ["rideshare", "split fare", "travel", "matching"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Knot",
  },
  icons: {
    icon: "/knot-logo.png",
    apple: "/knot-logo.png",
    shortcut: "/knot-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
