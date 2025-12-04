import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import PWARegister from "@/components/PWARegister";
import ConditionalFooter from "@/components/ConditionalFooter";

export const metadata: Metadata = {
  title: "Lewis Retails Loyalty - Customer Rewards Platform",
  description: "Track customer visits and reward loyalty with automated receipt verification at Lewis Retails",
  keywords: "loyalty, rewards, QR code, customer engagement, retail, Lewis Retails",
  manifest: "/manifest.json",
  themeColor: "#FF701A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lewis Loyalty",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  icons: {
    icon: "/Lewis_Retails_logo_2.png",
    apple: "/Lewis_Retails_logo_2.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <ConditionalFooter />
            <PWARegister />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

