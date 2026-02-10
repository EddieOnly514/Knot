import type { Metadata } from "next";
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
    "Find travelers heading to the same destination and split your ride costs. Match with verified users and save up to 50% on airport rides.",
  keywords: ["rideshare", "airport", "split fare", "travel", "matching"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-slate-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
