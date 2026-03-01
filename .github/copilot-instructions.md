# NBT Viewer – Copilot Instructions

This is a Next.js 15 Minecraft NBT playerdata viewer.

## Architecture
- `src/lib/nbt-parser.ts` — Custom binary NBT parser with gzip support via pako
- `src/lib/player-data.ts` — Extracts structured PlayerData from parsed NBT compound  
- `src/lib/minecraft-data.ts` — Item emoji/name mappings, dimension/gamemode constants
- `src/components/` — React components for each UI section
- `src/app/page.tsx` — Main page orchestrating upload and display

## Key Rules
- All parsing is browser-side (no API routes, no file uploads to a server)
- Support both modern NBT format (1.20.5+ with `components`) and legacy (with `tag`)
- Styling uses Tailwind CSS with the custom `mc-card`, `inventory-slot`, etc. utility classes defined in `globals.css`
