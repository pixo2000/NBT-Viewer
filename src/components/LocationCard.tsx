"use client";

import { PlayerData } from "@/lib/player-data";

interface LocationCardProps {
  player: PlayerData;
}

// Minecraft yaw: 0=South, 90=West, 180=North, -90/270=East
function yawToCardinal(yaw: number): { short: string; full: string } {
  const n = ((yaw % 360) + 360) % 360;
  const dirs = [
    { short: "S",   full: "South" },
    { short: "SSW", full: "South-Southwest" },
    { short: "SW",  full: "Southwest" },
    { short: "WSW", full: "West-Southwest" },
    { short: "W",   full: "West" },
    { short: "WNW", full: "West-Northwest" },
    { short: "NW",  full: "Northwest" },
    { short: "NNW", full: "North-Northwest" },
    { short: "N",   full: "North" },
    { short: "NNE", full: "North-Northeast" },
    { short: "NE",  full: "Northeast" },
    { short: "ENE", full: "East-Northeast" },
    { short: "E",   full: "East" },
    { short: "ESE", full: "East-Southeast" },
    { short: "SE",  full: "Southeast" },
    { short: "SSE", full: "South-Southeast" },
  ];
  return dirs[Math.round(n / 22.5) % 16];
}

function pitchLabel(pitch: number): string {
  if (pitch < -60) return "Straight up";
  if (pitch < -30) return "Looking up";
  if (pitch < -10) return "Slightly up";
  if (pitch <= 10) return "Horizontal";
  if (pitch <= 30) return "Slightly down";
  if (pitch <= 60) return "Looking down";
  return "Straight down";
}

function Compass({ yaw, pitch }: { yaw: number; pitch: number }) {
  // CSS rotation so needle tip points where the player faces
  const cssRot = (((yaw + 180) % 360) + 360) % 360;
  const dir = yawToCardinal(yaw);

  return (
    <div className="flex items-center gap-5">
      {/* Circular compass */}
      <div className="relative flex-shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="42" fill="#111" stroke="#374151" strokeWidth="1.5" />
          {/* Tick marks */}
          {Array.from({ length: 16 }, (_, i) => {
            const angle = (i * 360) / 16;
            const rad = (angle * Math.PI) / 180;
            const len = i % 4 === 0 ? 7 : 3;
            const r1 = 35;
            const r2 = r1 - len;
            return (
              <line key={i}
                x1={44 + r1 * Math.sin(rad)} y1={44 - r1 * Math.cos(rad)}
                x2={44 + r2 * Math.sin(rad)} y2={44 - r2 * Math.cos(rad)}
                stroke="#4b5563" strokeWidth="1"
              />
            );
          })}
          {/* Cardinal labels */}
          {[
            { label: "N", x: 44, y: 10, color: "#f87171" },
            { label: "S", x: 44, y: 80, color: "#9ca3af" },
            { label: "W", x: 10, y: 48, color: "#9ca3af" },
            { label: "E", x: 78, y: 48, color: "#9ca3af" },
          ].map(({ label, x, y, color }) => (
            <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontSize="10" fontWeight="bold" fontFamily="monospace" fill={color}>
              {label}
            </text>
          ))}
          {/* Needle */}
          <g transform={`rotate(${cssRot}, 44, 44)`}>
            <polygon points="44,16 41,44 44,40 47,44" fill="#ef4444" opacity="0.9" />
            <polygon points="44,72 41,44 44,48 47,44" fill="#6b7280" opacity="0.9" />
            <circle cx="44" cy="44" r="3.5" fill="#1f2937" stroke="#9ca3af" strokeWidth="1" />
          </g>
        </svg>
      </div>

      {/* Direction text */}
      <div className="space-y-2 flex-1">
        <div>
          <p className="text-xs text-gray-500">Facing</p>
          <p className="text-3xl font-bold text-white leading-none">{dir.short}</p>
          <p className="text-xs text-gray-400 mt-0.5">{dir.full}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Yaw / Pitch</p>
          <p className="font-mono text-sm text-gray-300">
            {yaw.toFixed(1)}° / {pitch.toFixed(1)}°
          </p>
          <p className="text-xs text-gray-500">{pitchLabel(pitch)}</p>
        </div>
      </div>

      {/* Pitch bar */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] text-gray-600">↑</p>
        <div className="relative h-20 w-4 rounded-full bg-gray-800 border border-gray-700 overflow-hidden">
          <div className="absolute left-0 right-0 border-t border-gray-600" style={{ top: "50%" }} />
          <div
            className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-blue-400 -translate-y-1/2 transition-all shadow-[0_0_6px_rgba(96,165,250,0.8)]"
            style={{ top: `${((pitch + 90) / 180) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-600">↓</p>
      </div>
    </div>
  );
}

export default function LocationCard({ player }: LocationCardProps) {
  const dimensionColor =
    player.dimension === "Nether"
      ? "text-red-400 border-red-800"
      : player.dimension === "The End"
      ? "text-purple-400 border-purple-800"
      : "text-green-400 border-green-800";

  const hasSpawn =
    player.spawnX !== undefined &&
    player.spawnY !== undefined &&
    player.spawnZ !== undefined;

  return (
    <div className="mc-card space-y-4">
      <h3 className="font-minecraft text-sm text-yellow-400">📍 Location</h3>

      {/* Looking direction compass */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Looking Direction
        </p>
        <div className="rounded-xl border border-gray-700 bg-gray-800/30 px-4 py-3">
          <Compass yaw={player.yaw ?? 0} pitch={player.pitch ?? 0} />
        </div>
      </div>

      {/* Current position */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Current Position
        </p>
        <div className={`rounded-xl border bg-gray-800/30 px-4 py-4 ${dimensionColor}`}>
          <div className="mb-2 flex items-center gap-2">
            <span>
              {player.dimension === "Nether" ? "🔥" : player.dimension === "The End" ? "🌌" : "🌍"}
            </span>
            <span className="font-semibold">{player.dimension}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { axis: "X", value: player.posX, color: "text-red-300" },
              { axis: "Y", value: player.posY, color: "text-green-300" },
              { axis: "Z", value: player.posZ, color: "text-blue-300" },
            ].map(({ axis, value, color }) => (
              <div key={axis} className="rounded-lg bg-gray-900/60 p-3 text-center">
                <p className={`font-minecraft text-xs ${color}`}>{axis}</p>
                <p className="mt-1 font-mono text-sm text-white">{value.toFixed(1)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {player.onGround ? "🟢 On ground" : "🟡 In the air"}
            {player.fallDistance > 0.01 && ` · Falling: ${player.fallDistance.toFixed(1)} m`}
            {player.fire > 0 && ` · 🔥 On fire`}
          </p>
        </div>
      </div>

      {/* Spawn position */}
      {hasSpawn && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Spawn Point
          </p>
          <div className="rounded-xl border border-gray-700 bg-gray-800/30 px-4 py-4">
            {player.spawnDimension && (
              <p className="mb-2 text-sm text-gray-400">{player.spawnDimension}</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[
                { axis: "X", value: player.spawnX!, color: "text-red-300" },
                { axis: "Y", value: player.spawnY!, color: "text-green-300" },
                { axis: "Z", value: player.spawnZ!, color: "text-blue-300" },
              ].map(({ axis, value, color }) => (
                <div key={axis} className="rounded-lg bg-gray-900/60 p-3 text-center">
                  <p className={`font-minecraft text-xs ${color}`}>{axis}</p>
                  <p className="mt-1 font-mono text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* World Info */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          World Info
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Chunk",  value: `${Math.floor(player.posX / 16)}, ${Math.floor(player.posZ / 16)}` },
            { label: "Region", value: `r.${Math.floor(player.posX / 512)}.${Math.floor(player.posZ / 512)}.mca` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-800 bg-gray-800/30 p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-0.5 font-mono text-xs text-gray-300">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
