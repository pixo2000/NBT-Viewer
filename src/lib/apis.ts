export interface PlayerProfile {
  uuid: string;
  username: string;
  avatarUrl: string;
  skinUrl?: string;
}

/**
 * Fetch a Minecraft player profile by UUID.
 * Tries playerdb.co first (reliable CORS proxy), falls back to ashcon.app.
 */
export async function fetchPlayerProfile(
  uuid: string
): Promise<PlayerProfile | null> {
  const clean = uuid.replace(/-/g, "");

  // Try playerdb.co
  try {
    const res = await fetch(`https://playerdb.co/api/player/minecraft/${clean}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const username: string = data?.data?.player?.username ?? "";
      if (username) {
        return {
          uuid: data?.data?.player?.id ?? uuid,
          username,
          // minotar uses the username for a reliable pixel-perfect helm render
          avatarUrl: `https://minotar.net/helm/${username}/128.png`,
          skinUrl: data?.data?.player?.properties?.textures?.skin?.url,
        };
      }
    }
  } catch { /* fall through */ }

  // Fallback: ashcon.app
  try {
    const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${clean}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const username: string = data.username ?? "";
      return {
        uuid: data.uuid ?? uuid,
        username,
        avatarUrl: username
          ? `https://minotar.net/helm/${username}/128.png`
          : `https://minotar.net/helm/${clean}/128.png`,
        skinUrl: data.textures?.skin?.url,
      };
    }
  } catch { /* fall through */ }

  return null;
}

/**
 * minotar.net avatar URL — takes a UUID (no dashes) as fallback if username unknown.
 */
export function getPlayerAvatarUrl(uuid: string): string {
  const clean = uuid.replace(/-/g, "");
  return `https://minotar.net/helm/${clean}/128.png`;
}

const MC_ASSETS_BASE =
  "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures";

/**
 * Returns [itemUrl, blockFallbackUrl, entityFallbackUrl] for a given namespaced item ID.
 * Components that display item textures should try item URL first,
 * then block URL, then entity URL, then fall back to emoji.
 */
export function getItemImageUrls(itemId: string): [string, string, string] {
  const name = itemId.replace(/^minecraft:/, "").toLowerCase();
  return [
    `${MC_ASSETS_BASE}/item/${name}.png`,
    `${MC_ASSETS_BASE}/block/${name}.png`,
    `${MC_ASSETS_BASE}/entity/${name}/${name}.png`,
  ];
}

/** @deprecated use getItemImageUrls instead */
export function getItemImageUrl(itemId: string): string {
  return getItemImageUrls(itemId)[0];
}

/**
 * Look up a Minecraft UUID from a player username.
 * Uses Mojang API with playerdb.co as fallback.
 */
export async function fetchPlayerUUID(
  username: string
): Promise<{ uuid: string; name: string } | null> {
  // Try Mojang API
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.id && data?.name) {
        // Insert dashes: 8-4-4-4-12
        const raw: string = data.id;
        const uuid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
        return { uuid, name: data.name };
      }
    }
  } catch { /* fall through */ }

  // Fallback: playerdb.co
  try {
    const res = await fetch(
      `https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`,
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      const uuid: string = data?.data?.player?.id ?? "";
      const name: string = data?.data?.player?.username ?? "";
      if (uuid && name) return { uuid, name };
    }
  } catch { /* fall through */ }

  return null;
}
