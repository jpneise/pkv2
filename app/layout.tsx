import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PKV Gesundheits-Check",
  description: "Schnell prüfen, ob private Krankenversicherung sinnvoll/möglich ist.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        {/* sichtbarer Test: diese rote Box MUSS oben erscheinen */}
        <div style={{ border: "4px solid red", padding: 8, margin: 8 }}>
          CSS-Probe: Wenn du diese Box siehst, wird <code>layout.tsx</code> gerendert.
        </div>
        {children}
      </body>
    </html>
  );
}
