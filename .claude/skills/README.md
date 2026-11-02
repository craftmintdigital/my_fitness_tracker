# Project skills

Claude Code loads these automatically in this repo, both locally and in cloud sessions.

| Skill | Source | Why it's here |
|---|---|---|
| `awaken-dev` | Written for this repo | Conventions (cache version, save format, token handling) plus a one-command browser smoke test |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) @ `ca45fc4`, unmodified, Apache-2.0 (see its `LICENSE.txt`) | Playwright patterns for testing the PWA in a real browser |

## Deliberately not vendored here

- **General-purpose workflow frameworks:** Superpowers, gstack, Get Shit Done. Install at most one, on your own machine, with its own installer, so it works across projects and keeps updating. They overlap and conflict with each other.
- **Skills already on the claude.ai account:** skill-creator, frontend-design, and the design plugin (critique, accessibility review, UX copy).
- **Anthropic's `brand-guidelines`:** it applies Anthropic's brand, not this app's.
- **Not relevant here:** `mcp-builder` (no MCP server here), `figma-implement-design` (Codex-format, needs Figma), the Composio `webapp-testing` copies (duplicates of the one above), and the large designer-skills packs (Owl-Listener, julianoczkowski).
- **Excalidraw diagrams:** not needed for this app.
- **AccessLint:** it depends on its own plugin's MCP server (pulled unpinned via `npx @accesslint/mcp@latest`) and plugin-namespaced tool names, so a copied folder wouldn't work. If you want it, install it as a plugin. Otherwise use the design plugin's accessibility review.

If you add a third-party skill, pin it to a commit, keep its license, and read it first. Skills are instructions Claude follows with access to this repo.
