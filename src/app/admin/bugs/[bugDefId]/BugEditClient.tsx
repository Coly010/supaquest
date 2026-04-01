"use client"

// Bug (NPC) edit form — allows admins to update bug fields.

import { useState } from "react"
import { adminUpdateBug } from "@/lib/api"

interface BugRow {
  id: string
  name: string
  description: string
  level: number
  stats: Record<string, number> | null
  xp_reward: number
  uptime: number
}

export function BugEditClient({ bug }: { bug: BugRow }) {
  const [name, setName] = useState(bug.name)
  const [description, setDescription] = useState(bug.description)
  const [level, setLevel] = useState(String(bug.level))
  const [xpReward, setXpReward] = useState(String(bug.xp_reward))
  const [uptime, setUptime] = useState(String(bug.uptime))
  const [statsJson, setStatsJson] = useState(JSON.stringify(bug.stats ?? {}, null, 2))
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    let stats: Record<string, number> | undefined
    try {
      stats = JSON.parse(statsJson)
    } catch {
      setFeedback({ ok: false, message: "stats is not valid JSON" })
      setSaving(false)
      return
    }

    const result = await adminUpdateBug(bug.id, {
      name,
      description,
      level: Number(level),
      xp_reward: Number(xpReward),
      uptime: Number(uptime),
      stats,
    })

    if (result.ok) {
      setFeedback({ ok: true, message: "Saved." })
    } else {
      setFeedback({ ok: false, message: result.error })
    }
    setSaving(false)
  }

  return (
    <div>
      <h1 style={{ marginBottom: "0.25rem" }}>{bug.name}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.85em" }}>
        {bug.id}
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "560px" }}>
        <label>
          <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
          />
        </label>

        <label>
          <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box", resize: "vertical" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
          <label>
            <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
              Level
            </span>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              min={1}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
              XP reward
            </span>
            <input
              type="number"
              value={xpReward}
              onChange={(e) => setXpReward(e.target.value)}
              min={0}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
              Uptime (HP)
            </span>
            <input
              type="number"
              value={uptime}
              onChange={(e) => setUptime(e.target.value)}
              min={1}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>
        </div>

        <label>
          <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
            Stats (JSON)
          </span>
          <textarea
            value={statsJson}
            onChange={(e) => setStatsJson(e.target.value)}
            rows={6}
            style={{
              width: "100%",
              padding: "0.4rem 0.6rem",
              boxSizing: "border-box",
              fontFamily: "monospace",
              fontSize: "0.85em",
              resize: "vertical",
            }}
          />
        </label>

        {feedback && (
          <p style={{ color: feedback.ok ? "var(--green)" : "var(--red)", margin: 0 }}>
            {feedback.message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{ alignSelf: "flex-start", padding: "0.4rem 1.2rem" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  )
}
