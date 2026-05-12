import type { Metadata } from "next";
import "./globals.css";
import { Rocket } from "@/components/rocket";

export const metadata: Metadata = {
  title: "Micro ERP",
  description: "A small resource planning and prioritization app."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Rocket />
      </body>
    </html>
  );
}
