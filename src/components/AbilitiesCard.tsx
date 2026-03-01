"use client";

import { PlayerData } from "@/lib/player-data";

interface AbilitiesCardProps {
  player: PlayerData;
}

export default function AbilitiesCard({ player }: AbilitiesCardProps) {
  const abilities = [
    {
      label: "Flying",
      value: player.flying,
      icon: "✈️",
      trueColor: "text-sky-400",
    },
    {
      label: "Can Fly",
      value: player.mayFly,
      icon: "🪽",
      trueColor: "text-sky-400",
    },
    {
      label: "Invulnerable",
      value: player.invulnerable,
      icon: "🛡️",
      trueColor: "text-yellow-400",
    },
    {
      label: "Can Build",
      value: player.mayBuild,
      icon: "🔨",
      trueColor: "text-green-400",
    },
    {
      label: "Insta Build",
      value: player.instaBuild,
      icon: "⚡",
      trueColor: "text-yellow-300",
    },
    {
      label: "Seen Credits",
      value: player.seenCredits,
      icon: "🏆",
      trueColor: "text-amber-400",
    },
  ];

  return (
    <div className="mc-card space-y-4">
      <h3 className="font-minecraft text-sm text-yellow-400">⚙️ Abilities & Status</h3>

      {/* Abilities grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {abilities.map(({ label, value, icon, trueColor }) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
              value
                ? "border-gray-600 bg-gray-700/40"
                : "border-gray-800 bg-gray-900/20 opacity-50"
            }`}
          >
            <span className="text-xl">{icon}</span>
            <span
              className={`text-xs font-semibold ${value ? trueColor : "text-gray-600"}`}
            >
              {value ? "ON" : "OFF"}
            </span>
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Speeds */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Movement Speeds
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Walk Speed",
              value: player.walkSpeed,
              base: 0.1,
              icon: "🚶",
            },
            {
              label: "Fly Speed",
              value: player.flySpeed,
              base: 0.05,
              icon: "✈️",
            },
          ].map(({ label, value, base, icon }) => {
            const mult = value / base;
            return (
              <div
                key={label}
                className="rounded-lg border border-gray-800 bg-gray-800/30 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-gray-400">
                    {icon} {label}
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      mult > 1.1
                        ? "text-green-400"
                        : mult < 0.9
                        ? "text-red-400"
                        : "text-gray-300"
                    }`}
                  >
                    {value.toFixed(3)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  {mult.toFixed(1)}x base speed
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Misc */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Misc Info
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Fall Distance",
              value: `${player.fallDistance.toFixed(1)}m`,
              icon: "⬇️",
            },
            {
              label: "On Ground",
              value: player.onGround ? "Yes" : "No",
              icon: "🟢",
            },
            {
              label: "On Fire",
              value: player.fire > 0 ? `${player.fire} ticks` : "No",
              icon: "🔥",
            },
            {
              label: "Hurt Timer",
              value: player.hurtTime > 0 ? `${player.hurtTime} ticks` : "None",
              icon: "💢",
            },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-lg border border-gray-800 bg-gray-800/30 p-3"
            >
              <p className="text-xs text-gray-500">{icon} {label}</p>
              <p className="mt-0.5 font-mono text-sm text-gray-300">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
