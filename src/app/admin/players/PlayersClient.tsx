"use client"

// Players management table — grant/revoke admin, adjust resources.

import { useState } from "react"
import { adminGrantAdmin, adminRevokeAdmin, adminAdjustResource } from "@/lib/api"

interface ResourceRow {
  resource_type: string
  current: number
  maximum: number | null
}

interface PlayerSummary {
  id: string
  username: string
  display_name: string
  level: number
  is_admin: boolean
  player_resources: ResourceRow[]
}

export function PlayersClient({ players: initial }: { players: PlayerSummary[] }) {
  const [players, setPlayers] = useState(initial)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [adjustState, setAdjustState] = useState<
    Record<string, { resourceType: string; delta: string }>
  >({})

  const setPlayerFeedback = (id: string, msg: string) => {
    setFeedback((prev) => ({ ...prev, [id]: msg }))
    setTimeout(() => setFeedback((prev) => { const next = { ...prev }; delete next[id]; return next }), 3000)
  }

  const toggleAdmin = async (player: PlayerSummary) => {
    const fn = player.is_admin ? adminRevokeAdmin : adminGrantAdmin
    const result = await fn(player.id)
    if (result.ok) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, is_admin: !player.is_admin } : p))
      )
      setPlayerFeedback(player.id, player.is_admin ? "Admin revoked." : "Admin granted.")
    } else {
      setPlayerFeedback(player.id, `Error: ${result.error}`)
    }
  }

  const handleAdjust = async (player: PlayerSummary) => {
    const state = adjustState[player.id]
    if (!state) return
    const delta = Number(state.delta)
    if (!delta || !state.resourceType) return

    const result = await adminAdjustResource(player.id, state.resourceType, delta)
    if (result.ok) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== player.id) return p
          return {
            ...p,
            player_resources: p.player_resources.map((r) => {
              if (r.resource_type !== state.resourceType) return r
              const newCurrent =
                r.maximum !== null
                  ? Math.max(0, Math.min(r.current + delta, r.maximum))
                  : Math.max(0, r.current + delta)
              return { ...r, current: newCurrent }
            }),
          }
        })
      )
      setAdjustState((prev) => ({ ...prev, [player.id]: { resourceType: state.resourceType, delta: "" } }))
      setPlayerFeedback(player.id, "Resource adjusted.")
    } else {
      setPlayerFeedback(player.id, `Error: ${result.error}`)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Players ({players.length})</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {players.map((player) => {
          const credits = player.player_resources.find((r) => r.resource_type === "credits")
          const focus = player.player_resources.find((r) => r.resource_type === "focus")
          const uptime = player.player_resources.find((r) => r.resource_type === "uptime")
          const adj = adjustState[player.id] ?? { resourceType: "credits", delta: "" }

          return (
            <div
              key={player.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "0.75rem 1rem",
                background: "var(--bg-panel)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ fontWeight: "bold" }}>{player.display_name}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>
                  @{player.username}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>
                  Lv.{player.level}
                </span>
                {player.is_admin && (
                  <span
                    style={{
                      background: "var(--yellow)",
                      color: "#000",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "2px",
                      fontSize: "0.75em",
                      fontWeight: "bold",
                    }}
                  >
                    ADMIN
                  </span>
                )}

                {/* Resources */}
                <span style={{ fontSize: "0.8em", color: "var(--text-muted)", marginLeft: "auto" }}>
                  {credits && <>Credits: {credits.current} · </>}
                  {focus && <>Focus: {focus.current}/{focus.maximum} · </>}
                  {uptime && <>Uptime: {uptime.current}/{uptime.maximum}</>}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => toggleAdmin(player)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.8em",
                    cursor: "pointer",
                    color: player.is_admin ? "var(--red)" : "var(--green)",
                  }}
                >
                  {player.is_admin ? "revoke admin" : "grant admin"}
                </button>

                {/* Resource adjustment */}
                <select
                  value={adj.resourceType}
                  onChange={(e) =>
                    setAdjustState((prev) => ({
                      ...prev,
                      [player.id]: { ...adj, resourceType: e.target.value },
                    }))
                  }
                  style={{ padding: "0.2rem 0.4rem", fontSize: "0.8em" }}
                >
                  <option value="credits">credits</option>
                  <option value="focus">focus</option>
                  <option value="uptime">uptime</option>
                </select>
                <input
                  type="number"
                  placeholder="±delta"
                  value={adj.delta}
                  onChange={(e) =>
                    setAdjustState((prev) => ({
                      ...prev,
                      [player.id]: { ...adj, delta: e.target.value },
                    }))
                  }
                  style={{ width: "80px", padding: "0.2rem 0.4rem", fontSize: "0.8em" }}
                />
                <button
                  onClick={() => handleAdjust(player)}
                  disabled={!adj.delta}
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.8em", cursor: "pointer" }}
                >
                  adjust
                </button>

                {feedback[player.id] && (
                  <span
                    style={{
                      fontSize: "0.8em",
                      color: feedback[player.id].startsWith("Error") ? "var(--red)" : "var(--green)",
                    }}
                  >
                    {feedback[player.id]}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
