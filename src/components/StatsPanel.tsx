"use client";

import { useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerStats {
  mined: Record<string, number>;
  crafted: Record<string, number>;
  used: Record<string, number>;
  broken: Record<string, number>;
  pickedUp: Record<string, number>;
  dropped: Record<string, number>;
  killed: Record<string, number>;
  killedBy: Record<string, number>;
  custom: Record<string, number>;
}

export function parseStatsJSON(json: unknown): PlayerStats {
  const stats = (json as Record<string, unknown>)?.stats ?? json;
  const s = stats as Record<string, Record<string, number>>;
  return {
    mined:     s["minecraft:mined"]     ?? {},
    crafted:   s["minecraft:crafted"]   ?? {},
    used:      s["minecraft:used"]      ?? {},
    broken:    s["minecraft:broken"]    ?? {},
    pickedUp:  s["minecraft:picked_up"] ?? {},
    dropped:   s["minecraft:dropped"]   ?? {},
    killed:    s["minecraft:killed"]    ?? {},
    killedBy:  s["minecraft:killed_by"] ?? {},
    custom:    s["minecraft:custom"]    ?? {},
  };
}

// ─── Value formatters ─────────────────────────────────────────────────────────

function formatStatKey(key: string): string {
  return key
    .replace(/^minecraft:/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format distance stats (stored in cm, 100 cm = 1 block)
function formatDistance(cm: number): string {
  const blocks = cm / 100;
  if (blocks >= 1000) {
    return `${(blocks / 1000).toFixed(1)} km (${Math.round(blocks).toLocaleString()} blocks)`;
  }
  return `${Math.round(blocks).toLocaleString()} blocks`;
}

// Format time stats (stored in ticks, 20 ticks/sec)
function formatTicks(ticks: number): string {
  const seconds = ticks / 20;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatCustomValue(key: string, value: number): string {
  if (key.endsWith("_one_cm")) return formatDistance(value);
  if (
    key === "minecraft:play_time" ||
    key === "minecraft:total_world_time" ||
    key.endsWith("_time") ||
    key.startsWith("minecraft:time_since_")
  ) {
    return formatTicks(value);
  }
  return value.toLocaleString();
}

// ─── Highlight custom stats ───────────────────────────────────────────────────

const HIGHLIGHT_CUSTOM: { key: string; label: string; emoji: string }[] = [
  { key: "minecraft:play_time",        label: "Play Time",        emoji: "⏱️"  },
  { key: "minecraft:deaths",           label: "Deaths",           emoji: "💀"  },
  { key: "minecraft:jump",             label: "Jumps",            emoji: "🦘"  },
  { key: "minecraft:walk_one_cm",      label: "Distance Walked",  emoji: "🚶"  },
  { key: "minecraft:sprint_one_cm",    label: "Distance Sprinted",emoji: "🏃"  },
  { key: "minecraft:swim_one_cm",      label: "Distance Swum",    emoji: "🏊"  },
  { key: "minecraft:fly_one_cm",       label: "Distance Flown",   emoji: "🦅"  },
  { key: "minecraft:fall_one_cm",      label: "Distance Fallen",  emoji: "⬇️"  },
  { key: "minecraft:damage_dealt",     label: "Damage Dealt",     emoji: "⚔️"  },
  { key: "minecraft:damage_taken",     label: "Damage Taken",     emoji: "🛡️"  },
  { key: "minecraft:mob_kills",        label: "Mob Kills",        emoji: "🗡️"  },
  { key: "minecraft:player_kills",     label: "Player Kills",     emoji: "👤"  },
  { key: "minecraft:item_enchanted",   label: "Items Enchanted",  emoji: "✨"  },
  { key: "minecraft:traded_with_villager", label: "Villager Trades", emoji: "🏪" },
  { key: "minecraft:time_since_death", label: "Time Since Death", emoji: "⌛"  },
  { key: "minecraft:sleep_in_bed",     label: "Times Slept",      emoji: "🛏️"  },
];

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type StatsTab = "overview" | "mined" | "used" | "crafted" | "broken" | "killed" | "custom";

interface TabConfig {
  id: StatsTab;
  label: string;
  emoji: string;
  data: (stats: PlayerStats) => Record<string, number>;
}

const TABS: TabConfig[] = [
  { id: "overview", label: "Overview",  emoji: "📊", data: (s) => s.custom },
  { id: "mined",    label: "Mined",     emoji: "⛏️", data: (s) => s.mined },
  { id: "used",     label: "Used",      emoji: "🖐️", data: (s) => s.used },
  { id: "crafted",  label: "Crafted",   emoji: "🔨", data: (s) => s.crafted },
  { id: "broken",   label: "Broken",    emoji: "💔", data: (s) => s.broken },
  { id: "killed",   label: "Killed",    emoji: "🗡️", data: (s) => ({ ...s.killed, ...Object.fromEntries(Object.entries(s.killedBy).map(([k, v]) => [`(by) ${k}`, v])) }) },
  { id: "custom",   label: "All Custom",emoji: "⭐", data: (s) => s.custom },
];

// ─── StatRow ─────────────────────────────────────────────────────────────────

function StatRow({ statKey, value }: { statKey: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2">
      <span className="text-xs text-gray-300">{formatStatKey(statKey)}</span>
      <span className="font-mono text-sm font-semibold text-white">
        {formatCustomValue(statKey, value)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StatsPanelProps {
  stats: PlayerStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const [tab, setTab] = useState<StatsTab>("overview");
  const [search, setSearch] = useState("");

  const activeTab = TABS.find((t) => t.id === tab)!;
  const rawData = activeTab.data(stats);

  const filtered = Object.entries(rawData)
    .filter(([k]) => !search || k.toLowerCase().includes(search.toLowerCase()) || formatStatKey(k).toLowerCase().includes(search.toLowerCase()))
    .sort(([, a], [, b]) => b - a);

  // Overview highlights
  const highlights = HIGHLIGHT_CUSTOM.map((h) => ({
    ...h,
    value: stats.custom[h.key],
  })).filter((h) => h.value !== undefined);

  return (
    <div className="mc-card space-y-4">
      <h3 className="font-minecraft text-sm text-yellow-400">📈 Player Statistics</h3>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-gray-700 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(""); }}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab — highlight cards */}
      {tab === "overview" && (
        <div className="space-y-3">
          {highlights.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {highlights.map((h) => (
                <div
                  key={h.key}
                  className="flex flex-col gap-1 rounded-xl border border-gray-700 bg-gray-800/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{h.emoji}</span>
                    <span className="text-xs text-gray-400">{h.label}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-white leading-tight">
                    {formatCustomValue(h.key, h.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-600 py-4">No custom stats found</p>
          )}
        </div>
      )}

      {/* Other tabs — searchable list */}
      {tab !== "overview" && (
        <div className="space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500 focus:outline-none"
          />
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-600">No entries found</p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
              {filtered.map(([k, v]) => (
                <StatRow key={k} statKey={k} value={v} />
              ))}
            </div>
          )}
          <p className="text-right text-xs text-gray-700">{filtered.length} entries</p>
        </div>
      )}
    </div>
  );
}

// ─── Stats upload button (inline) ─────────────────────────────────────────────

interface StatsUploadButtonProps {
  onStatsLoaded: (stats: PlayerStats) => void;
}

export function StatsUploadButton({ onStatsLoaded }: StatsUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          onStatsLoaded(parseStatsJSON(json));
          setError(null);
        } catch {
          setError("Could not parse stats file — must be a valid JSON file from world/stats/");
        }
      };
      reader.readAsText(file);
      // allow re-upload of same file
      e.target.value = "";
    },
    [onStatsLoaded]
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
        title="Load player statistics from world/stats/<uuid>.json"
      >
        📈 Load Stats
      </button>
      {error && <p className="text-xs text-red-400 max-w-xs text-right">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
