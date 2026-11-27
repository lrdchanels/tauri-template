// View registry: order here is the order in the sidebar. The first 'main' view is the default route.

import { home } from './home';
import { settings } from './settings';
import type { View } from './types';

export const VIEWS: View[] = [home, settings];

export const DEFAULT_VIEW = VIEWS.find((v) => v.nav === 'main')?.id ?? VIEWS[0]!.id;

export const findView = (id: string): View | undefined => VIEWS.find((v) => v.id === id);
