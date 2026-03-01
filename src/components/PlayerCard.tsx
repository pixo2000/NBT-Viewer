"use client";

import { useEffect, useState } from "react";
import { PlayerData } from "@/lib/player-data";
import { GAME_MODES } from "@/lib/minecraft-data";
import { fetchPlayerProfile, getPlayerAvatarUrl, PlayerProfile } from "@/lib/apis";

interface PlayerCardProps {
  player: PlayerData;
  fileName: string;
}

function StatBar({
  value,
  max,
  colorClass,
  label,
  icon,
}: {
  value: number;
  max: number;
  colorClass: string;
  label: string;
  icon: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-400">
          {icon} {label}
        </span>
        <span className="font-mono text-gray-300">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function XPBar({ progress, level }: { progress: number; level: number }) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-400">⭐ XP Progress</span>
        <span className="font-mono text-gray-300">Level {level}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="xp-bar-fill h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right font-mono text-xs text-gray-500">{pct.toFixed(0)}%</p>
    </div>
  );
}

export default function PlayerCard({ player, fileName }: PlayerCardProps) {
  const fallbackName = fileName.replace(/\.dat$/, "").replace(/\.nbt$/, "");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (!player.uuid) return;
    setProfileLoading(true);
    setAvatarError(false);
    fetchPlayerProfile(player.uuid).then((p) => {
      setProfile(p);
      setProfileLoading(false);
    });
  }, [player.uuid]);

  const playerName = profile?.username ?? fallbackName;
  const avatarUrl = profile?.avatarUrl ?? (player.uuid ? getPlayerAvatarUrl(player.uuid) : null);

  const gameModeLabel = GAME_MODES[player.gameMode] ?? "Unknown";

  const healthPct = (player.health / player.maxHealth) * 100;
  const healthColor =
    healthPct > 60 ? "health-bar-fill" : healthPct > 30 ? "bg-orange-500" : "bg-red-700";

  const dimensionEmoji =
    player.dimension === "Nether"
      ? "🔥"
      : player.dimension === "The End"
      ? "🌌"
      : "🌍";

  return (
    <div className="mc-card space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Player avatar */}
          <div className="relative h-16 w-16 flex-shrink-0">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={playerName}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl border-2 border-green-700 glow-green"
                style={{ imageRendering: "pixelated" }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-green-700 bg-gray-800 text-4xl glow-green">
                🧑‍🦱
              </div>
            )}
            {profileLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/70">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-minecraft text-lg text-white">{playerName}</h2>
              {profileLoading && !profile && (
                <span className="text-xs text-gray-600 animate-pulse">fetching name…</span>
              )}
            </div>
            {player.uuid && (
              <p className="mt-0.5 font-mono text-xs text-gray-500 max-w-[240px] truncate">
                {player.uuid}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  player.gameMode === 0
                    ? "bg-orange-900/60 text-orange-300 border border-orange-700"
                    : player.gameMode === 1
                    ? "bg-blue-900/60 text-blue-300 border border-blue-700"
                    : player.gameMode === 3
                    ? "bg-purple-900/60 text-purple-300 border border-purple-700"
                    : "bg-green-900/60 text-green-300 border border-green-700"
                }`}
              >
                {gameModeLabel}
              </span>
              <span className="rounded-full border border-gray-700 bg-gray-800/60 px-2.5 py-0.5 text-xs text-gray-400">
                {dimensionEmoji} {player.dimension}
              </span>
              {player.flying && (
                <span className="rounded-full border border-sky-700 bg-sky-900/60 px-2.5 py-0.5 text-xs text-sky-300">
                  ✈️ Flying
                </span>
              )}
              {player.invulnerable && (
                <span className="rounded-full border border-yellow-700 bg-yellow-900/60 px-2.5 py-0.5 text-xs text-yellow-300">
                  🛡️ Invulnerable
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-xs text-gray-500">Score</p>
          <p className="font-minecraft text-2xl text-yellow-400">{player.score.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total XP: {player.xpTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        <StatBar
          value={player.health}
          max={player.maxHealth}
          colorClass={healthColor}
          label="Health"
          icon="❤️"
        />
        <StatBar
          value={player.foodLevel}
          max={20}
          colorClass="food-bar-fill"
          label="Hunger"
          icon="🍖"
        />
        <StatBar
          value={player.foodSaturation}
          max={20}
          colorClass="bg-amber-400"
          label="Saturation"
          icon="✨"
        />
        {player.air < player.maxAir && (
          <StatBar
            value={player.air}
            max={player.maxAir}
            colorClass="air-bar-fill"
            label="Air"
            icon="💨"
          />
        )}
        <XPBar progress={player.xpProgress} level={player.xpLevel} />
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "XP Level", value: player.xpLevel, icon: "⭐" },
          { label: "Food Level", value: player.foodLevel, icon: "🍖" },
          { label: "Deaths", value: player.deathTime > 0 ? "In death" : "Alive", icon: "💀" },
          { label: "Seen Credits", value: player.seenCredits ? "Yes" : "No", icon: "🏆" },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-3 text-center"
          >
            <div className="text-xl">{icon}</div>
            <div className="mt-1 font-mono text-sm font-semibold text-white">{value}</div>
            <div className="mt-0.5 text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
