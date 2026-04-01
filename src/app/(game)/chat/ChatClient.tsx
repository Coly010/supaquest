"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { sendMessage } from "@/lib/api"

interface Message {
  id: string
  content: string
  createdAt: string
  senderId: string
  senderDisplayName: string
}

interface Props {
  initialMessages: Message[]
  currentUserId: string
  currentUserDisplayName: string
}

export function ChatClient({ initialMessages, currentUserId, currentUserDisplayName }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Realtime subscription — receive messages from other players
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("chat:general")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: "channel=eq.general",
        },
        (payload) => {
          const row = payload.new as {
            id: string
            content: string
            created_at: string
            sender_id: string
          }
          // Skip own messages — already appended optimistically
          if (row.sender_id === currentUserId) return
          setMessages((prev) => [
            ...prev,
            {
              id: row.id,
              content: row.content,
              createdAt: row.created_at,
              senderId: row.sender_id,
              // Display name not available from postgres_changes payload — fetch or fallback
              senderDisplayName: "...",
            },
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || sending) return

    // Optimistic append
    const optimisticId = `opt-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        content,
        createdAt: new Date().toISOString(),
        senderId: currentUserId,
        senderDisplayName: currentUserDisplayName,
      },
    ])
    setDraft("")
    setSending(true)
    setError(null)

    const result = await sendMessage("general", content)
    setSending(false)
    if (!result.ok) {
      setError(result.error)
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Message list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "6px 6px 0 0",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}>
        {messages.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875em", textAlign: "center", margin: "auto 0" }}>
            No messages yet. Be the first to say something.
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId
          return (
            <div key={msg.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <span style={{
                color: isOwn ? "var(--green)" : "var(--blue)",
                minWidth: "120px",
                fontSize: "0.8em",
                paddingTop: "2px",
                flexShrink: 0,
              }}>
                {msg.senderDisplayName}
              </span>
              <span style={{ color: "var(--text)", fontSize: "0.875em", wordBreak: "break-word" }}>
                {msg.content}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: "var(--red)", fontSize: "0.8em", padding: "0.25rem 0" }}>
          &gt; {error}
        </p>
      )}

      {/* Input area */}
      <div style={{ display: "flex", gap: "0.5rem", borderTop: "0" }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          maxLength={280}
          rows={2}
          style={{
            flex: 1,
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 0 6px",
            color: "var(--text)",
            padding: "0.6rem 0.75rem",
            fontSize: "0.875em",
            resize: "none",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderLeft: "none",
            borderRadius: "0 0 6px 0",
            color: sending ? "var(--text-muted)" : "var(--green)",
            padding: "0 1rem",
            cursor: sending ? "not-allowed" : "pointer",
            fontSize: "0.875em",
          }}
        >
          {sending ? "…" : "send"}
        </button>
      </div>
    </div>
  )
}
