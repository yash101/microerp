export type TarEntry = {
  path: string;
  data: Uint8Array;
};

const blockSize = 512;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function assertSafePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\\")) {
    throw new Error(`Unsafe tar path: ${path}`);
  }
}

function splitTarPath(path: string) {
  const encoded = textEncoder.encode(path);
  if (encoded.length <= 100) {
    return { name: path, prefix: "" };
  }

  const parts = path.split("/");
  for (let index = 1; index < parts.length; index += 1) {
    const prefix = parts.slice(0, index).join("/");
    const name = parts.slice(index).join("/");
    if (textEncoder.encode(prefix).length <= 155 && textEncoder.encode(name).length <= 100) {
      return { name, prefix };
    }
  }

  throw new Error(`Tar path is too long: ${path}`);
}

function writeText(target: Uint8Array, offset: number, length: number, value: string) {
  const bytes = textEncoder.encode(value);
  target.set(bytes.slice(0, length), offset);
}

function writeOctal(target: Uint8Array, offset: number, length: number, value: number) {
  const text = value.toString(8).padStart(length - 1, "0");
  writeText(target, offset, length, text.slice(-length + 1));
}

function readText(source: Uint8Array, offset: number, length: number) {
  const bytes = source.slice(offset, offset + length);
  const end = bytes.indexOf(0);
  return textDecoder.decode(end === -1 ? bytes : bytes.slice(0, end));
}

function readOctal(source: Uint8Array, offset: number, length: number) {
  const text = readText(source, offset, length).trim();
  return text ? Number.parseInt(text, 8) : 0;
}

function createHeader(entry: TarEntry) {
  assertSafePath(entry.path);
  const { name, prefix } = splitTarPath(entry.path);
  const header = new Uint8Array(blockSize);

  writeText(header, 0, 100, name);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, entry.data.byteLength);
  writeOctal(header, 136, 12, Math.floor(Date.now() / 1000));
  header.fill(0x20, 148, 156);
  writeText(header, 156, 1, "0");
  writeText(header, 257, 6, "ustar");
  writeText(header, 263, 2, "00");
  writeText(header, 345, 155, prefix);

  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const checksumText = checksum.toString(8).padStart(6, "0");
  writeText(header, 148, 6, checksumText);
  header[154] = 0;
  header[155] = 0x20;

  return header;
}

function paddedLength(size: number) {
  return Math.ceil(size / blockSize) * blockSize;
}

export function createTar(entries: TarEntry[]) {
  const totalLength =
    entries.reduce((sum, entry) => sum + blockSize + paddedLength(entry.data.byteLength), 0) + blockSize * 2;
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const entry of entries) {
    output.set(createHeader(entry), offset);
    offset += blockSize;
    output.set(entry.data, offset);
    offset += paddedLength(entry.data.byteLength);
  }

  return output;
}

export function readTar(archive: Uint8Array) {
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + blockSize <= archive.byteLength) {
    const header = archive.slice(offset, offset + blockSize);
    if (header.every((byte) => byte === 0)) break;

    const name = readText(header, 0, 100);
    const prefix = readText(header, 345, 155);
    const path = prefix ? `${prefix}/${name}` : name;
    const size = readOctal(header, 124, 12);
    const dataStart = offset + blockSize;
    const dataEnd = dataStart + size;

    assertSafePath(path);
    if (dataEnd > archive.byteLength) {
      throw new Error(`Tar entry is truncated: ${path}`);
    }

    entries.push({ path, data: archive.slice(dataStart, dataEnd) });
    offset = dataStart + paddedLength(size);
  }

  return entries;
}

function arrayBufferFromBytes(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function gzipBytes(bytes: Uint8Array) {
  const stream = new Blob([arrayBufferFromBytes(bytes)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function gunzipBytes(bytes: Uint8Array) {
  const stream = new Blob([arrayBufferFromBytes(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
