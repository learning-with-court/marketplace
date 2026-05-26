# Learning-with-Court Workshops

Interactive technical and creative workshops that run inside Claude Cowork and Claude Code. Subscribe to this marketplace once, then start any workshop in your catalog with a single prompt.

## What's in this marketplace

| Plugin | What it does |
|---|---|
| `lwc-workshops` | The platform. Generic orchestrator + lesson-runner skills that drive any LWC workshop. The actual workshop content (lesson prose, verify scripts) is served at runtime from `workshop.institute`. |

You install one plugin. New workshops appear automatically as they're added to your account — no plugin update needed.

## Install in Claude Cowork

1. Open **Claude Desktop** and click the **Cowork** tab.
2. Click **Customize** in the sidebar.
3. Open the **Plugins** section.
4. Click the **Personal** tab.
5. Click the **+** button next to your existing marketplace tabs.
6. Click **Add marketplace**.
7. In the dialog's URL field, paste:
   ```
   learning-with-court/marketplace
   ```
8. Click **Sync**.

The marketplace appears in your Personal tabs. Find `lwc-workshops` in the listing and install it. Then in any new Cowork chat, say "let's start a workshop" and Claude will list what's available to you.

## Install in Claude Code

```
/plugin marketplace add learning-with-court/marketplace
/plugin install lwc-workshops
```

Then say "let's start a workshop" in any Claude Code session.

## Auth

After installing, the first time you try to start a workshop the platform will walk you through signing in to `workshop.institute` via your browser. This is one-time and unlocks the workshops your account is entitled to.

## What this marketplace isn't

- Not the workshop source code (those live in private LWC repos and are served at runtime).
- Not where you upload your own personal skills (that's Cowork's Skills UI: Customize → Skills → +).
- Not affiliated with Anthropic's official plugin catalog (Anthropic & Partners tab).
