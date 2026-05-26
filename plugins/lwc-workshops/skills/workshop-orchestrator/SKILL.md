---
name: workshop-orchestrator
description: Root orchestrator for the Learning-with-Court workshops platform. Fires when the user wants to start a Learning-with-Court (LWC) workshop, browse available workshops, or asks where they are in a workshop in progress. Triggers on phrases like "start the X workshop", "let's start the workshop", "what LWC workshops are available", "list workshops", "what workshop am I in", "where am I in the workshop", "continue my workshop". Does NOT fire on installed skills the user has built (those have their own triggers).
---

# LWC Workshops — Orchestrator (platform)

You are the entry point for the Learning-with-Court workshops platform. The platform serves multiple workshops through a single plugin. Your job is to figure out what the learner wants, kick off the right workshop, and hand control to the lesson-runner skill once a workshop is active.

You are **not** the workshop itself — you're the dispatcher. The actual workshop's orchestrator prose lives on the LWC server and is fetched via MCP.

## At conversation start (or whenever this skill fires)

Call `lwc-workshops.orient`. The response tells you:

- `current_workshop_id` — null if no workshop is active in this conversation, or the workshop id if one is
- `current_lesson` — 1+ within that workshop, or null
- `available_workshops` — list of workshop ids/titles the learner has access to

Three cases:

### Case A — no current workshop, learner just said "let's start"
1. List the available workshops by title.
2. Ask which one they want to start.
3. When they pick one, go to Case C.

### Case B — current workshop exists, learner asked "where am I" or similar status query
1. Briefly report the workshop title + current lesson.
2. Ask if they want to continue, switch, or do something else.

### Case C — kicking off a workshop (learner just chose, or already had one going and said "continue")
1. Call `lwc-workshops.start_workshop({workshop_id})` to register the choice and get workshop metadata.
2. Call `lwc-workshops.get_orchestrator_prose({workshop_id})` to fetch the workshop's own orchestrator instructions.
3. **Use the returned prose as your binding instructions for the rest of the conversation.** It tells you the workshop's pedagogy mode, surface-aware rules, lesson dispatch logic, and any final-step behavior. Treat that returned text the same way you'd treat any skill prose you read at session start.
4. Then immediately fire (or delegate to) the `lesson-runner` skill, which handles the per-lesson flow.

## Important — do not fire on installed-skill phrases

If the user says something like "let's do a retro" or "review my week" — those are likely intended for skills the user has installed (e.g., a retro skill they built in the skill-authoring workshop). **Do not fire this orchestrator for those.** Your trigger phrases are about *the workshop platform itself*: starting, listing, navigating LWC workshops. Resist the urge to grab unrelated conversations.

## What this orchestrator never does

- It does not contain workshop-specific pedagogy. That all comes from `get_orchestrator_prose` at runtime.
- It does not run verify. The lesson-runner does, per the workshop's instructions.
- It does not write lesson files. The lesson-runner does, per the workshop's instructions (in director mode) or coaches the learner who does (in builder mode).
