"use client";

import { useState } from "react";
import { InventoryItem } from "@/lib/player-data";
import { getItemInfo } from "@/lib/minecraft-data";
import { getItemImageUrls } from "@/lib/apis";
import ItemModal from "@/components/ItemModal";

interface SlotProps {
  item?: InventoryItem;
  label?: string;
  className?: string;
  isSelected?: boolean;
  onClick?: (item: InventoryItem) => void;
}

function ItemImage({ id, emoji, size = 24 }: { id: string; emoji: string; size?: number }) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [itemUrl, blockUrl, entityUrl] = getItemImageUrls(id);
  const urls = [itemUrl, blockUrl, entityUrl];

  if (stage === 3) {
    return <span style={{ fontSize: size * 0.75, lineHeight: 1 }}>{emoji}</span>;
  }
  return (
    <img
      src={urls[stage]}
      alt=""
      width={size}
      height={size}
      className="flex-shrink-0 object-contain"
      style={{ imageRendering: "pixelated" }}
      onError={() => setStage((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : 3))}
    />
  );
}

function ItemTooltip({ item }: { item: InventoryItem }) {
  const info = getItemInfo(item.id);
  const displayName = item.customName ?? info.name;
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{displayName}</p>
      {item.customName && (
        <p className="text-gray-400">{info.name}</p>
      )}
      <p className="mt-0.5 text-gray-400">
        {item.id}
      </p>
      {item.count > 1 && (
        <p className="text-yellow-400">Count: {item.count}</p>
      )}
      {item.damage !== undefined && item.damage > 0 && (
        <p className="text-red-400">Damage: {item.damage}</p>
      )}
      {item.enchantments && item.enchantments.length > 0 && (
        <div className="mt-1 border-t border-gray-700 pt-1">
          {item.enchantments.map((e, i) => (
            <p key={i} className="text-purple-300">
              {e.id
                .replace(/^minecraft:/, "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
              {e.level}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Slot({ item, label, className = "", isSelected, onClick }: SlotProps) {
  const [hovered, setHovered] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const info = item ? getItemInfo(item.id) : null;
  const [itemUrl, blockUrl, entityUrl] = item ? getItemImageUrls(item.id) : ["", "", ""];
  const slotUrls = [itemUrl, blockUrl, entityUrl];

  return (
    <div
      className={`inventory-slot relative aspect-square ${isSelected ? "ring-2 ring-yellow-400" : ""} ${item && onClick ? "cursor-pointer hover:brightness-125 transition-[filter]" : ""} ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => item && onClick && onClick(item)}
    >
      {label && !item && (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
          {label}
        </span>
      )}
      {item && info && (
        <>
          <div className="flex h-full w-full items-center justify-center p-1">
            {stage < 3 ? (
              <img
                src={slotUrls[stage]}
                alt={info.name}
                className="h-full w-full object-contain"
                style={{ imageRendering: "pixelated", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
                onError={() => setStage((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : 3))}
              />
            ) : (
              <span
                className="text-lg sm:text-xl"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
              >
                {info.emoji}
              </span>
            )}
          </div>
          {item.count > 1 && (
            <span className="absolute bottom-0 right-0.5 font-mono text-[10px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
              {item.count}
            </span>
          )}
          {item.enchantments && item.enchantments.length > 0 && (
            <div className="absolute left-0 top-0 h-2 w-2 rounded-full bg-purple-500 opacity-80" />
          )}
          {hovered && <ItemTooltip item={item} />}
        </>
      )}
    </div>
  );
}

interface InventoryGridProps {
  inventory: InventoryItem[];
  armorSlots: (InventoryItem | null)[];
  offhand?: InventoryItem;
  selectedItemSlot: number;
}

export default function InventoryGrid({
  inventory,
  armorSlots,
  offhand,
  selectedItemSlot,
}: InventoryGridProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Build slot map: slot 0-8 = hotbar, 9-35 = main inventory
  const slotMap = new Map<number, InventoryItem>();
  for (const item of inventory) {
    slotMap.set(item.slot, item);
  }

  // Hotbar: slots 0-8
  const hotbar = Array.from({ length: 9 }, (_, i) => slotMap.get(i));
  // Main inventory: slots 9-35
  const mainInv = Array.from({ length: 27 }, (_, i) => slotMap.get(i + 9));

  // Armor: index 0=boots(100), 1=leggings(101), 2=chestplate(102), 3=helmet(103)
  const armorLabels = ["👢", "👖", "🛡️", "🪖"];
  const armorNames = ["Boots", "Leggings", "Chestplate", "Helmet"];

  const hasItems =
    inventory.length > 0 ||
    armorSlots.some(Boolean) ||
    offhand !== undefined;

  return (
    <div className="mc-card space-y-5">
      <h3 className="font-minecraft text-sm text-yellow-400">🎒 Inventory</h3>

      {!hasItems ? (
        <p className="text-center text-gray-500">Inventory is empty</p>
      ) : (
        <>
          {/* Armor + Offhand */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Equipment
            </p>
            <div className="flex flex-wrap gap-2">
              {armorSlots
                .slice()
                .reverse()
                .map((item, revIdx) => {
                  const realIdx = 3 - revIdx;
                  return (
                    <div key={realIdx} className="flex flex-col items-center gap-1">
                      <Slot
                        item={item ?? undefined}
                        label={armorLabels[realIdx]}
                        className="armor h-12 w-12"
                        onClick={setSelectedItem}
                      />
                      <span className="text-[10px] text-gray-600">{armorNames[realIdx]}</span>
                    </div>
                  );
                })}
              {offhand !== undefined && (
                <div className="flex flex-col items-center gap-1">
                  <Slot item={offhand} className="offhand h-12 w-12" onClick={setSelectedItem} />
                  <span className="text-[10px] text-gray-600">Offhand</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Inventory */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Main Inventory
            </p>
            <div className="grid grid-cols-9 gap-1">
              {mainInv.map((item, i) => (
                <Slot key={i + 9} item={item} className="h-9 w-full sm:h-11" onClick={setSelectedItem} />
              ))}
            </div>
          </div>

          {/* Hotbar */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Hotbar
            </p>
            <div className="grid grid-cols-9 gap-1">
              {hotbar.map((item, i) => (
                <Slot
                  key={i}
                  item={item}
                  className="hotbar h-9 w-full sm:h-11"
                  isSelected={i === selectedItemSlot}
                  onClick={setSelectedItem}
                />
              ))}
            </div>
            <p className="mt-1.5 text-right text-xs text-gray-600">
              Selected slot: {selectedItemSlot + 1}
            </p>
          </div>

          {/* Item list */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Item List ({inventory.length} stacks)
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {[...inventory]
                .sort((a, b) => a.slot - b.slot)
                .map((item) => {
                  const info = getItemInfo(item.id);
                  const displayName = item.customName ?? info.name;
                  return (
                    <div
                      key={item.slot}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2 transition-colors hover:border-gray-600 hover:bg-gray-700/40"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-center gap-2">
                        <ItemImage id={item.id} emoji={info.emoji} size={28} />
                        <div>
                          <p
                            className="text-sm text-white"
                            style={
                              item.enchantments && item.enchantments.length > 0
                                ? { color: "#c084fc" }
                                : {}
                            }
                          >
                            {displayName}
                          </p>
                          {item.enchantments && item.enchantments.length > 0 && (
                            <p className="text-xs text-purple-400">
                              {item.enchantments
                                .map(
                                  (e) =>
                                    e.id
                                      .replace(/^minecraft:/, "")
                                      .replace(/_/g, " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase()) +
                                    " " +
                                    e.level
                                )
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-400">
                          Slot {item.slot}
                        </span>
                        {item.count > 1 && (
                          <span className="font-mono text-sm font-bold text-yellow-400">
                            x{item.count}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      {selectedItem && (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
