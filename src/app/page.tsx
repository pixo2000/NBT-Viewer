"use client";

import { useState, useCallback } from "react";
import { parseNBT } from "@/lib/nbt-parser";
import { extractPlayerData, PlayerData } from "@/lib/player-data";
import FileUpload from "@/components/FileUpload";
import PlayerCard from "@/components/PlayerCard";
import InventoryGrid from "@/components/InventoryGrid";
import LocationCard from "@/components/LocationCard";
import EffectsPanel from "@/components/EffectsPanel";
import AbilitiesCard from "@/components/AbilitiesCard";

export default function Home() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileParsed = useCallback(
    async (buffer: ArrayBuffer, name: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const nbt = await parseNBT(buffer);
        const data = extractPlayerData(nbt);
        setPlayer(data);
        setFileName(name);
      } catch (e) {
        setError(
          `Failed to parse NBT file: ${e instanceof Error ? e.message : String(e)}`
        );
        setPlayer(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  if (!player) {
    return (
      <>
        <FileUpload onFileParsed={handleFileParsed} isLoading={isLoading} />
        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg border border-red-800 bg-red-950 px-5 py-3 text-sm text-red-400 shadow-xl">
            ⚠️ {error}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⛏️</span>
            <div>
              <h1 className="font-minecraft text-xs text-green-400 sm:text-sm">NBT Viewer</h1>
              <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-none">{fileName}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPlayer(null);
              setFileName("");
              setError(null);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            ↩ New File
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {error && (
          <div className="rounded-lg border border-yellow-800 bg-yellow-950/50 px-4 py-3 text-sm text-yellow-400">
            ⚠️ {error} — Some data may be missing or incomplete.
          </div>
        )}

        {/* Two-column layout: left = player + inventory, right = location + effects + abilities */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-4 lg:col-span-2">
            <PlayerCard player={player} fileName={fileName} />
            <InventoryGrid
              inventory={player.inventory}
              armorSlots={player.armorSlots}
              offhand={player.offhand}
              selectedItemSlot={player.selectedItemSlot}
            />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <LocationCard player={player} />
            <EffectsPanel effects={player.activeEffects} />
            <AbilitiesCard player={player} />
          </div>
        </div>

        {/* Attributes full-width */}
        {player.attributes && player.attributes.length > 0 && (
          <div className="mc-card space-y-3">
            <h3 className="font-minecraft text-sm text-yellow-400">📊 Attributes</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {player.attributes.map((attr) => (
                <div
                  key={attr.name}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2"
                >
                  <span className="text-xs text-gray-400">
                    {attr.name
                      .replace(/^minecraft:/, "")
                      .replace(/^generic\./, "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="font-mono text-sm text-white">{attr.base.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="pb-4 text-center text-xs text-gray-700">
          NBT Viewer · Minecraft Playerdata Explorer · No data is uploaded to any server
        </footer>
      </main>
    </div>
  );
}
