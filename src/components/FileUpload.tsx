"use client";

import { useCallback, useState } from "react";
import { fetchPlayerUUID } from "@/lib/apis";

interface FileUploadProps {
  onFileParsed: (buffer: ArrayBuffer, fileName: string) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileParsed, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UUID lookup state
  const [uuidUsername, setUuidUsername] = useState("");
  const [uuidResult, setUuidResult] = useState<{ uuid: string; name: string } | null>(null);
  const [uuidLoading, setUuidLoading] = useState(false);
  const [uuidError, setUuidError] = useState<string | null>(null);
  const [uuidCopied, setUuidCopied] = useState(false);

  const handleUuidLookup = useCallback(async () => {
    const name = uuidUsername.trim();
    if (!name) return;
    setUuidLoading(true);
    setUuidError(null);
    setUuidResult(null);
    const result = await fetchPlayerUUID(name);
    setUuidLoading(false);
    if (result) {
      setUuidResult(result);
    } else {
      setUuidError(`Player "${name}" not found.`);
    }
  }, [uuidUsername]);

  const copyUUID = useCallback((uuid: string) => {
    navigator.clipboard.writeText(uuid).then(() => {
      setUuidCopied(true);
      setTimeout(() => setUuidCopied(false), 2000);
    });
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.name.endsWith(".dat") && !file.name.endsWith(".nbt")) {
        setError("Please upload a valid Minecraft playerdata file (.dat or .nbt)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        onFileParsed(buffer, file.name);
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsArrayBuffer(file);
    },
    [onFileParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      {/* Title */}
      <div className="mb-12 text-center">
        <div className="float-anim mb-6 text-8xl">⛏️</div>
        <h1 className="font-minecraft mb-3 text-2xl tracking-wider text-green-400 sm:text-3xl">
          NBT Viewer
        </h1>
        <p className="text-gray-400 sm:text-lg">
          Drop your Minecraft playerdata file to explore your world
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Located in{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-300">
            saves/[world]/playerdata/[uuid].dat
          </code>
        </p>
      </div>

      {/* UUID Lookup */}
      <div className="mb-8 w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          🔍 Player Name → UUID
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={uuidUsername}
            onChange={(e) => { setUuidUsername(e.target.value); setUuidResult(null); setUuidError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleUuidLookup()}
            placeholder="Enter player username…"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
          />
          <button
            onClick={handleUuidLookup}
            disabled={uuidLoading || !uuidUsername.trim()}
            className="flex-shrink-0 rounded-lg border border-green-700 bg-green-900/50 px-4 py-2 text-sm font-semibold text-green-300 transition-colors hover:bg-green-800/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uuidLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                Looking…
              </span>
            ) : "Look Up"}
          </button>
        </div>

        {uuidError && (
          <p className="mt-2.5 text-sm text-red-400">⚠️ {uuidError}</p>
        )}

        {uuidResult && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{uuidResult.name}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-gray-400">{uuidResult.uuid}</p>
            </div>
            <button
              onClick={() => copyUUID(uuidResult!.uuid)}
              className="flex-shrink-0 rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:text-white"
            >
              {uuidCopied ? "✓ Copied!" : "📋 Copy UUID"}
            </button>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone relative w-full max-w-xl cursor-pointer rounded-2xl p-10 text-center transition-all duration-200 ${
          isDragging ? "active" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".dat,.nbt"
          className="hidden"
          onChange={handleChange}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
            <p className="text-gray-400">Parsing NBT data…</p>
          </div>
        ) : (
          <>
            <div
              className={`mb-4 text-6xl transition-transform duration-300 ${
                isDragging ? "scale-125" : ""
              }`}
            >
              📂
            </div>
            <p className="mb-1 text-lg font-semibold text-gray-200">
              {isDragging ? "Release to upload" : "Drag & drop your .dat file here"}
            </p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <div className="mt-6 flex justify-center gap-3">
              {[".dat", ".nbt"].map((ext) => (
                <span
                  key={ext}
                  className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 font-mono text-xs text-gray-400"
                >
                  {ext}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-red-400">
          <span>⚠️</span>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Feature hints */}
      <div className="mt-16 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: "❤️", label: "Health & Food" },
          { icon: "⭐", label: "XP & Score" },
          { icon: "🎒", label: "Full Inventory" },
          { icon: "📍", label: "Position" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/40 p-4"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-center text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Vibecoded notice */}
      <p className="mt-8 max-w-md text-center text-xs text-gray-700">
        ⚡ Quickly vibecoded — works for most cases, edge cases may misbehave.
        <br />
        Open source on{" "}
        <a
          href="https://github.com/pixo2000/nbt-viewer"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-500 transition-colors"
        >
          github.com/pixo2000/nbt-viewer
        </a>
      </p>

    </div>
  );
}
