// Tasks page — shows available dev tasks grouped by discipline, with attempt buttons.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TasksClient } from "./TasksClient"

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const [tasksRes, playerRes, skillsRes, resourcesRes] = await Promise.all([
    supabase.from("task_definitions").select("*").order("level_required"),
    supabase.from("players").select("level").eq("id", user.id).single(),
    supabase.from("player_skills").select("*").eq("player_id", user.id),
    supabase
      .from("player_resources")
      .select("resource_type, current, maximum")
      .eq("player_id", user.id),
  ])

  const tasks = tasksRes.data ?? []
  const playerLevel = playerRes.data?.level ?? 1
  const skills = skillsRes.data ?? []
  const focus = resourcesRes.data?.find((r) => r.resource_type === "focus")

  return (
    <TasksClient
      tasks={tasks}
      playerLevel={playerLevel}
      skills={skills}
      initialFocus={focus?.current ?? 0}
      maxFocus={focus?.maximum ?? 100}
    />
  )
}
