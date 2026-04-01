"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { equipItem, unequipItem, sellItem, socketGem } from "@/lib/api"

interface ItemDef {
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

interface InventoryRow {
  id: string
  item_def_id: string
  quantity: number
  is_equipped: boolean
  equipped_slot: string | null
  item: ItemDef
}

interface Props {
  initialInventory: InventoryRow[]
  playerLevel: number
  initialCredits: number
}

export function InventoryClient({ initialInventory, playerLevel, initialCredits }: Props) {
  const router = useRouter()
  const [inventory, setInventory] = useState(initialInventory)
  const [credits, setCredits] = useState(initialCredits)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  // Gem socketing state
  const [socketTarget, setSocketTarget] = useState<string | null>(null) // inventoryId of item to socket into
  const [socketSlot, setSocketSlot] = useState(0)

  const flash = (text: string, ok: boolean) => {
    setMessage({ text, ok })
    setTimeout(() => setMessage(null), 3500)
  }

  const handleEquip = async (invId: string) => {
    setBusy(invId)
    const result = await equipItem(invId)
    setBusy(null)
    if (!result.ok) { flash(result.error, false); return }
    flash(`Equipped to ${result.data.equippedSlot.replace("_", " ")} slot.`, true)
    router.refresh()
    setInventory((inv) =>
      inv.map((i) => i.id === invId ? { ...i, is_equipped: true, equipped_slot: result.data.equippedSlot } : i)
    )
  }

  const handleUnequip = async (invId: string) => {
    setBusy(invId)
    const result = await unequipItem(invId)
    setBusy(null)
    if (!result.ok) { flash(result.error, false); return }
    flash("Unequipped.", true)
    router.refresh()
    setInventory((inv) =>
      inv.map((i) => i.id === invId ? { ...i, is_equipped: false, equipped_slot: null } : i)
    )
  }

  const handleSell = async (invId: string) => {
    setBusy(invId)
    const result = await sellItem(invId)
    setBusy(null)
    if (!result.ok) { flash(result.error, false); return }
    flash(`Sold for ${result.data.creditsReceived} Credits.`, true)
    setCredits((c) => c + result.data.creditsReceived)
    router.refresh()
    setInventory((inv) => {
      const item = inv.find((i) => i.id === invId)
      if (!item) return inv
      if (item.quantity > 1) {
        return inv.map((i) => i.id === invId ? { ...i, quantity: i.quantity - 1 } : i)
      }
      return inv.filter((i) => i.id !== invId)
    })
  }

  const handleSocketGem = async (invId: string, gemId: string, slot: number) => {
    setBusy(gemId)
    const result = await socketGem(invId, gemId, slot)
    setBusy(null)
    setSocketTarget(null)
    if (!result.ok) { flash(result.error, false); return }
    flash("Gem socketed!", true)
    router.refresh()
    // Remove gem from local inventory list
    setInventory((inv) => inv.filter((i) => i.id !== gemId))
  }

  const statLabels: Record<string, string> = {
    logic: "Logic", resilience: "Resilience",
    throughput: "Throughput", serendipity: "Serendipity", max_uptime: "Max Uptime",
  }

  const equipment = inventory.filter((i) => i.is_equipped)
  const unequipped = inventory.filter((i) => !i.is_equipped && i.item.item_type !== "gem")
  const gems = inventory.filter((i) => i.item.item_type === "gem")
  const socketableItems = inventory.filter((i) => i.item.gem_slot_count > 0)

  const typeColor: Record<string, string> = {
    weapon: "var(--red)", armor: "var(--blue)",
    consumable: "var(--green)", material: "var(--text-muted)", gem: "var(--purple)",
  }

  return (
    <div>
      <h1 style={{ color: "var(--green)", marginTop: 0 }}>&gt; Inventory</h1>
      <p style={{ color: "var(--yellow)", marginBottom: "1.5rem", fontSize: "0.875em" }}>
        Credits: {credits} &nbsp;·&nbsp; Seniority: {playerLevel}
      </p>

      {message && (
        <p style={{ color: message.ok ? "var(--green)" : "var(--red)", marginBottom: "1rem" }}>
          &gt; {message.text}
        </p>
      )}

      {/* Equipped items */}
      {equipment.length > 0 && (
        <Section title="Equipped">
          {equipment.map((row) => (
            <ItemRow
              key={row.id}
              row={row}
              busy={busy === row.id}
              statLabels={statLabels}
              typeColor={typeColor}
              playerLevel={playerLevel}
              onEquip={() => handleEquip(row.id)}
              onUnequip={() => handleUnequip(row.id)}
              onSell={() => handleSell(row.id)}
            />
          ))}
        </Section>
      )}

      {/* Unequipped gear + consumables */}
      {unequipped.length > 0 && (
        <Section title="Bag">
          {unequipped.map((row) => (
            <ItemRow
              key={row.id}
              row={row}
              busy={busy === row.id}
              statLabels={statLabels}
              typeColor={typeColor}
              playerLevel={playerLevel}
              onEquip={() => handleEquip(row.id)}
              onUnequip={() => handleUnequip(row.id)}
              onSell={() => handleSell(row.id)}
            />
          ))}
        </Section>
      )}

      {/* Gems */}
      {gems.length > 0 && (
        <Section title="Gems">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {gems.map((row) => (
              <div key={row.id} style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "0.4rem 0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}>
                <span style={{ color: "var(--purple)" }}>{row.item.name}</span>
                {row.quantity > 1 && (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8em" }}>×{row.quantity}</span>
                )}
                <button
                  onClick={() => { setSocketTarget(row.id); setSocketSlot(0) }}
                  disabled={busy === row.id || socketableItems.length === 0}
                  style={{ ...smallBtn, marginLeft: "4px" }}
                >
                  socket
                </button>
                <button
                  onClick={() => handleSell(row.id)}
                  disabled={busy === row.id}
                  style={{ ...smallBtn }}
                >
                  sell
                </button>
              </div>
            ))}
          </div>

          {/* Inline socket UI */}
          {socketTarget && (
            <div style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "1rem",
              marginTop: "0.5rem",
            }}>
              <p style={{ margin: "0 0 0.5rem", color: "var(--text-muted)", fontSize: "0.875em" }}>
                Socket{" "}
                <span style={{ color: "var(--purple)" }}>
                  {inventory.find((i) => i.id === socketTarget)?.item.name}
                </span>{" "}
                into:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {socketableItems.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ color: "var(--text)", fontSize: "0.875em", minWidth: "160px" }}>
                      {item.item.name}
                    </span>
                    <select
                      value={socketSlot}
                      onChange={(e) => setSocketSlot(Number(e.target.value))}
                      style={{ background: "var(--bg-panel)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 6px", fontSize: "0.8em" }}
                    >
                      {Array.from({ length: item.item.gem_slot_count }, (_, i) => (
                        <option key={i} value={i}>Slot {i + 1}</option>
                      ))}
                    </select>
                    <button
                      disabled={!!busy}
                      onClick={() => handleSocketGem(item.id, socketTarget, socketSlot)}
                      style={{ ...smallBtn, background: "var(--green-dim)" }}
                    >
                      {busy === socketTarget ? "..." : "confirm"}
                    </button>
                  </div>
                ))}
                <button onClick={() => setSocketTarget(null)} style={{ ...smallBtn, alignSelf: "flex-start" }}>
                  cancel
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {inventory.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Your inventory is empty. Visit a shop to get started.</p>
      )}
    </div>
  )
}

// ---- Sub-components ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ color: "var(--text-muted)", fontSize: "0.75em", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.5rem" }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

interface ItemRowProps {
  row: InventoryRow
  busy: boolean
  statLabels: Record<string, string>
  typeColor: Record<string, string>
  playerLevel: number
  onEquip: () => void
  onUnequip: () => void
  onSell: () => void
}

function ItemRow({ row, busy, statLabels, typeColor, playerLevel, onEquip, onUnequip, onSell }: ItemRowProps) {
  const { item } = row
  const canEquip = item.slot && !row.is_equipped && item.item_type !== "consumable" && item.item_type !== "material" && item.item_type !== "gem" && playerLevel >= item.level_required
  const statEntries = Object.entries(item.base_stats ?? {}).filter(([, v]) => v !== 0)

  return (
    <div style={{
      background: "var(--bg-panel)",
      border: `1px solid ${row.is_equipped ? "var(--green)" : "var(--border)"}`,
      borderRadius: "6px",
      padding: "0.75rem 1rem",
      marginBottom: "0.4rem",
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: "0.5rem",
      alignItems: "center",
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "var(--text)" }}>{item.name}</span>
          <span style={{ color: typeColor[item.item_type] ?? "var(--text-muted)", fontSize: "0.75em" }}>
            [{item.item_type}]
          </span>
          {row.quantity > 1 && (
            <span style={{ color: "var(--text-muted)", fontSize: "0.75em" }}>×{row.quantity}</span>
          )}
          {row.is_equipped && (
            <span style={{ color: "var(--green)", fontSize: "0.75em" }}>
              ✓ {row.equipped_slot?.replace("_", " ")}
            </span>
          )}
          {item.level_required > 1 && playerLevel < item.level_required && (
            <span style={{ color: "var(--red)", fontSize: "0.75em" }}>Lv {item.level_required} req</span>
          )}
        </div>
        {statEntries.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "2px" }}>
            {statEntries.map(([stat, val]) => (
              <span key={stat} style={{ color: "var(--green)", fontSize: "0.75em" }}>
                +{val} {statLabels[stat] ?? stat}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {row.is_equipped ? (
          <button onClick={onUnequip} disabled={busy} style={smallBtn}>unequip</button>
        ) : canEquip ? (
          <button onClick={onEquip} disabled={busy} style={smallBtn}>equip</button>
        ) : null}
        {!row.is_equipped && (
          <button onClick={onSell} disabled={busy} style={smallBtn}>sell</button>
        )}
      </div>
    </div>
  )
}

const smallBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "3px 8px",
  fontSize: "0.75em",
  cursor: "pointer",
}
