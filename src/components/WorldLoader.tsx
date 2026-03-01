"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { fetchPlayerProfile } from "@/lib/apis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorldPlayer {
  uuid: string;           // lowercase, no dashes  (as it appears in filename)
  uuidFormatted: string;  // with dashes
  datFile: File | null;
  statsFile: File | null;
  // async-resolved
  displayName: string | null;
  avatarUrl: string | null;
  profileLoading: boolean;
}

interface WorldLoaderProps {
  onSelectPlayer: (datFile: File | null, statsFile: File | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a raw UUID string (with or without dashes) to the canonical dashed form. */
function formatUUID(raw: string): string {
  const s = raw.replace(/-/g, "").toLowerCase();
  if (s.length !== 32) return raw;
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Extract the UUID stem from a filename like "550e8400-e29b-41d4-a716-446655440000.dat" */
function uuidFromFilename(name: string): string | null {
  const stem = name.replace(/\.(dat|json)$/i, "");
  const noHyphen = stem.replace(/-/g, "");
  if (noHyphen.length === 32 && /^[0-9a-f]+$/i.test(noHyphen)) {
    return noHyphen; // normalized, lowercase
  }
  return null;
}

/** Decide whether a file belongs to playerdata or stats based on its relative path. */
function classifyFile(file: File): "dat" | "stats" | null {
  const rp = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name;
  const parts = rp.replace(/\\/g, "/").split("/");
  // Check the parent folder name (second-to-last segment)
  const parentFolder = parts.length >= 2 ? parts[parts.length - 2].toLowerCase() : "";
  if (parentFolder === "playerdata" && file.name.endsWith(".dat")) return "dat";
  if (parentFolder === "stats" && file.name.endsWith(".json")) return "stats";
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorldLoader({ onSelectPlayer }: WorldLoaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [players, setPlayers] = useState<WorldPlayer[] | null>(null);
  const [worldName, setWorldName] = useState<string>("");
  const [search, setSearch] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  // ── Scan folder ──────────────────────────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setScanError(null);

    // Derive world name from the root folder (first path segment)
    const firstPath = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
    const rootFolder = firstPath.split("/")[0] ?? "World";
    setWorldName(rootFolder);

    const map = new Map<string, { datFile: File | null; statsFile: File | null }>();

    for (const file of Array.from(files)) {
      const kind = classifyFile(file);
      if (!kind) continue;
      const uuid = uuidFromFilename(file.name);
      if (!uuid) continue;
      const entry = map.get(uuid) ?? { datFile: null, statsFile: null };
      if (kind === "dat") entry.datFile = file;
      else entry.statsFile = file;
      map.set(uuid, entry);
    }

    if (map.size === 0) {
      setScanError(
        "No playerdata (.dat) or stats (.json) files found. " +
        "Make sure you selected a world folder containing playerdata/ or stats/ sub-folders."
      );
      setPlayers(null);
      return;
    }

    const initial: WorldPlayer[] = Array.from(map.entries()).map(([uuid, files]) => ({
      uuid,
      uuidFormatted: formatUUID(uuid),
      ...files,
      displayName: null,
      avatarUrl: null,
      profileLoading: true,
    }));
    setPlayers(initial);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  // ── Async profile lookup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!players) return;

    players.forEach((player) => {
      fetchPlayerProfile(player.uuid).then((profile) => {
        setPlayers((prev) =>
          prev
            ? prev.map((p) =>
                p.uuid === player.uuid
                  ? {
                      ...p,
                      displayName: profile?.username ?? null,
                      avatarUrl: profile?.avatarUrl ?? null,
                      profileLoading: false,
                    }
                  : p
              )
            : prev
        );
      });
    });
    // intentionally run only when players list first populates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players?.length]);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = (players ?? []).filter(
    (p) =>
      !search ||
      p.uuidFormatted.includes(search.toLowerCase()) ||
      (p.displayName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!players) {
    return (
      <div className="w-full max-w-xl">
        {/* Folder pick area */}
        <div
          className="drop-zone w-full cursor-pointer rounded-2xl p-10 text-center transition-all duration-200"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            // @ts-expect-error — webkitdirectory is non-standard but widely supported
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={handleChange}
          />
          <div className="mb-4 text-6xl">🌍</div>
          <p className="mb-1 text-lg font-semibold text-gray-200">
            Select your world folder
          </p>
          <p className="text-sm text-gray-500">
            Click to browse — or drag &amp; drop a folder
          </p>
          <p className="mt-3 text-xs text-gray-600">
            Reads{" "}
            <code className="rounded bg-gray-800 px-1 py-0.5 text-gray-400">playerdata/*.dat</code>
            {" "}and{" "}
            <code className="rounded bg-gray-800 px-1 py-0.5 text-gray-400">stats/*.json</code>
            {" "}from the folder
          </p>
        </div>

        {scanError && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
            ⚠️ {scanError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-minecraft text-sm text-green-400">🌍 {worldName}</h2>
          <p className="text-xs text-gray-500">
            {players.length} player{players.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <button
          onClick={() => { setPlayers(null); setSearch(""); setScanError(null); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          ↩ Change folder
        </button>
      </div>

      {/* Search */}
      {players.length > 4 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or UUID…"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
        />
      )}

      {/* Player list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">No players match your search</p>
        ) : (
          filtered.map((player) => (
            <button
              key={player.uuid}
              onClick={() => onSelectPlayer(player.datFile, player.statsFile)}
              className="w-full flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-left transition-all hover:border-green-700 hover:bg-gray-800/80 hover:shadow-lg active:scale-[0.99]"
            >
              {/* Avatar */}
              <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                {player.profileLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                ) : player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="object-cover"
                    style={{ imageRendering: "pixelated" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="text-xl">👤</span>
                )}
              </div>

              {/* Name + UUID */}
              <div className="flex-1 min-w-0">
                {player.profileLoading ? (
                  <div className="h-3.5 w-28 rounded bg-gray-700 animate-pulse mb-1.5" />
                ) : (
                  <p className="text-sm font-semibold text-white truncate">
                    {player.displayName ?? <span className="text-gray-500 italic">Offline / Unknown</span>}
                  </p>
                )}
                <p className="font-mono text-[10px] text-gray-600 truncate">{player.uuidFormatted}</p>
              </div>

              {/* Badges */}
              <div className="flex-shrink-0 flex flex-col gap-1 items-end">
                {player.datFile && (
                  <span className="rounded-full border border-blue-800/60 bg-blue-900/30 px-2 py-0.5 text-[10px] text-blue-300">
                    📂 data
                  </span>
                )}
                {player.statsFile && (
                  <span className="rounded-full border border-yellow-800/60 bg-yellow-900/30 px-2 py-0.5 text-[10px] text-yellow-300">
                    📈 stats
                  </span>
                )}
              </div>

              <span className="flex-shrink-0 text-gray-600 text-sm">›</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
