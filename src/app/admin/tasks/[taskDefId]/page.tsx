// Admin task edit page — loads task definition, renders the edit form.

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { TaskEditClient } from "./TaskEditClient"

export default async function TaskEditPage({
  params,
}: {
  params: Promise<{ taskDefId: string }>
}) {
  const { taskDefId } = await params
  const supabase = await createClient()

  const { data: task } = await supabase
    .from("task_definitions")
    .select("id, name, description, skill_id, level_required, focus_cost, success_rate, rewards")
    .eq("id", taskDefId)
    .single()

  if (!task) notFound()

  return (
    <TaskEditClient
      task={{
        ...task,
        rewards: (task.rewards as Record<string, unknown>) ?? null,
      }}
    />
  )
}
