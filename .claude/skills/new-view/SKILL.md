---
name: new-view
description: Add a new screen (view) to the app with its route, sidebar entry, translations and an E2E test. Use when the user asks for a new page, screen, tab or section of the app.
---

# Add a view

Ask for (or infer) an `id` (lowercase, no slashes), a title, an icon and whether it goes in the
sidebar (`main`), the footer (`footer`) or nowhere (`hidden`).

1. Create `src/views/<id>.ts` exporting a `View` (see `src/views/types.ts`). Start from
   `src/views/home.ts`: it shows a form, the store, a table and a chart. Keep `render(root, ctx)`
   pure: read `store.*.value`, append markup built with `html```, attach listeners inside `root`,
   save with `store.x.update()`, then `ctx.rerender()`.
2. Register it in `src/views/index.ts` (array order = sidebar order).
3. Add every string to `src/i18n/es.ts` and `src/i18n/en.ts` under `<id>.*` keys. Spanish copy:
   plain sentences, sentence case.
4. If you need an icon that does not exist, add a 24×24 stroke path to `ICONS` in
   `src/ui/components.ts`.
5. Styles: reuse classes from `src/styles/components.css` (`block`, `lead`, `fields`, `field`,
   `group`/`row` via `group()`/`row()`, `btn`, `chart`…). The shell paints the view title as an
   `<h1>`; sections inside use `section()` (`<h2>`). New view-specific CSS goes at the end of that file under a comment
   with the view id, using only CSS variables from `tokens.css`.
6. Add `e2e/<id>.spec.ts`: navigate to `/#<id>`, check the heading and the main interaction.
7. Run `npm run check` and fix everything it reports.
