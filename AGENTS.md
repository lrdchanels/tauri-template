# AGENTS.md

Instructions for AI coding agents live in [CLAUDE.md](CLAUDE.md): read it first.

Short version:

- Run `npm run check` before finishing; it is exactly what CI runs.
- System access only through `src/platform/`; UI text only through `t()` (`src/i18n/`); markup
  only through `html``…`` (`src/ui/html.ts`); money only through `money*()` (`src/ui/format.ts`).
- Step-by-step recipes: [docs/recipes.md](docs/recipes.md).
