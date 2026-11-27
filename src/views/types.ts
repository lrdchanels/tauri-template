// What a view is and what it receives. Views live in src/views/, are registered in
// src/views/index.ts and are pure functions of (root, ctx): they read the store, paint into
// `root` and attach listeners to elements inside it.

import type { MessageKey } from '../i18n';
import type { Config } from '../store';
import type { IconName } from '../ui/components';

export interface ViewContext {
  /** UI state of this view that survives repaints and navigation (selected tab, filters…). */
  state: Record<string, unknown>;
  /** Second part of the route: #settings/data → 'data'. */
  sub: string | null;
  /** Repaints this view without the entry animation (after a control changes). */
  rerender(): void;
  /** Navigates to a route: navigate('settings/data'). */
  navigate(route: string): void;
  /** Changes a preference, saves it and applies it to the whole app. */
  setPreference<K extends keyof Config['preferences']>(
    key: K,
    value: Config['preferences'][K],
  ): Promise<void>;
}

export interface View {
  /** Route id: #<id>. Lowercase, no slashes. */
  id: string;
  title: MessageKey;
  icon: IconName;
  /** Where the sidebar shows it: the main list, the footer, or nowhere (reachable by route only). */
  nav: 'main' | 'footer' | 'hidden';
  render(root: HTMLElement, ctx: ViewContext): void;
}
