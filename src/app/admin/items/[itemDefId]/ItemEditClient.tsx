"use client"

// Item edit form — allows admins to update item fields via the admin/update-item Edge Function.

import { useState } from "react"
import { adminUpdateItem } from "@/lib/api"

interface ItemRow {
  id: string
  name: string
  description: string | null
  item_type: string
  level_required: number
  base_value: number
  gem_slot_count: number
  base_stats: Record<string, number> | null
}

export function ItemEditClient({ item }: { item: ItemRow }) {
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description ?? "")
  const [baseValue, setBaseValue] = useState(String(item.base_value))
  const [levelRequired, setLevelRequired] = useState(String(item.level_required))
  const [gemSlotCount, setGemSlotCount] = useState(String(item.gem_slot_count))
  const [baseStatsJson, setBaseStatsJson] = useState(
    JSON.stringify(item.base_stats ?? {}, null, 2)
  )
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    let base_stats: Record<string, number> | undefined
    try {
      base_stats = JSON.parse(baseStatsJson)
    } catch {
      setFeedback({ ok: false, message: "base_stats is not valid JSON" })
      setSaving(false)
      return
    }

    const result = await adminUpdateItem(item.id, {
      name,
      description: description || undefined,
      base_value: Number(baseValue),
      level_required: Number(levelRequired),
      gem_slot_count: Number(gemSlotCount),
      base_stats,
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
      <h1 style={{ marginBottom: "0.25rem" }}>{item.name}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.85em" }}>
        {item.id} · {item.item_type}
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
              Base value
            </span>
            <input
              type="number"
              value={baseValue}
              onChange={(e) => setBaseValue(e.target.value)}
              min={0}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
              Level required
            </span>
            <input
              type="number"
              value={levelRequired}
              onChange={(e) => setLevelRequired(e.target.value)}
              min={1}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
              Gem slots
            </span>
            <input
              type="number"
              value={gemSlotCount}
              onChange={(e) => setGemSlotCount(e.target.value)}
              min={0}
              max={4}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>
        </div>

        <label>
          <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
            Base stats (JSON)
          </span>
          <textarea
            value={baseStatsJson}
            onChange={(e) => setBaseStatsJson(e.target.value)}
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
