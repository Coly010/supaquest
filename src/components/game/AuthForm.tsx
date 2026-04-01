"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Mode = "login" | "signup"

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    const supabase = createClient()

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setMessage("Account created! Redirecting...")
      router.push("/onboarding")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setMode("login")}
          style={{
            background: mode === "login" ? "var(--green-dim)" : "transparent",
            color: mode === "login" ? "var(--text)" : "var(--text-muted)",
            border: `1px solid ${mode === "login" ? "var(--green-dim)" : "var(--border)"}`,
            borderRadius: "4px",
            padding: "6px 14px",
          }}
        >
          Log in
        </button>
        <button
          onClick={() => setMode("signup")}
          style={{
            background: mode === "signup" ? "var(--green-dim)" : "transparent",
            color: mode === "signup" ? "var(--text)" : "var(--text-muted)",
            border: `1px solid ${mode === "signup" ? "var(--green-dim)" : "var(--border)"}`,
            borderRadius: "4px",
            padding: "6px 14px",
          }}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "4px", color: "var(--text-muted)" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dev@example.com"
            style={{ width: "100%" }}
            required
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px", color: "var(--text-muted)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%" }}
            required
            minLength={6}
          />
        </div>

        {error && (
          <p style={{ color: "var(--red)", margin: 0 }}>&gt; {error}</p>
        )}
        {message && (
          <p style={{ color: "var(--green)", margin: 0 }}>&gt; {message}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "var(--green-dim)",
            color: "var(--text)",
            border: "none",
            borderRadius: "4px",
            padding: "10px 16px",
            marginTop: "0.5rem",
            fontSize: "14px",
          }}
        >
          {loading
            ? mode === "login"
              ? "Logging in..."
              : "Creating account..."
            : mode === "login"
            ? "> ./login.sh"
            : "> ./signup.sh"}
        </button>
      </form>
    </div>
  )
}
