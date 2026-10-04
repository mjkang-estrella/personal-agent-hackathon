import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "JobSwitch — Your next chapter, handled.",
  description: "Your personal agent for everything between two jobs.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
