import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RasaPilot — menus with cultural signal",
  description: "Turn local taste signals into culturally grounded menu concepts and launch plans.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
