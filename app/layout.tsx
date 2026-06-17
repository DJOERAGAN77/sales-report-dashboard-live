import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Report Dashboard",
  description: "Live management dashboard for sales performance reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}