# Learning-with-Court Workshops

Interactive technical and creative workshops that run inside Claude Cowork and Claude Code. Subscribe to this marketplace once, then start any workshop in your catalog with a single prompt.

## What's in this marketplace

| Plugin | What it does |
|---|---|
| `lwc` | The platform. Generic orchestrator + lesson-runner skills that drive any LWC workshop. The actual workshop content (lesson prose, verify scripts) is served at runtime from `workshop.institute`. |

You install one plugin. New workshops appear automatically as they're added to your account — no plugin update needed.

## How MCP is wired

The plugin ships **skills only**. The MCP transport is a separate piece, and the right answer depends on which surface you're using:

- **Cowork (claude.ai / Desktop)** — add the **LWC Custom Connector** alongside the plugin. The connector signs in via OAuth and talks to `mcp.workshop.institute/mcp`. The plugin's skills then drive the workshop.
- **Claude Code (CLI)** — install `@learning-with-court/cli` globally. `lwc setup <workshop-id>` lays down a `.mcp.json` in the workshop folder so Code spawns the CLI as a stdio MCP server. The plugin's skills are optional in this mode — the CLI's own MCP tools handle setup and the orchestrator/lesson-runner skills are bundled with each workshop repo.

**One install page covers both flows:** <https://workshop.institute/add-to-claude>

## Install in Claude Cowork (short version)

1. **Plugin.** Customize → Plugins → Personal → + → Add marketplace → paste `learning-with-court/lwc`. Enable the `lwc` plugin.
2. **Connector.** Customize → Connectors → + → Add custom connector. URL: `https://mcp.workshop.institute/mcp`. Advanced → OAuth Client ID: `OwQKvLdDebg2PZqs`. Add → Sign in.
3. Restart conversation. Say "let's start a workshop."

Full step-by-step (with screenshots): <https://workshop.institute/add-to-claude>

## Install in Claude Code (short version)

```
npm i -g @learning-with-court/cli@latest
lwc auth login
lwc setup <workshop-id>
cd ~/learning-with-court/<workshop-id> && claude .
```

Full step-by-step: <https://workshop.institute/add-to-claude>

## What this marketplace isn't

- Not the workshop source code (those live in private LWC repos and are served at runtime).
- Not where you upload your own personal skills (that's Cowork's Skills UI: Customize → Skills → +).
- Not affiliated with Anthropic's official plugin catalog (Anthropic & Partners tab).
