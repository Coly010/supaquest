"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { attemptTask } from "@/lib/api"

interface TaskDef {
  id: string
  name: string
  description: string
  skill_id: string
  level_required: number
  focus_cost: number
  success_rate: number
  rewards: Record<string, unknown>
  gem_rewards: unknown
  failure_penalty: Record<string, unknown> | null
}

interface Skill {
  skill_id: string
  level: number
  xp: number
  xp_to_next: number
}

interface Props {
  tasks: TaskDef[]
  playerLevel: number
  skills: Skill[]
  initialFocus: number
  maxFocus: number
}

interface AttemptResult {
  taskId: string
  outcome: "success" | "failure"
  rewardsGiven: {
    credits?: number
    xp?: number
    skillXp?: number
    gems?: string[]
  }
}

const SKILL_LABELS: Record<string, string> = {
  debugging: "Debugging",
  data_mining: "Data Mining",
  architecture: "Architecture",
}

const SKILL_COLORS: Record<string, string> = {
  debugging: "var(--red)",
  data_mining: "var(--blue)",
  architecture: "var(--purple)",
}

export function TasksClient({ tasks, playerLevel, skills, initialFocus, maxFocus }: Props) {
  const router = useRouter()
  const [focus, setFocus] = useState(initialFocus)
  const [attempting, setAttempting] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<AttemptResult | null>(null)

  const skillMap = Object.fromEntries(skills.map((s) => [s.skill_id, s]))

  const handleAttempt = async (taskId: string, focusCost: number) => {
    setAttempting(taskId)
    setLastResult(null)
    const result = await attemptTask(taskId)
    setAttempting(null)

    if (!result.ok) {
      setLastResult({
        taskId,
        outcome: "failure",
        rewardsGiven: { xp: undefined },
      })
      return
    }

    const { outcome, rewardsGiven } = result.data
    setFocus((f) => Math.max(0, f - focusCost))
    setLastResult({ taskId, outcome, rewardsGiven })
    router.refresh()
  }

  const skillGroups = ["debugging", "data_mining", "architecture"]

  return (
    <div>
      <h1 style={{ color: "var(--green)", marginTop: 0 }}>&gt; Dev Tasks</h1>

      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <span style={{ color: "var(--blue)", fontSize: "0.875em" }}>
          Focus: {focus} / {maxFocus}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.875em" }}>
          Seniority: {playerLevel}
        </span>
      </div>

      {/* Last result banner */}
      {lastResult && (
        <div style={{
          background: lastResult.outcome === "success" ? "var(--bg-panel)" : "var(--bg-panel)",
          border: `1px solid ${lastResult.outcome === "success" ? "var(--green)" : "var(--red)"}`,
          borderRadius: "6px",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
        }}>
          <p style={{ margin: "0 0 0.25rem", color: lastResult.outcome === "success" ? "var(--green)" : "var(--red)" }}>
            {lastResult.outcome === "success" ? "✓ Task completed!" : "✗ Task failed."}
          </p>
          {Object.keys(lastResult.rewardsGiven).length > 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.8em", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {lastResult.rewardsGiven.credits !== undefined && (
                <span style={{ color: "var(--yellow)" }}>+{lastResult.rewardsGiven.credits} Credits</span>
              )}
              {lastResult.rewardsGiven.xp !== undefined && (
                <span style={{ color: "var(--green)" }}>+{lastResult.rewardsGiven.xp} XP</span>
              )}
              {lastResult.rewardsGiven.skillXp !== undefined && (
                <span style={{ color: "var(--blue)" }}>+{lastResult.rewardsGiven.skillXp} Skill XP</span>
              )}
              {lastResult.rewardsGiven.gems && lastResult.rewardsGiven.gems.length > 0 && (
                <span style={{ color: "var(--purple)" }}>
                  Gem drop: {lastResult.rewardsGiven.gems.join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tasks grouped by skill */}
      {skillGroups.map((skillId) => {
        const skillTasks = tasks.filter((t) => t.skill_id === skillId)
        const skill = skillMap[skillId]
        if (skillTasks.length === 0) return null

        return (
          <div key={skillId} style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h2 style={{ margin: 0, color: SKILL_COLORS[skillId], fontSize: "0.9em", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {SKILL_LABELS[skillId] ?? skillId}
              </h2>
              {skill && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.8em" }}>
                  Lv {skill.level} · {skill.xp}/{skill.xp_to_next} xp
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {skillTasks.map((task) => {
                const canAttempt = playerLevel >= task.level_required && focus >= task.focus_cost
                const isLocked = playerLevel < task.level_required
                const isAttempting = attempting === task.id
                const rewards = task.rewards as { credits?: [number, number]; xp?: number; skill_xp?: number }

                return (
                  <div key={task.id} style={{
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "0.75rem 1rem",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "0.75rem",
                    alignItems: "center",
                    opacity: isLocked ? 0.5 : 1,
                  }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <span style={{ color: "var(--text)" }}>{task.name}</span>
                        {isLocked && (
                          <span style={{ color: "var(--red)", fontSize: "0.75em" }}>
                            Lv {task.level_required} req
                          </span>
                        )}
                      </div>
                      <p style={{ margin: "0 0 0.3rem", color: "var(--text-muted)", fontSize: "0.8em" }}>
                        {task.description}
                      </p>
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.75em" }}>
                        <span style={{ color: "var(--blue)" }}>
                          Focus: {task.focus_cost}
                        </span>
                        <span style={{ color: "var(--green)" }}>
                          {Math.round(task.success_rate * 100)}% success
                        </span>
                        {rewards.credits && (
                          <span style={{ color: "var(--yellow)" }}>
                            {rewards.credits[0]}–{rewards.credits[1]} ¢
                          </span>
                        )}
                        {rewards.xp && (
                          <span style={{ color: "var(--text-muted)" }}>
                            +{rewards.xp} XP
                          </span>
                        )}
                        {rewards.skill_xp && (
                          <span style={{ color: SKILL_COLORS[skillId] }}>
                            +{rewards.skill_xp} skill XP
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAttempt(task.id, task.focus_cost)}
                      disabled={!canAttempt || !!attempting}
                      style={{
                        background: canAttempt && !attempting ? "var(--green-dim)" : "transparent",
                        color: canAttempt && !attempting ? "var(--text)" : "var(--text-muted)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        fontSize: "0.8em",
                        cursor: canAttempt && !attempting ? "pointer" : "not-allowed",
                        minWidth: "80px",
                      }}
                    >
                      {isAttempting ? "..." : isLocked ? "locked" : focus < task.focus_cost ? "no focus" : "attempt"}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
