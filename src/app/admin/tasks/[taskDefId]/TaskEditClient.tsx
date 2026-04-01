"use client"

// Task edit form — allows admins to update task fields.

import { useState } from "react"
import { adminUpdateTask } from "@/lib/api"

interface TaskRow {
  id: string
  name: string
  description: string
  skill_id: string
  level_required: number
  focus_cost: number
  success_rate: number
  rewards: Record<string, unknown> | null
}

const SKILL_OPTIONS = ["debugging", "data_mining", "architecture"]

export function TaskEditClient({ task }: { task: TaskRow }) {
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description)
  const [skillId, setSkillId] = useState(task.skill_id)
  const [levelRequired, setLevelRequired] = useState(String(task.level_required))
  const [focusCost, setFocusCost] = useState(String(task.focus_cost))
  const [successRate, setSuccessRate] = useState(String(task.success_rate))
  const [rewardsJson, setRewardsJson] = useState(
    JSON.stringify(task.rewards ?? {}, null, 2)
  )
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    let rewards: Record<string, unknown> | undefined
    try {
      rewards = JSON.parse(rewardsJson)
    } catch {
      setFeedback({ ok: false, message: "rewards is not valid JSON" })
      setSaving(false)
      return
    }

    const rate = Number(successRate)
    if (rate < 0 || rate > 1) {
      setFeedback({ ok: false, message: "success_rate must be between 0 and 1" })
      setSaving(false)
      return
    }

    const result = await adminUpdateTask(task.id, {
      name,
      description,
      level_required: Number(levelRequired),
      focus_cost: Number(focusCost),
      success_rate: rate,
      rewards,
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
      <h1 style={{ marginBottom: "0.25rem" }}>{task.name}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.85em" }}>
        {task.id} · {task.skill_id}
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

        <label>
          <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
            Skill
          </span>
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            style={{ padding: "0.4rem 0.6rem" }}
          >
            {SKILL_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
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
              Focus cost
            </span>
            <input
              type="number"
              value={focusCost}
              onChange={(e) => setFocusCost(e.target.value)}
              min={0}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
              Success rate (0–1)
            </span>
            <input
              type="number"
              value={successRate}
              onChange={(e) => setSuccessRate(e.target.value)}
              min={0}
              max={1}
              step={0.01}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
            />
          </label>
        </div>

        <label>
          <span style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85em", color: "var(--text-muted)" }}>
            Rewards (JSON)
          </span>
          <textarea
            value={rewardsJson}
            onChange={(e) => setRewardsJson(e.target.value)}
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
