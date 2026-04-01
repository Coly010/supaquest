// Landing page — shows auth form (sign up / log in).
// Redirects authenticated users to /dashboard.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthForm } from "@/components/game/AuthForm"

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
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
        <pre style={{ color: "var(--green)", fontSize: "11px", lineHeight: 1.2, marginBottom: "2rem" }}>
{`  _____                      ____                  _
 / ____|                    / __ \\                | |
| (___  _   _ _ __   __ _| |  | |_   _  ___  ___| |_
 \\___ \\| | | | '_ \\ / _\` | |  | | | | |/ _ \\/ __| __|
 ____) | |_| | |_) | (_| | |__| | |_| |  __/\\__ \\ |_
|_____/ \\__,_| .__/ \\__,_|\\___\\_\\\\__,_|\\___||___/\\__|
              | |
              |_|`}
        </pre>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          A text-based MMORPG for developers learning Supabase.
          Fight bugs, mine data, architect schemas.
        </p>
        <AuthForm />
      </div>
    </main>
  )
}
