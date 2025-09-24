
export const metadata = { title: "PKV Gesundheits-Check", description: "Schnelle, ehrliche Einschätzung." }
export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="de">
      <head />
      <body className="antialiased">{children}</body>
    </html>
  )
}
