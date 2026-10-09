import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import AuthGuard from "./_components/AuthGuard";
import ThemeProvider from "./_components/ThemeProvider";
import AppShell from "./_components/AppShell";
import { siteUrl } from "@/lib/siteUrl";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "11AANGIIHAN — 11A Ангийнхан",
    template: "%s | 11AANGIIHAN",
  },
  description:
    "11AANGIIHAN — 11A ангийнхны апп: хичээлийн хуваарь, гэрийн даалгавар, жижүүр, мэдээний самбар, чат, автобусны суудал.",
  keywords: ["11AANGIIHAN", "11A angiihan", "11A ангийнхан", "11A", "11A анги", "11A ангийн апп", "angiin web"],
  applicationName: "11AANGIIHAN",
  openGraph: {
    title: "11AANGIIHAN — 11A Ангийнхан",
    description: "Хичээлийн хуваарь, даалгавар, мэдээ, чат — 11A ангийнхандаа",
    siteName: "11AANGIIHAN",
    locale: "mn_MN",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  // Google Search Console-ийн баталгаажуулалт (Vercel env-д нэмнэ)
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  appleWebApp: { capable: true, title: "11A", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area-inset ажиллахад шаардлагатай
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface text-on-surface transition-colors duration-300`}
      >
        <ThemeProvider>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>

          <Toaster position="top-right" richColors closeButton duration={3000} />
        </ThemeProvider>
      </body>
    </html>
  );
}
