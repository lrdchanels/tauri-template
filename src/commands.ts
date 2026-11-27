// Command registry: every user action that can come from more than one place (a button, the
// native menu, a keyboard shortcut) is a command with an id. Buttons run one with
// `data-action="<id>"`; menus reference the id; shortcuts are declared with the command.
//
//   registerCommand({ id: 'items.export', run: exportItems, keys: 'mod+e' });
//   html`<button data-action="items.export">…</button>`

export interface Command {
  id: string;
  run: () => unknown;
  /** Keyboard shortcut inside the window: 'mod+shift+h' (mod = Ctrl, or ⌘ on macOS). */
  keys?: string;
}

const registry = new Map<string, Command>();

export function registerCommand(c: Command): void {
  registry.set(c.id, c);
}

export function hasCommand(id: string): boolean {
  return registry.has(id);
}

export async function runCommand(id: string): Promise<void> {
  const c = registry.get(id);
  if (!c) throw new Error(`Unknown command: ${id}`);
  await c.run();
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** 'mod+shift+h' → does this key event match? */
export function matches(
  keys: string,
  ev: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
): boolean {
  const parts = keys.toLowerCase().split('+');
  const key = parts.pop();
  const want = new Set(parts);
  const mod = isMac ? ev.metaKey : ev.ctrlKey;
  return (
    ev.key.toLowerCase() === key &&
    want.has('mod') === mod &&
    want.has('shift') === ev.shiftKey &&
    want.has('alt') === ev.altKey
  );
}

/** 'mod+shift+h' → 'Ctrl+Mayús+H' / '⌘⇧H' for labels. */
export function keysLabel(keys: string, shiftName = 'Shift'): string {
  const names: Record<string, string> = isMac
    ? { mod: '⌘', shift: '⇧', alt: '⌥' }
    : { mod: 'Ctrl', shift: shiftName, alt: 'Alt' };
  return keys
    .split('+')
    .map((p) => names[p] ?? p.toUpperCase())
    .join(isMac ? '' : '+');
}

/** 'mod+shift+h' → 'CmdOrCtrl+Shift+H' for native menu accelerators. */
export const accelerator = (keys: string): string =>
  keys
    .split('+')
    .map((p) => ({ mod: 'CmdOrCtrl', shift: 'Shift', alt: 'Alt' })[p] ?? p.toUpperCase())
    .join('+');

export function installShortcuts(doc: Document = document): void {
  doc.addEventListener('keydown', (ev) => {
    for (const c of registry.values()) {
      if (c.keys && matches(c.keys, ev)) {
        ev.preventDefault();
        void c.run();
        return;
      }
    }
  });
}
