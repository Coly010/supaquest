"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { buyItem } from "@/lib/api"

interface ShopItem {
  item_def_id: string
  price_buy: number
  price_sell: number
  stock: number | null
  item: {
    id: string
    name: string
    description: string
    item_type: string
    slot: string | null
    base_stats: Record<string, number>
    level_required: number
    stackable: boolean
    gem_slot_count: number
  }
}

interface Props {
  shopId: string
  shopName: string
  shopDescription: string
  items: ShopItem[]
  credits: number
  ownedItemIds: string[]
}

export function ShopDetailClient({
  shopId,
  shopName,
  shopDescription,
  items,
  credits: initialCredits,
  ownedItemIds: initialOwned,
}: Props) {
  const router = useRouter()
  const [credits, setCredits] = useState(initialCredits)
  const [ownedItemIds, setOwnedItemIds] = useState(new Set(initialOwned))
  const [buying, setBuying] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const handleBuy = async (itemDefId: string, price: number) => {
    setBuying(itemDefId)
    setMessage(null)

    const result = await buyItem(shopId, itemDefId)
    setBuying(null)

    if (!result.ok) {
      setMessage({ text: result.error, ok: false })
      return
    }

    setCredits((c) => c - price)
    setOwnedItemIds((s) => new Set([...s, itemDefId]))
    setMessage({ text: `Purchased! Paid ${price} Credits.`, ok: true })
    router.refresh()
  }

  const statLabels: Record<string, string> = {
    logic: "Logic",
    resilience: "Resilience",
    throughput: "Throughput",
    serendipity: "Serendipity",
    max_uptime: "Max Uptime",
  }

  return (
    <div>
      <h1 style={{ color: "var(--green)", marginTop: 0 }}>&gt; {shopName}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}>{shopDescription}</p>
      <p style={{ color: "var(--yellow)", marginBottom: "1.5rem", fontSize: "0.875em" }}>
        Credits: {credits}
      </p>

      {message && (
        <p style={{ color: message.ok ? "var(--green)" : "var(--red)", marginBottom: "1rem" }}>
          &gt; {message.text}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map(({ item_def_id, price_buy, price_sell, stock, item }) => {
          const canAfford = credits >= price_buy
          const isOwned = ownedItemIds.has(item_def_id) && !item.stackable
          const isBuying = buying === item_def_id
          const statEntries = Object.entries(item.base_stats ?? {}).filter(([, v]) => v !== 0)

          return (
            <div key={item_def_id} style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "1rem",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "0.75rem",
              alignItems: "start",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "var(--text)", fontWeight: "bold" }}>{item.name}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75em" }}>
                    [{item.item_type}{item.slot ? ` · ${item.slot.replace("_", " ")}` : ""}]
                  </span>
                  {item.level_required > 1 && (
                    <span style={{ color: "var(--orange)", fontSize: "0.75em" }}>
                      Lv {item.level_required}+
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 0.4rem", color: "var(--text-muted)", fontSize: "0.8em" }}>
                  {item.description}
                </p>
                {statEntries.length > 0 && (
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {statEntries.map(([stat, val]) => (
                      <span key={stat} style={{ color: "var(--green)", fontSize: "0.75em" }}>
                        +{val} {statLabels[stat] ?? stat}
                      </span>
                    ))}
                  </div>
                )}
                {item.gem_slot_count > 0 && (
                  <span style={{ color: "var(--purple)", fontSize: "0.75em" }}>
                    {item.gem_slot_count} gem slot{item.gem_slot_count > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div style={{ textAlign: "right", minWidth: "110px" }}>
                <div style={{ color: "var(--yellow)", fontSize: "0.875em", marginBottom: "0.25rem" }}>
                  {price_buy} ¢
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75em", marginBottom: "0.5rem" }}>
                  sells for {price_sell} ¢
                </div>
                {stock !== null && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.7em", marginBottom: "0.4rem" }}>
                    stock: {stock}
                  </div>
                )}
                <button
                  onClick={() => handleBuy(item_def_id, price_buy)}
                  disabled={!canAfford || isBuying || isOwned}
                  style={{
                    background: canAfford && !isOwned ? "var(--green-dim)" : "transparent",
                    color: canAfford && !isOwned ? "var(--text)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    fontSize: "0.8em",
                    cursor: canAfford && !isOwned ? "pointer" : "not-allowed",
                  }}
                >
                  {isBuying ? "..." : isOwned ? "owned" : !canAfford ? "no credits" : "buy"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
