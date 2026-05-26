# Learning-with-Court Workshops

Interactive technical and creative workshops that run inside Claude Cowork and Claude Code. Subscribe to this marketplace once, then start any workshop in your catalog with a single prompt.

## What's in this marketplace

| Plugin | What it does |
|---|---|
| `lwc` | The platform. Generic orchestrator + lesson-runner skills that drive any LWC workshop. The actual workshop content (lesson prose, verify scripts) is served at runtime from `workshop.institute`. |

You install one plugin. New workshops appear automatically as they're added to your account — no plugin update needed.

## How the MCP server is wired

The plugin's MCP server is the `@learning-with-court/cli` running in stdio mode. The CLI is **vendored as a single-file Node bundle** (`plugins/lwc-workshops/cli.bundle.mjs`), so Cowork's sandboxed VM can spawn it directly with `node` — no `npm`/`npx` required.

Claude Code users don't need a separate install either; the plugin runs the bundle the same way. (If you prefer the host-installed CLI for direct `lwc` invocations outside of MCP, `npm i -g @learning-with-court/cli` still works.)

### Refreshing the bundle (maintainer note)

The bundle is vendored from `@learning-with-court/cli`. On each CLI release, refresh it from the platform monorepo:

```
pnpm --filter @learning-with-court/cli build
cp ../learning-with-court-platform/packages/cli/dist/cli.bundle.mjs \
   plugins/lwc-workshops/cli.bundle.mjs
```

Bump `plugins/lwc-workshops/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` versions together.

## Install in Claude Cowork

1. Open **Claude Desktop** and click the **Cowork** tab.
2. Click **Customize** in the sidebar.
3. Open the **Plugins** section.
4. Click the **Personal** tab.
5. Click the **+** button next to your existing marketplace tabs.
6. Click **Add marketplace**.
7. In the dialog's URL field, paste:
   ```
   learning-with-court/lwc
   ```
8. Click **Sync**.

The marketplace appears in your Personal tabs. Find `lwc` in the listing and install it. Then in any new Cowork chat, say "let's start a workshop" and Claude will list what's available to you.

## Install in Claude Code

```
/plugin marketplace add learning-with-court/lwc
/plugin install lwc
```

Then say "let's start a workshop" in any Claude Code session.

## Auth

After installing, the first time you try to start a workshop the platform will walk you through signing in to `workshop.institute` via your browser. This is one-time and unlocks the workshops your account is entitled to.

## What this marketplace isn't

- Not the workshop source code (those live in private LWC repos and are served at runtime).
- Not where you upload your own personal skills (that's Cowork's Skills UI: Customize → Skills → +).
- Not affiliated with Anthropic's official plugin catalog (Anthropic & Partners tab).
