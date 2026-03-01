"use client";

import { PlayerData } from "@/lib/player-data";

interface EffectsPanelProps {
  effects: PlayerData["activeEffects"];
}

const EFFECT_DISPLAY: Record<string, { name: string; emoji: string; color: string }> = {
  "minecraft:speed": { name: "Speed", emoji: "💨", color: "#7CAFC6" },
  "minecraft:slowness": { name: "Slowness", emoji: "🐢", color: "#5A6C81" },
  "minecraft:haste": { name: "Haste", emoji: "⛏️", color: "#D9C043" },
  "minecraft:mining_fatigue": { name: "Mining Fatigue", emoji: "🦾", color: "#4A4217" },
  "minecraft:strength": { name: "Strength", emoji: "💪", color: "#932423" },
  "minecraft:instant_health": { name: "Instant Health", emoji: "❤️", color: "#F82423" },
  "minecraft:instant_damage": { name: "Instant Damage", emoji: "💔", color: "#430A09" },
  "minecraft:jump_boost": { name: "Jump Boost", emoji: "🦘", color: "#786297" },
  "minecraft:nausea": { name: "Nausea", emoji: "😵", color: "#551D3A" },
  "minecraft:regeneration": { name: "Regeneration", emoji: "💗", color: "#CD5CAB" },
  "minecraft:resistance": { name: "Resistance", emoji: "🛡️", color: "#99453A" },
  "minecraft:fire_resistance": { name: "Fire Resistance", emoji: "🔥", color: "#E49A3A" },
  "minecraft:water_breathing": { name: "Water Breathing", emoji: "🫧", color: "#2E5299" },
  "minecraft:invisibility": { name: "Invisibility", emoji: "👻", color: "#7F8392" },
  "minecraft:blindness": { name: "Blindness", emoji: "🙈", color: "#1F1F23" },
  "minecraft:night_vision": { name: "Night Vision", emoji: "🌙", color: "#1F1FA1" },
  "minecraft:hunger": { name: "Hunger", emoji: "🍖", color: "#587653" },
  "minecraft:weakness": { name: "Weakness", emoji: "😞", color: "#484D48" },
  "minecraft:poison": { name: "Poison", emoji: "☠️", color: "#4E9331" },
  "minecraft:wither": { name: "Wither", emoji: "💀", color: "#352A27" },
  "minecraft:health_boost": { name: "Health Boost", emoji: "💖", color: "#F87D23" },
  "minecraft:absorption": { name: "Absorption", emoji: "💛", color: "#2552A5" },
  "minecraft:saturation": { name: "Saturation", emoji: "✨", color: "#F82423" },
  "minecraft:glowing": { name: "Glowing", emoji: "💡", color: "#94A061" },
  "minecraft:levitation": { name: "Levitation", emoji: "🪁", color: "#CEFFFF" },
  "minecraft:luck": { name: "Luck", emoji: "🍀", color: "#339900" },
  "minecraft:unluck": { name: "Bad Luck", emoji: "🪄", color: "#C0A44D" },
  "minecraft:slow_falling": { name: "Slow Falling", emoji: "🪶", color: "#F7F8E0" },
  "minecraft:conduit_power": { name: "Conduit Power", emoji: "🐚", color: "#1DC2D4" },
  "minecraft:dolphins_grace": { name: "Dolphins Grace", emoji: "🐬", color: "#88A3BE" },
  "minecraft:bad_omen": { name: "Bad Omen", emoji: "⚑", color: "#0B6138" },
  "minecraft:hero_of_the_village": { name: "Hero of the Village", emoji: "🏡", color: "#44FF44" },
  "minecraft:darkness": { name: "Darkness", emoji: "🌑", color: "#292721" },
  "speed": { name: "Speed", emoji: "💨", color: "#7CAFC6" },
  "strength": { name: "Strength", emoji: "💪", color: "#932423" },
  "regeneration": { name: "Regeneration", emoji: "💗", color: "#CD5CAB" },
};

function formatDuration(ticks: number): string {
  if (ticks === 2147483647) return "∞";
  const seconds = Math.floor(ticks / 20);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getRomanNumeral(n: number): string {
  const numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return numerals[Math.min(n + 1, numerals.length - 1)];
}

export default function EffectsPanel({ effects }: EffectsPanelProps) {
  if (effects.length === 0) {
    return (
      <div className="mc-card">
        <h3 className="font-minecraft mb-3 text-sm text-yellow-400">🧪 Active Effects</h3>
        <p className="text-center text-sm text-gray-500">No active effects</p>
      </div>
    );
  }

  return (
    <div className="mc-card">
      <h3 className="font-minecraft mb-4 text-sm text-yellow-400">
        🧪 Active Effects ({effects.length})
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {effects.map((effect, i) => {
          const info =
            EFFECT_DISPLAY[effect.id] ??
            EFFECT_DISPLAY[effect.id.replace("minecraft:", "")] ?? {
              name: effect.id
                .replace(/^minecraft:/, "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              emoji: "✨",
              color: "#888",
            };
          const level = getRomanNumeral(effect.amplifier);
          const duration = formatDuration(effect.duration);
          const isInfinite = effect.duration === 2147483647;

          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-gray-700/50 bg-gray-800/30 px-3 py-3"
              style={{
                borderLeftColor: info.color,
                borderLeftWidth: "3px",
              }}
            >
              <span className="text-2xl">{info.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {info.name} {level}
                </p>
                <p className="font-mono text-xs text-gray-400">
                  {isInfinite ? (
                    <span className="text-yellow-400">∞ Permanent</span>
                  ) : (
                    duration
                  )}
                  {effect.ambient && (
                    <span className="ml-1 text-blue-400"> · Ambient</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
