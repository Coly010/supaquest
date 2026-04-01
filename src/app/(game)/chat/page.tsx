// Chat page — global "general" channel.
// Server component loads the last 50 messages; ChatClient subscribes to Realtime for live updates.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatClient } from "./ChatClient"

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const [messagesRes, profileRes] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, channel, content, created_at, sender_id, sender:players!sender_id(display_name)")
      .eq("channel", "general")
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("players")
      .select("display_name")
      .eq("id", user.id)
      .single(),
  ])

  const messages = (messagesRes.data ?? []).map((row) => {
    const r = row as typeof row & { sender: { display_name: string } | null }
    return {
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      senderId: r.sender_id,
      senderDisplayName: r.sender?.display_name ?? "Unknown",
    }
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      <h1 style={{ color: "var(--green)", margin: "0 0 1rem", flexShrink: 0 }}>&gt; Global Chat</h1>
      <ChatClient
        initialMessages={messages}
        currentUserId={user.id}
        currentUserDisplayName={profileRes.data?.display_name ?? "You"}
      />
    </div>
  )
}
