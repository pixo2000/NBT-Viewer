"use client";

import { useState, useEffect, useCallback } from "react";
import { InventoryItem } from "@/lib/player-data";
import { getItemInfo } from "@/lib/minecraft-data";
import { getItemImageUrls } from "@/lib/apis";
import { NBTCompound, NBTValue, getCompound } from "@/lib/nbt-parser";

// ─── NBT Tree Renderer ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<number, string> = {
  1: "text-orange-300",   // byte
  2: "text-orange-300",   // short
  3: "text-orange-300",   // int
  4: "text-orange-300",   // long
  5: "text-yellow-300",   // float
  6: "text-yellow-300",   // double
  7: "text-gray-400",     // byte array
  8: "text-green-300",    // string
  9: "text-gray-300",     // list
  10: "text-gray-300",    // compound
  11: "text-gray-400",    // int array
  12: "text-gray-400",    // long array
};

const TYPE_NAMES: Record<number, string> = {
  1: "byte", 2: "short", 3: "int", 4: "long",
  5: "float", 6: "double", 7: "byte[]", 8: "string",
  9: "list", 10: "compound", 11: "int[]", 12: "long[]",
};

function formatValue(type: number, value: NBTValue): string {
  if (type === 4) return `${value}L`;
  if (type === 5) return `${(value as number).toFixed(4)}f`;
  if (type === 6) return `${(value as number).toFixed(6)}d`;
  if (type === 8) return `"${value}"`;
  if (type === 7 || type === 11) return `[${(value as number[]).join(", ")}]`;
  if (type === 12) return `[${(value as bigint[]).join(", ")}L]`;
  return String(value);
}

function NBTNode({
  name,
  type,
  value,
  depth = 0,
}: {
  name?: string;
  type: number;
  value: NBTValue;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isCompound = type === 10;
  const isList = type === 9;
  const isContainer = isCompound || isList;
  const children = isCompound
    ? Object.entries(value as NBTCompound)
    : isList
    ? (value as NBTValue[]).map((v, i) => [String(i), { type: -1, value: v }] as [string, { type: number; value: NBTValue }])
    : [];

  const indent = depth * 12;

  if (isContainer) {
    const count = isCompound
      ? Object.keys(value as NBTCompound).length
      : (value as NBTValue[]).length;
    return (
      <div style={{ marginLeft: indent }}>
        <button
          className="flex w-full items-start gap-1 py-0.5 text-left hover:bg-gray-800/50 rounded px-1 transition-colors"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="mt-0.5 flex-shrink-0 text-gray-500 select-none">
            {open ? "▼" : "▶"}
          </span>
          {name && (
            <span className="font-mono text-xs">
              <span className="text-sky-300">{name}</span>
              <span className="text-gray-600">: </span>
            </span>
          )}
          <span className="font-mono text-xs text-gray-500">
            {isCompound ? "{" : "["} <span className="text-gray-600">{count} {isCompound ? "entries" : "items"}</span> {open ? "" : (isCompound ? "}" : "]")}
          </span>
        </button>
        {open && (
          <div className="border-l border-gray-700/50 ml-2 mt-0.5">
            {(children as [string, { type: number; value: NBTValue }][]).map(([k, entry]) => {
              // list items don't have a type tag stored separately
              const itemType = entry.type === -1 ? guessType(entry.value) : entry.type;
              return (
                <NBTNode
                  key={k}
                  name={isList ? undefined : k}
                  type={itemType}
                  value={entry.value}
                  depth={depth + 1}
                />
              );
            })}
          </div>
        )}
        {open && <div className="font-mono text-xs text-gray-500 pl-1" style={{ marginLeft: indent }}>{isCompound ? "}" : "]"}</div>}
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-1 py-0.5 px-1 hover:bg-gray-800/30 rounded"
      style={{ marginLeft: indent }}
    >
      {name && (
        <span className="font-mono text-xs">
          <span className="text-sky-300">{name}</span>
          <span className="text-gray-600">: </span>
        </span>
      )}
      <span className={`font-mono text-xs ${TYPE_COLORS[type] ?? "text-gray-300"}`}>
        {formatValue(type, value)}
      </span>
      <span className="ml-1 font-mono text-[10px] text-gray-700 self-center">
        {TYPE_NAMES[type]}
      </span>
    </div>
  );
}

function guessType(value: NBTValue): number {
  if (typeof value === "string") return 8;
  if (typeof value === "bigint") return 4;
  if (typeof value === "number") return Number.isInteger(value) ? 3 : 6;
  if (Array.isArray(value)) {
    if (value.length === 0) return 9;
    if (typeof value[0] === "bigint") return 12;
    if (typeof value[0] === "number") return 11;
    return 9;
  }
  return 10;
}

// ─── /give command builder ────────────────────────────────────────────────────

// SNBT serializer — converts parsed NBT entries back to command-safe Stringified NBT.
// This is version-agnostic: it faithfully re-serializes whatever the parser read,
// so it automatically handles 1.20.5, 1.21.2+, and future format changes.
function snbtKey(key: string): string {
  if (/^[a-zA-Z0-9_.\-+]+$/.test(key)) return key;
  return `"${key.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function snbtStr(s: string): string {
  if (!s.includes("'")) return `'${s}'`;          // prefer single quotes (readable for JSON text components)
  if (!s.includes('"')) return `"${s.replace(/\\/g, "\\\\")}"`;
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toSNBT(type: number, val: NBTValue): string {
  switch (type) {
    case 1:  return `${val}b`;
    case 2:  return `${val}s`;
    case 3:  return String(val);
    case 4:  return `${val}L`;
    case 5: {
      const f = val as number;
      const s = f.toString();
      return s.includes(".") || s.includes("e") ? `${f}f` : `${f}.0f`;
    }
    case 6: {
      const d = val as number;
      const s = d.toString();
      return s.includes(".") || s.includes("e") ? `${d}d` : `${d}.0d`;
    }
    case 7:  return `[B;${(val as number[]).map(v => `${v}b`).join(",")}]`;
    case 8:  return snbtStr(val as string);
    case 9: {
      const list = val as NBTValue[];
      if (list.length === 0) return "[]";
      const et = guessType(list[0]);
      return `[${list.map(v => toSNBT(et, v)).join(",")}]`;
    }
    case 10: {
      const c = val as NBTCompound;
      const entries = Object.entries(c)
        .map(([k, e]) => `${snbtKey(k)}:${toSNBT(e.type, e.value)}`)
        .join(",");
      return `{${entries}}`;
    }
    case 11: return `[I;${(val as number[]).join(",")}]`;
    case 12: return `[L;${(val as bigint[]).map(v => `${v}L`).join(",")}]`;
    default: return String(val);
  }
}

// Components that store an enchantment-ID → level map (need special handling)
const ENCHANT_COMPONENTS = new Set([
  "minecraft:enchantments",
  "minecraft:stored_enchantments",
]);

// Serialise enchantment component for 1.21.11+ commands:
// [enchantments={sharpness:5}]  — no namespace prefix anywhere, no levels wrapper
function enchantmentsToSNBTNew(entryCmp: { type: number; value: NBTValue }): string {
  const compound = entryCmp.value as NBTCompound;
  let enchMap: NBTCompound;
  const levelsEntry = compound["levels"];
  if (levelsEntry) {
    enchMap = levelsEntry.value as NBTCompound;
  } else {
    enchMap = Object.fromEntries(
      Object.entries(compound).filter(([k]) => k.includes(":"))
    );
  }
  const pairs = Object.entries(enchMap)
    .map(([k, e]) => `${k.replace(/^minecraft:/, "")}:${(e as { type: number; value: NBTValue }).value}`)
    .join(",");
  return `{${pairs}}`;
}

// Serialise enchantment component for 1.20.5–1.21.10 commands:
// e.g. minecraft:enchantments = {levels:{"minecraft:sharpness":5}}  — full namespace + levels wrapper
function enchantmentsToSNBTMid(entryCmp: { type: number; value: NBTValue }): string {
  const compound = entryCmp.value as NBTCompound;
  let enchMap: NBTCompound;
  const levelsEntry = compound["levels"];
  if (levelsEntry) {
    enchMap = levelsEntry.value as NBTCompound;
  } else {
    enchMap = Object.fromEntries(
      Object.entries(compound).filter(([k]) => k.includes(":"))
    );
  }
  const pairs = Object.entries(enchMap)
    .map(([k, e]) => {
      const id = k.startsWith("minecraft:") ? k : `minecraft:${k}`;
      return `"${id}":${(e as { type: number; value: NBTValue }).value}`;
    })
    .join(",");
  return `{levels:{${pairs}}}`;
}

// Components to include in the /give command (skip purely visual/server-side ones)
const GIVE_COMPONENTS = new Set([
  "minecraft:enchantments",
  "minecraft:stored_enchantments",
  "minecraft:custom_name",
  "minecraft:lore",
  "minecraft:damage",
  "minecraft:max_damage",
  "minecraft:unbreakable",
  "minecraft:dyed_color",
  "minecraft:attribute_modifiers",
  "minecraft:can_place_on",
  "minecraft:can_break",
  "minecraft:potion_contents",
  "minecraft:written_book_content",
  "minecraft:writable_book_content",
  "minecraft:charged_projectiles",
  "minecraft:bundle_contents",
  "minecraft:map_id",
  "minecraft:fireworks",
  "minecraft:container",
  "minecraft:block_entity_data",
  "minecraft:trim",
]);

function buildGiveCommandNew(item: InventoryItem, playerName: string): string {
  const id = item.id.startsWith("minecraft:") ? item.id : `minecraft:${item.id}`;
  const count = item.count;
  const target = playerName.trim() || "@p";

  // 1.21.11+ format: [enchantments={sharpness:5}]  — no namespace on keys or enchant IDs
  const rawComponents = item.rawNBT ? getCompound(item.rawNBT, "components") : undefined;
  if (rawComponents) {
    const parts: string[] = [];
    for (const [key, entry] of Object.entries(rawComponents)) {
      if (GIVE_COMPONENTS.has(key)) {
        const shortKey = key.replace(/^minecraft:/, "");
        const snbt = ENCHANT_COMPONENTS.has(key)
          ? enchantmentsToSNBTNew(entry)
          : toSNBT(entry.type, entry.value);
        parts.push(`${shortKey}=${snbt}`);
      }
    }
    const cs = parts.length ? `[${parts.join(",")}]` : "";
    return `/give ${target} ${id}${cs} ${count}`;
  }
  // Fallback
  const parts: string[] = [];
  if (item.enchantments && item.enchantments.length > 0) {
    const map = item.enchantments.map(e => `${e.id.replace(/^minecraft:/, "")}:${e.level}`).join(",");
    parts.push(`enchantments={${map}}`);
  }
  if (item.customName) parts.push(`custom_name=${snbtStr(JSON.stringify({ text: item.customName }))}`);  
  if (item.damage && item.damage > 0) parts.push(`damage=${item.damage}`);
  return `/give ${target} ${id}${parts.length ? `[${parts.join(",")}]` : ""} ${count}`;
}

function buildGiveCommandMid(item: InventoryItem, playerName: string): string {
  const id = item.id.startsWith("minecraft:") ? item.id : `minecraft:${item.id}`;
  const count = item.count;
  const target = playerName.trim() || "@p";

  // 1.20.5–1.21.10 format: minecraft:enchantments = {levels:{"minecraft:sharpness":5}} (inside [...] in the command)
  const rawComponents = item.rawNBT ? getCompound(item.rawNBT, "components") : undefined;
  if (rawComponents) {
    const parts: string[] = [];
    for (const [key, entry] of Object.entries(rawComponents)) {
      if (GIVE_COMPONENTS.has(key)) {
        const snbt = ENCHANT_COMPONENTS.has(key)
          ? enchantmentsToSNBTMid(entry)
          : toSNBT(entry.type, entry.value);
        parts.push(`${key}=${snbt}`);
      }
    }
    const cs = parts.length ? `[${parts.join(",")}]` : "";
    return `/give ${target} ${id}${cs} ${count}`;
  }
  // Fallback
  const parts: string[] = [];
  if (item.enchantments && item.enchantments.length > 0) {
    const map = item.enchantments
      .map(e => { const eid = e.id.startsWith("minecraft:") ? e.id : `minecraft:${e.id}`; return `"${eid}":${e.level}`; })
      .join(",");
    parts.push(`minecraft:enchantments={levels:{${map}}}`);
  }
  if (item.customName) parts.push(`minecraft:custom_name=${snbtStr(JSON.stringify({ text: item.customName }))}`);
  if (item.damage && item.damage > 0) parts.push(`minecraft:damage=${item.damage}`);
  return `/give ${target} ${id}${parts.length ? `[${parts.join(",")}]` : ""} ${count}`;
}

function buildLegacyGiveCommand(item: InventoryItem, playerName: string): string {
  const id = item.id.startsWith("minecraft:") ? item.id : `minecraft:${item.id}`;
  const count = item.count;
  const damage = item.damage ?? 0;
  const target = playerName.trim() || "@p";

  const nbtParts: string[] = [];

  if (item.enchantments && item.enchantments.length > 0) {
    const enchStr = item.enchantments
      .map((e) => `{id:"${e.id}",lvl:${e.level}s}`)
      .join(",");
    nbtParts.push(`Enchantments:[${enchStr}]`);
  }

  if (item.customName) {
    const escaped = JSON.stringify(JSON.stringify(item.customName));
    nbtParts.push(`display:{Name:${escaped}}`);
  }

  const nbtStr = nbtParts.length > 0 ? `{${nbtParts.join(",")}}` : "";
  if (damage > 0 || nbtStr) {
    return `/give ${target} ${id} ${count} ${damage}${nbtStr ? " " + nbtStr : ""}`;
  }
  return `/give ${target} ${id} ${count}`;
}

// ─── Command-block wrappers ───────────────────────────────────────────────────
// Escapes a /give command so it can be nested inside an NBT string value.
function escapeForNBTString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// 1.21.11+: short component keys, no "minecraft:" prefix on block_entity_data key
function buildCommandBlockGiveNew(giveCmd: string, playerName: string): string {
  const target = playerName.trim() || "@p";
  const esc = escapeForNBTString(giveCmd);
  return `/give ${target} minecraft:command_block[block_entity_data={id:"minecraft:command_block",Command:"${esc}"}] 1`;
}

// 1.20.5–1.21.10: full namespaced component key
function buildCommandBlockGiveMid(giveCmd: string, playerName: string): string {
  const target = playerName.trim() || "@p";
  const esc = escapeForNBTString(giveCmd);
  return `/give ${target} minecraft:command_block[minecraft:block_entity_data={id:"minecraft:command_block",Command:"${esc}"}] 1`;
}

// Legacy (pre-1.20.5): BlockEntityTag NBT
function buildCommandBlockGiveLegacy(giveCmd: string, playerName: string): string {
  const target = playerName.trim() || "@p";
  const esc = escapeForNBTString(giveCmd);
  return `/give ${target} minecraft:command_block 1 0 {BlockEntityTag:{Command:"${esc}"}}`;
}

// ─── Image with fallback ──────────────────────────────────────────────────────

function ItemModalImage({ id, emoji }: { id: string; emoji: string }) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [itemUrl, blockUrl, entityUrl] = getItemImageUrls(id);
  const modalUrls = [itemUrl, blockUrl, entityUrl];
  if (stage === 3) return <span className="text-5xl">{emoji}</span>;
  return (
    <img
      src={modalUrls[stage]}
      alt=""
      width={56}
      height={56}
      className="object-contain"
      style={{ imageRendering: "pixelated" }}
      onError={() => setStage((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : 3))}
    />
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface ItemModalProps {
  item: InventoryItem;
  onClose: () => void;
}

type Tab = "give" | "nbt";

export default function ItemModal({ item, onClose }: ItemModalProps) {
  const info = getItemInfo(item.id);
  const displayName = item.customName ?? info.name;
  const [tab, setTab] = useState<Tab>("give");
  const [playerName, setPlayerName] = useState("@p");
  const [copied, setCopied] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const cmdNew = buildGiveCommandNew(item, playerName);
  const cmdMid = buildGiveCommandMid(item, playerName);
  const legacyCmd = buildLegacyGiveCommand(item, playerName);
  const hasComponents = !!(item.rawNBT && getCompound(item.rawNBT, "components"));

  // Command block variants (for commands that exceed the 256-char chat limit)
  const CHAT_LIMIT = 256;
  const showCommandBlock =
    cmdNew.length > CHAT_LIMIT || cmdMid.length > CHAT_LIMIT || legacyCmd.length > CHAT_LIMIT;
  const cbCmdNew = buildCommandBlockGiveNew(cmdNew, playerName);
  const cbCmdMid = buildCommandBlockGiveMid(cmdMid, playerName);
  const cbCmdLegacy = buildCommandBlockGiveLegacy(legacyCmd, playerName);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mc-card relative flex w-full max-w-2xl flex-col gap-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 border-gray-600 bg-gray-800 p-1">
            <ItemModalImage id={item.id} emoji={info.emoji} />
          </div>

          {/* Name + id — grows to fill space */}
          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-bold leading-tight text-white sm:text-lg"
              style={item.enchantments && item.enchantments.length > 0 ? { color: "#c084fc" } : {}}
            >
              {displayName}
            </h2>
            {item.customName && <p className="text-sm text-gray-400">{info.name}</p>}
            <p className="font-mono text-xs text-gray-500">{item.id}</p>
          </div>

          {/* Count + slot + close — right-aligned column */}
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              ✕ ESC
            </button>
            <span className="font-mono text-lg font-bold leading-none text-yellow-400">×{item.count}</span>
            <span className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-400">
              Slot {item.slot}
            </span>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex flex-wrap gap-2">
          {item.damage !== undefined && item.damage > 0 && (
            <span className="rounded-full border border-red-800 bg-red-900/40 px-2.5 py-0.5 text-xs text-red-300">
              🔧 Damage: {item.damage}
            </span>
          )}
          {item.enchantments && item.enchantments.map((e) => (
            <span key={e.id} className="rounded-full border border-purple-800 bg-purple-900/40 px-2.5 py-0.5 text-xs text-purple-300">
              ✨ {e.id.replace(/^minecraft:/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} {e.level}
            </span>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-700">
          {([["give", "⚔️ /give Command"], ["nbt", "📋 Raw NBT"]] as [Tab, string][]).map(
            ([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? "border-yellow-400 text-yellow-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* /give Tab */}
        {tab === "give" && (
          <div className="space-y-4">
            {/* Player name field */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 flex-shrink-0">Target player:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="@p / PlayerName"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 font-mono text-sm text-white placeholder-gray-600 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            {/* 1.21.11+ command */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                1.21.11+ {hasComponents ? "· from file NBT" : "· estimated"}
              </p>
              <div className="group relative flex items-stretch gap-0 overflow-hidden rounded-lg border border-gray-700">
                <code className="flex-1 overflow-x-auto whitespace-nowrap bg-gray-900 px-3 py-2.5 font-mono text-xs text-green-300">
                  {cmdNew}
                </code>
                <button
                  onClick={() => copy(cmdNew, "new")}
                  className="flex-shrink-0 border-l border-gray-700 bg-gray-800 px-3 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                >
                  {copied === "new" ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            {/* 1.20.5–1.21.10 command */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                1.20.5 – 1.21.10 {hasComponents ? "· from file NBT" : "· estimated"}
              </p>
              <div className="group relative flex items-stretch gap-0 overflow-hidden rounded-lg border border-gray-700">
                <code className="flex-1 overflow-x-auto whitespace-nowrap bg-gray-900 px-3 py-2.5 font-mono text-xs text-sky-300">
                  {cmdMid}
                </code>
                <button
                  onClick={() => copy(cmdMid, "mid")}
                  className="flex-shrink-0 border-l border-gray-700 bg-gray-800 px-3 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                >
                  {copied === "mid" ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            {/* Legacy command */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Legacy (pre-1.20.5)
              </p>
              <div className="group relative flex items-stretch gap-0 overflow-hidden rounded-lg border border-gray-700">
                <code className="flex-1 overflow-x-auto whitespace-nowrap bg-gray-900 px-3 py-2.5 font-mono text-xs text-blue-300">
                  {legacyCmd}
                </code>
                <button
                  onClick={() => copy(legacyCmd, "legacy")}
                  className="flex-shrink-0 border-l border-gray-700 bg-gray-800 px-3 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                >
                  {copied === "legacy" ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            {/* Command-block variants — shown when any command exceeds 256-char chat limit */}
            {showCommandBlock && (
              <div className="space-y-3 rounded-xl border border-orange-800/60 bg-orange-950/30 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-base">📦</span>
                  <div>
                    <p className="text-xs font-semibold text-orange-300">
                      Command too long for chat ({Math.max(cmdNew.length, cmdMid.length, legacyCmd.length)} / 256 chars)
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Run one of these from the <span className="text-gray-300">server console</span> (no length limit) to place a pre-filled command block in your inventory. Then place and activate it.
                    </p>
                  </div>
                </div>

                {/* CB 1.21.11+ */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Command Block · 1.21.11+
                  </p>
                  <div className="flex items-stretch gap-0 overflow-hidden rounded-lg border border-gray-700">
                    <code className="flex-1 overflow-x-auto whitespace-nowrap bg-gray-900 px-3 py-2.5 font-mono text-xs text-green-300">
                      {cbCmdNew}
                    </code>
                    <button
                      onClick={() => copy(cbCmdNew, "cb-new")}
                      className="flex-shrink-0 border-l border-gray-700 bg-gray-800 px-3 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    >
                      {copied === "cb-new" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                </div>

                {/* CB 1.20.5–1.21.10 */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Command Block · 1.20.5 – 1.21.10
                  </p>
                  <div className="flex items-stretch gap-0 overflow-hidden rounded-lg border border-gray-700">
                    <code className="flex-1 overflow-x-auto whitespace-nowrap bg-gray-900 px-3 py-2.5 font-mono text-xs text-sky-300">
                      {cbCmdMid}
                    </code>
                    <button
                      onClick={() => copy(cbCmdMid, "cb-mid")}
                      className="flex-shrink-0 border-l border-gray-700 bg-gray-800 px-3 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    >
                      {copied === "cb-mid" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                </div>

                {/* CB Legacy */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Command Block · Legacy (pre-1.20.5)
                  </p>
                  <div className="flex items-stretch gap-0 overflow-hidden rounded-lg border border-gray-700">
                    <code className="flex-1 overflow-x-auto whitespace-nowrap bg-gray-900 px-3 py-2.5 font-mono text-xs text-blue-300">
                      {cbCmdLegacy}
                    </code>
                    <button
                      onClick={() => copy(cbCmdLegacy, "cb-legacy")}
                      className="flex-shrink-0 border-l border-gray-700 bg-gray-800 px-3 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    >
                      {copied === "cb-legacy" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Raw NBT Tab */}
        {tab === "nbt" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Click any compound/list to expand or collapse</p>
              <button
                onClick={() => {
                  const json = JSON.stringify(item.rawNBT, (_, v) =>
                    typeof v === "bigint" ? v.toString() + "L" : v
                  , 2);
                  copy(json, "nbt-json");
                }}
                className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied === "nbt-json" ? "✓ Copied!" : "📋 Copy as JSON"}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950 p-3">
              {item.rawNBT ? (
                Object.entries(item.rawNBT).map(([key, entry]) => (
                  <NBTNode
                    key={key}
                    name={key}
                    type={entry.type}
                    value={entry.value}
                    depth={0}
                  />
                ))
              ) : (
                <p className="text-center text-sm text-gray-600">No NBT data available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
