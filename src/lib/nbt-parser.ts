// NBT Tag types
export const NBT_TAG = {
  End: 0,
  Byte: 1,
  Short: 2,
  Int: 3,
  Long: 4,
  Float: 5,
  Double: 6,
  ByteArray: 7,
  String: 8,
  List: 9,
  Compound: 10,
  IntArray: 11,
  LongArray: 12,
} as const;

export type NBTValue =
  | number
  | bigint
  | string
  | number[]
  | bigint[]
  | NBTValue[]
  | NBTCompound;

export interface NBTCompound {
  [key: string]: { type: number; value: NBTValue };
}

class NBTReader {
  private view: DataView;
  private offset: number;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.offset = 0;
  }

  readByte(): number {
    return this.view.getInt8(this.offset++);
  }

  readUnsignedByte(): number {
    return this.view.getUint8(this.offset++);
  }

  readShort(): number {
    const val = this.view.getInt16(this.offset, false);
    this.offset += 2;
    return val;
  }

  readInt(): number {
    const val = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return val;
  }

  readLong(): bigint {
    const hi = this.view.getInt32(this.offset, false);
    const lo = this.view.getUint32(this.offset + 4, false);
    this.offset += 8;
    return (BigInt(hi) << BigInt(32)) | BigInt(lo);
  }

  readFloat(): number {
    const val = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return val;
  }

  readDouble(): number {
    const val = this.view.getFloat64(this.offset, false);
    this.offset += 8;
    return val;
  }

  readString(): string {
    const len = this.view.getUint16(this.offset, false);
    this.offset += 2;
    const bytes = new Uint8Array(this.view.buffer, this.offset, len);
    this.offset += len;
    return new TextDecoder("utf-8").decode(bytes);
  }

  readPayload(type: number): NBTValue {
    switch (type) {
      case NBT_TAG.Byte:
        return this.readByte();
      case NBT_TAG.Short:
        return this.readShort();
      case NBT_TAG.Int:
        return this.readInt();
      case NBT_TAG.Long:
        return this.readLong();
      case NBT_TAG.Float:
        return this.readFloat();
      case NBT_TAG.Double:
        return this.readDouble();
      case NBT_TAG.ByteArray: {
        const len = this.readInt();
        const arr: number[] = [];
        for (let i = 0; i < len; i++) arr.push(this.readUnsignedByte());
        return arr;
      }
      case NBT_TAG.String:
        return this.readString();
      case NBT_TAG.List: {
        const itemType = this.readUnsignedByte();
        const len = this.readInt();
        const arr: NBTValue[] = [];
        for (let i = 0; i < len; i++) arr.push(this.readPayload(itemType));
        return arr;
      }
      case NBT_TAG.Compound:
        return this.readCompound();
      case NBT_TAG.IntArray: {
        const len = this.readInt();
        const arr: number[] = [];
        for (let i = 0; i < len; i++) arr.push(this.readInt());
        return arr;
      }
      case NBT_TAG.LongArray: {
        const len = this.readInt();
        const arr: bigint[] = [];
        for (let i = 0; i < len; i++) arr.push(this.readLong());
        return arr;
      }
      default:
        throw new Error(`Unknown NBT tag type: ${type}`);
    }
  }

  readCompound(): NBTCompound {
    const compound: NBTCompound = {};
    while (true) {
      const type = this.readUnsignedByte();
      if (type === NBT_TAG.End) break;
      const name = this.readString();
      compound[name] = { type, value: this.readPayload(type) };
    }
    return compound;
  }

  readNamed(): { name: string; type: number; value: NBTValue } {
    const type = this.readUnsignedByte();
    const name = this.readString();
    const value = this.readPayload(type);
    return { name, type, value };
  }
}

export async function parseNBT(buffer: ArrayBuffer): Promise<NBTCompound> {
  let data = buffer;

  // Try to decompress with pako (gzip)
  try {
    const pako = await import("pako");
    const uint8 = new Uint8Array(buffer);
    // Check for gzip magic bytes
    if (uint8[0] === 0x1f && uint8[1] === 0x8b) {
      data = pako.inflate(uint8).buffer;
    }
  } catch {
    // Not gzipped or pako not available, use raw
  }

  const reader = new NBTReader(data);
  const root = reader.readNamed();
  return root.value as NBTCompound;
}

// Helper to safely get nested NBT values
export function getVal<T = NBTValue>(
  compound: NBTCompound | undefined,
  key: string
): T | undefined {
  return compound?.[key]?.value as T | undefined;
}

export function getCompound(
  compound: NBTCompound | undefined,
  key: string
): NBTCompound | undefined {
  const val = compound?.[key]?.value;
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as NBTCompound;
  }
  return undefined;
}
