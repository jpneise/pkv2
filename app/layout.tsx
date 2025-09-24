import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PKV Gesundheits-Check",
  description: "Schnell prüfen, ob private Krankenversicherung möglich/sinnvoll ist.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        {/* ===== MUSS sichtbar sein ===== */}
        <div style={{ border: "4px solid red", padding: 8, margin: 8, fontWeight: 600 }}>
          LAYOUT-TEST: Diese rote Box MUSS erscheinen.
        </div>
        {children}
      </body>
    </html>
  );
}
