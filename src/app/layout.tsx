import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({ src: "../../public/fonts/inter-latin-variable.woff2", variable: "--font-inter", weight: "400 700", display: "swap", adjustFontFallback: false });
const thai = localFont({
  src: [
    { path: "../../public/fonts/ibm-plex-sans-thai-400.woff2", weight: "400" },
    { path: "../../public/fonts/ibm-plex-sans-thai-500.woff2", weight: "500" },
    { path: "../../public/fonts/ibm-plex-sans-thai-600.woff2", weight: "600" },
  ],
  variable: "--font-thai", display: "swap", adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Virtual Phin | เรียนพิณไทยด้วย AI",
  description: "แพลตฟอร์มเรียนรู้พิณไทยด้วย Computer Vision และ Augmented Reality",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e9edf2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable}`}>
      <body><a href="#main-content" className="skip-link">ข้ามไปเนื้อหาหลัก</a>{children}</body>
    </html>
  );
}
