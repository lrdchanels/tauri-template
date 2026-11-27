// Decodes the binary buffer that `pick_files` returns (see pack() in src-tauri/src/files.rs):
// u32 count, then per file: u32 name length, UTF-8 name, u32 data length, data (little endian).
// Raw bytes cross the IPC as an ArrayBuffer instead of a JSON array of numbers.

export interface PackedFile {
  name: string;
  bytes: Uint8Array;
}

export function unpackFiles(buffer: ArrayBuffer): PackedFile[] {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  let at = 0;
  const u32 = () => {
    if (at + 4 > buffer.byteLength) throw new Error('unpackFiles: truncated buffer');
    const v = view.getUint32(at, true);
    at += 4;
    return v;
  };
  const take = (n: number) => {
    if (at + n > buffer.byteLength) throw new Error('unpackFiles: truncated buffer');
    const b = new Uint8Array(buffer, at, n);
    at += n;
    return b;
  };
  const count = u32();
  const files: PackedFile[] = [];
  for (let i = 0; i < count; i++) {
    const name = decoder.decode(take(u32()));
    files.push({ name, bytes: take(u32()) });
  }
  return files;
}
