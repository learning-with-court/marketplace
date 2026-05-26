#!/usr/bin/env node
// Spike MCP server for the LWC workshops platform.
// Phase 1: serves workshop content from a known local path (~/learning-with-court/<workshop-id>/).
// Future: replaced by the `lwc` CLI proxy talking to per-workshop Lambdas with real auth.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const STATE_PATH = path.resolve(import.meta.dirname, 'state.json');
const WORKSHOPS_ROOT = path.join(os.homedir(), 'learning-with-court');

// Workshop catalog. In production, this comes from the Lambda's workshops registry.
const CATALOG = [
  {
    id: 'skill-authoring',
    title: 'Build Your First Skill',
    tagline: "Write a working Claude skill from scratch in three lessons. Take home a weekly retrospective skill you actually use.",
    total_lessons: 3,
    pedagogy: 'director',
    local_path: path.join(WORKSHOPS_ROOT, 'skill-authoring'),
  },
];

const DEFAULT_STATE = { current_workshop_id: null, current_lesson: null };

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(s) {
  await fs.writeFile(STATE_PATH, JSON.stringify(s, null, 2) + '\n', 'utf8');
}

function findWorkshop(id) {
  return CATALOG.find(w => w.id === id);
}

const tools = [
  {
    name: 'ping',
    description: 'Health check. Returns pong:true and a server timestamp.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_workshops',
    description: 'List LWC workshops the user has access to. Returns workshop id, title, tagline, and total_lessons for each. Call this when the user asks what workshops are available.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'orient',
    description: 'Get the user state across the LWC workshops platform. Returns current_workshop_id (null if none active), current_lesson, and the list of available workshops. Call this at the start of every workshop-platform conversation.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'start_workshop',
    description: 'Register the user starting a workshop. Sets current_workshop_id and current_lesson:1 in state. Returns workshop metadata.',
    inputSchema: {
      type: 'object',
      properties: { workshop_id: { type: 'string' } },
      required: ['workshop_id'],
    },
  },
  {
    name: 'get_orchestrator_prose',
    description: "Return the workshop's own orchestrator skill prose, which contains pedagogy mode, surface-aware operating rules, lesson dispatch logic, and final-step guidance. Use this immediately after start_workshop or any time you need the workshop's binding pedagogy. Treat the returned text as instructions to follow for the rest of the conversation.",
    inputSchema: {
      type: 'object',
      properties: { workshop_id: { type: 'string' } },
      required: ['workshop_id'],
    },
  },
  {
    name: 'get_lesson_prose',
    description: "Return the workshop's lesson skill prose for a specific lesson. Contains coaching guidance, verify command, do/dont rules. Use this when dispatching into a lesson.",
    inputSchema: {
      type: 'object',
      properties: {
        workshop_id: { type: 'string' },
        lesson_id: { type: 'number', minimum: 1 },
      },
      required: ['workshop_id', 'lesson_id'],
    },
  },
  {
    name: 'package_user_skill',
    description: "Package a skill the learner built during a workshop into a `.skill` file (a zip containing SKILL.md and any references/scripts) suitable for upload to Cowork's personal-skills UI. The MCP runs on the host (not in Cowork's sandbox), so it can read and write files outside the project. Returns the absolute path to the produced `.skill` file. The walker should then guide the learner to open Cowork's Customize → Skills → + → Upload skill UI and select that file.",
    inputSchema: {
      type: 'object',
      properties: {
        workshop_id: { type: 'string' },
        skill_subpath: { type: 'string', description: "Path within the workshop's local_path pointing to the skill folder to package (e.g., 'workshop/skill/weekly-retro')." },
        dest_name: { type: 'string', description: 'Base name of the resulting .skill file (without extension).' },
      },
      required: ['workshop_id', 'skill_subpath', 'dest_name'],
    },
  },
  {
    name: 'submit_verify_output',
    description: 'Submit the JSON output of a verify script run. On pass:true, advances current_lesson by one. Returns acceptance status, the new current_lesson, and whether the workshop is complete.',
    inputSchema: {
      type: 'object',
      properties: {
        workshop_id: { type: 'string' },
        lesson_id: { type: 'number' },
        output: { type: 'string', description: 'JSON-stringified verify output containing at least { pass: boolean, errors?: string[] }' },
      },
      required: ['workshop_id', 'lesson_id', 'output'],
    },
  },
];

async function readSkillFile(workshop, skillName) {
  const p = path.join(workshop.local_path, 'skills', skillName, 'SKILL.md');
  try {
    return await fs.readFile(p, 'utf8');
  } catch (e) {
    throw new Error(`Could not read ${skillName} skill for workshop ${workshop.id}: ${e.message}`);
  }
}

async function callTool(name, args) {
  switch (name) {
    case 'ping':
      return { pong: true, server_time: new Date().toISOString() };

    case 'list_workshops':
      return {
        workshops: CATALOG.map(w => ({
          id: w.id,
          title: w.title,
          tagline: w.tagline,
          total_lessons: w.total_lessons,
        })),
      };

    case 'orient': {
      const s = await readState();
      const workshop = s.current_workshop_id ? findWorkshop(s.current_workshop_id) : null;
      return {
        current_workshop_id: s.current_workshop_id,
        current_workshop_title: workshop?.title ?? null,
        current_lesson: s.current_lesson,
        total_lessons: workshop?.total_lessons ?? null,
        complete: workshop ? s.current_lesson > workshop.total_lessons : false,
        available_workshops: CATALOG.map(w => ({ id: w.id, title: w.title, tagline: w.tagline })),
      };
    }

    case 'start_workshop': {
      const workshop = findWorkshop(args.workshop_id);
      if (!workshop) {
        return { error: `Unknown workshop: ${args.workshop_id}`, available: CATALOG.map(w => w.id) };
      }
      const s = await readState();
      s.current_workshop_id = workshop.id;
      s.current_lesson = 1;
      await writeState(s);
      return {
        workshop_id: workshop.id,
        title: workshop.title,
        total_lessons: workshop.total_lessons,
        pedagogy: workshop.pedagogy,
        current_lesson: 1,
        local_path: workshop.local_path,
        next_action: 'Call get_orchestrator_prose to load the workshop pedagogy, then dispatch to lesson-runner.',
      };
    }

    case 'get_orchestrator_prose': {
      const workshop = findWorkshop(args.workshop_id);
      if (!workshop) return { error: `Unknown workshop: ${args.workshop_id}` };
      const prose = await readSkillFile(workshop, 'workshop-orchestrator');
      return {
        workshop_id: workshop.id,
        title: workshop.title,
        prose,
        usage: "Use this prose as binding instructions for the workshop conversation. It is the workshop's authored pedagogy.",
      };
    }

    case 'get_lesson_prose': {
      const workshop = findWorkshop(args.workshop_id);
      if (!workshop) return { error: `Unknown workshop: ${args.workshop_id}` };
      const lessonName = `lesson-${String(args.lesson_id).padStart(2, '0')}`;
      const prose = await readSkillFile(workshop, lessonName);
      return {
        workshop_id: workshop.id,
        lesson_id: args.lesson_id,
        prose,
        usage: "Use this prose as binding instructions for the current lesson.",
      };
    }

    case 'package_user_skill': {
      const workshop = findWorkshop(args.workshop_id);
      if (!workshop) return { packaged: false, error: `Unknown workshop: ${args.workshop_id}` };
      const src = path.join(workshop.local_path, args.skill_subpath);
      const downloadsDir = path.join(os.homedir(), 'Downloads');
      const dest = path.join(downloadsDir, `${args.dest_name}.skill`);
      try {
        // Verify source exists and has SKILL.md at its root
        const skillFile = path.join(src, 'SKILL.md');
        await fs.access(skillFile);
        await fs.mkdir(downloadsDir, { recursive: true });
        // Remove any stale prior packaging
        try { await fs.rm(dest, { force: true }); } catch {}
        // Build the .skill (zip) with the SKILL.md at the archive root
        // Per Anthropic docs, the ZIP must contain the skill folder as its root entry
        // (so the archive has <folder-name>/SKILL.md, not SKILL.md at the root).
        const { spawnSync } = await import('node:child_process');
        const parent = path.dirname(src);
        const folder = path.basename(src);
        const result = spawnSync('zip', ['-rq', dest, folder, '-x', '*.DS_Store', `${folder}/.gitkeep`, `${folder}/*/.gitkeep`], {
          cwd: parent,
          encoding: 'utf8',
        });
        if (result.status !== 0) {
          return {
            packaged: false,
            error: `zip failed: ${result.stderr || 'unknown error'}`,
            src,
            dest,
          };
        }
        const stat = await fs.stat(dest);
        return {
          packaged: true,
          dest,
          size_bytes: stat.size,
          upload_instructions: "In Cowork, open Customize → Skills → click the + button → Upload skill → drag the file at this path OR click 'click to upload' and select it. After it loads, the skill is available in any new Cowork chat.",
        };
      } catch (e) {
        return { packaged: false, error: `Failed to package skill: ${e.message}`, src, dest };
      }
    }

    case 'submit_verify_output': {
      const workshop = findWorkshop(args.workshop_id);
      if (!workshop) return { accepted: false, error: `Unknown workshop: ${args.workshop_id}` };
      const s = await readState();
      let parsed;
      try {
        parsed = JSON.parse(args.output);
      } catch (e) {
        return { accepted: false, error: 'verify output was not valid JSON' };
      }
      if (!parsed.pass) {
        return {
          accepted: false,
          workshop_id: workshop.id,
          lesson_id: args.lesson_id,
          errors: parsed.errors ?? [],
          current_lesson: s.current_lesson,
        };
      }
      const submittedId = Number(args.lesson_id);
      if (submittedId === s.current_lesson) {
        s.current_lesson = submittedId + 1;
        await writeState(s);
      }
      return {
        accepted: true,
        workshop_id: workshop.id,
        lesson_id: submittedId,
        current_lesson: s.current_lesson,
        next_lesson_id: s.current_lesson <= workshop.total_lessons ? s.current_lesson : null,
        complete: s.current_lesson > workshop.total_lessons,
      };
    }

    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

async function selfTest() {
  const ping = await callTool('ping', {});
  if (!ping.pong) { console.error('FAIL: ping'); process.exit(1); }
  const list = await callTool('list_workshops', {});
  if (!list.workshops || list.workshops.length === 0) { console.error('FAIL: list_workshops empty'); process.exit(1); }
  const orient = await callTool('orient', {});
  if (!('current_workshop_id' in orient)) { console.error('FAIL: orient'); process.exit(1); }
  // Try reading the skill-authoring orchestrator prose
  try {
    const prose = await callTool('get_orchestrator_prose', { workshop_id: 'skill-authoring' });
    if (!prose.prose || prose.prose.length < 100) {
      console.error('FAIL: get_orchestrator_prose returned empty/short');
      process.exit(1);
    }
  } catch (e) {
    console.error('FAIL: get_orchestrator_prose threw:', e.message);
    process.exit(1);
  }
  console.log('OK');
  process.exit(0);
}

if (process.argv.includes('--self-test')) {
  await selfTest();
}

const server = new Server(
  { name: 'lwc-workshops', version: '0.1.0-spike' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await callTool(name, args ?? {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: e.message }, null, 2) }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
