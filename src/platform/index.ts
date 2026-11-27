// The single door to the system. Import `platform` from here; never import @tauri-apps/* or call
// invoke() anywhere else.

import { browser } from './browser';
import { native } from './native';
import type { Platform } from './types';

export * from './types';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const platform: Platform = isTauri ? native : browser;
