import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fiorell - Find Your Perfect Match",
  description:
    "Modern dating app to connect hearts and build meaningful relationships",
  icons: {
    icon: "/favicon.svg",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NotificationProvider>
            <div className="min-h-screen pb-20">{children}</div>
            {/* Bottom navigation rendered on all pages; component hides itself on chat detail */}
            <BottomNav />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
