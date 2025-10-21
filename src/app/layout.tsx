import type { Metadata } from "next";
import { Nanum_Gothic } from "next/font/google";
import { Toaster } from "sonner";
import QueryProvider from "./_components/QueryProvider";
import { ThemeProvider } from "./_components/ThemeProvider";
import "./globals.css";

const nanumGothic = Nanum_Gothic({
  variable: "--font-nanum-gothic",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Backup Server - DevHong",
  description: "개인 백업 서버 - 사진과 동영상을 안전하게 저장하세요",
  keywords: ["backup", "photo", "video", "storage", "백업", "사진", "동영상"],
  authors: [{ name: "DevHong" }],
  creator: "DevHong",
  publisher: "DevHong",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${nanumGothic.variable} antialiased`}>
        <Toaster richColors expand />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
