// Errors that cross the Rust boundary arrive as { kind, message } (see src-tauri/src/error.rs);
// anything else is normalised here so the UI can always show a message.

export interface AppError {
  kind: string;
  message: string;
}

export function toAppError(e: unknown): AppError {
  if (e && typeof e === 'object' && 'message' in e) {
    const o = e as { kind?: unknown; message: unknown };
    return { kind: typeof o.kind === 'string' ? o.kind : 'error', message: String(o.message) };
  }
  return { kind: 'error', message: String(e) };
}

export const errorMessage = (e: unknown): string => toAppError(e).message;
