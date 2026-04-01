"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { attackBug } from "@/lib/api"

interface CombatResult {
  outcome: "win" | "lose"
  bugId: string
  bugName: string
  damageDealt: number
  damageTaken: number
  xpGained: number
  creditsGained: number
  loot: {
    items: string[]
    gems: string[]
  }
}

interface Props {
  areaId: string
  areaName: string
  initialUptime: number
}

export function CombatClient({ areaId, areaName: _areaName, initialUptime }: Props) {
  const router = useRouter()
  const [uptime, setUptime] = useState(initialUptime)
  const [attacking, setAttacking] = useState(false)
  const [lastResult, setLastResult] = useState<CombatResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAttack = async () => {
    setAttacking(true)
    setLastResult(null)
    setError(null)

    const result = await attackBug(areaId)
    setAttacking(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    const data = result.data as CombatResult
    setLastResult(data)
    setUptime((u) => Math.max(0, u - data.damageTaken))
    router.refresh()
  }

  return (
    <div>
      {/* Uptime / status bar */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <span style={{ color: uptime > 20 ? "var(--green)" : "var(--red)", fontSize: "0.875em" }}>
          Uptime: {uptime}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: "var(--red)", marginBottom: "1rem", fontSize: "0.875em" }}>
          &gt; {error}
        </p>
      )}

      {/* Combat result */}
      {lastResult && (
        <div style={{
          background: "var(--bg-panel)",
          border: `1px solid ${lastResult.outcome === "win" ? "var(--green)" : "var(--red)"}`,
          borderRadius: "6px",
          padding: "1rem",
          marginBottom: "1.25rem",
        }}>
          <p style={{ margin: "0 0 0.5rem", color: lastResult.outcome === "win" ? "var(--green)" : "var(--red)", fontWeight: "bold" }}>
            {lastResult.outcome === "win" ? "✓ Bug squashed!" : "✗ You crashed."} — {lastResult.bugName}
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8em", color: "var(--text-muted)" }}>
            <span>DMG dealt: <span style={{ color: "var(--green)" }}>{lastResult.damageDealt}</span></span>
            <span>DMG taken: <span style={{ color: "var(--red)" }}>{lastResult.damageTaken}</span></span>
            {lastResult.xpGained > 0 && (
              <span style={{ color: "var(--blue)" }}>+{lastResult.xpGained} XP</span>
            )}
            {lastResult.creditsGained > 0 && (
              <span style={{ color: "var(--yellow)" }}>+{lastResult.creditsGained} Credits</span>
            )}
            {lastResult.loot.items.length > 0 && (
              <span>Loot: <span style={{ color: "var(--text)" }}>{lastResult.loot.items.join(", ")}</span></span>
            )}
            {lastResult.loot.gems.length > 0 && (
              <span>Gems: <span style={{ color: "var(--purple)" }}>{lastResult.loot.gems.join(", ")}</span></span>
            )}
          </div>
        </div>
      )}

      {/* Attack button */}
      <button
        onClick={handleAttack}
        disabled={attacking}
        style={{
          background: attacking ? "transparent" : "var(--red-dim, var(--bg-panel))",
          color: attacking ? "var(--text-muted)" : "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "10px 24px",
          fontSize: "0.9em",
          cursor: attacking ? "not-allowed" : "pointer",
          letterSpacing: "0.04em",
        }}
      >
        {attacking ? "attacking..." : "> Attack Bug"}
      </button>
    </div>
  )
}
