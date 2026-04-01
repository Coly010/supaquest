// Onboarding page — shown to authenticated users who haven't created a profile yet.
// Prompts for username and display name, then calls the create-profile Edge Function.

"use client"

import { useState } from "react"
import { createProfile } from "@/lib/api"

export default function OnboardingPage() {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await createProfile(username, displayName)
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    // Use a hard navigation to bypass the Next.js Router Cache.
    // router.push("/dashboard") can replay a cached redirect from the initial
    // visit to /dashboard (before the profile existed), looping back here.
    window.location.href = "/dashboard"
  }

  return (
    <main style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
    }}>
      <div style={{ maxWidth: "420px", width: "100%" }}>
        <h1 style={{ color: "var(--green)", marginTop: 0 }}>&gt; Create your developer profile</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          Welcome to SupaQuest. Choose your username — it&apos;s permanent and public.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", color: "var(--text-muted)" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. dev_wizard"
              style={{ width: "100%" }}
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
            />
            <p style={{ color: "var(--text-muted)", fontSize: "0.75em", margin: "4px 0 0" }}>
              3–24 characters, letters, numbers, and underscores only.
            </p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", color: "var(--text-muted)" }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. The Debug Wizard"
              style={{ width: "100%" }}
              required
              maxLength={32}
            />
          </div>

          {error && (
            <p style={{ color: "var(--red)", margin: 0 }}>&gt; Error: {error}</p>
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
              fontSize: "14px",
            }}
          >
            {loading ? "Creating profile..." : "> Initialize developer profile"}
          </button>
        </form>
      </div>
    </main>
  )
}
