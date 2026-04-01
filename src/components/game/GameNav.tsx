"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface GameNavProps {
  displayName: string
  level: number
  isAdmin: boolean
}

const navLinks = [
  { href: "/dashboard", label: "dashboard" },
  { href: "/inventory", label: "inventory" },
  { href: "/shops", label: "shops" },
  { href: "/tasks", label: "tasks" },
  { href: "/environments", label: "environments" },
  { href: "/chat", label: "chat" },
]

export function GameNav({ displayName, level, isAdmin }: GameNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav style={{
      background: "var(--bg-panel)",
      borderBottom: "1px solid var(--border)",
      padding: "0.75rem 1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
      flexWrap: "wrap",
    }}>
      <span style={{ color: "var(--green)", fontWeight: "bold" }}>
        SupaQuest
      </span>

      <span style={{ color: "var(--text-muted)", fontSize: "0.8em" }}>
        [{displayName} · Lv {level}]
      </span>

      <div style={{ display: "flex", gap: "1rem", flex: 1, flexWrap: "wrap" }}>
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              color: pathname === href || pathname.startsWith(href + "/")
                ? "var(--green)"
                : "var(--text-muted)",
              fontSize: "0.875em",
            }}
          >
            ./{label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            style={{
              color: pathname.startsWith("/admin") ? "var(--yellow)" : "var(--text-muted)",
              fontSize: "0.875em",
            }}
          >
            ./admin
          </Link>
        )}
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
          borderRadius: "4px",
          padding: "4px 10px",
          fontSize: "0.8em",
        }}
      >
        logout
      </button>
    </nav>
  )
}
