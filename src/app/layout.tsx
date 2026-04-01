import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SupaQuest",
  description: "A text-based MMORPG for developers",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
