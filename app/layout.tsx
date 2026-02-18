import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Build in Public Tool",
  description: "Share your development work and learnings consistently",
  other: {
    "talentapp:project_verification":
      "767cdb303f09ae57de902f479281454293e7e00cd5dde03ec45ab55a8462b6c3745994f99b3dca33c0cc8739afca6e69a4f816b2299df9f910a75508112a3e9f",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
