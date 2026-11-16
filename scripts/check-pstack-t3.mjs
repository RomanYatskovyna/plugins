#!/usr/bin/env node

// Fails when a pstack skill or agent uses a Cursor tool, field, or path that T3 Code does not have.
// Upstream merges bring these names back, so run this after each merge. docs/harness/t3-code.md holds the T3 forms.
// automations/benny still runs on Cursor Automations, so it is not checked.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PSTACK = join(ROOT, "pstack");
const SCOPES = ["skills", "agents"];

const BANNED = [
  { re: /subagent_type/, use: "a persona line in the delegate_task brief" },
  { re: /`Task`|\bTask (tool|call|subagent)/, use: "delegate_task" },
  { re: /AskQuestion/, use: "AskUserQuestion" },
  { re: /run_in_background/, use: 'mode: "async"' },
  { re: /readonly: (true|false)/, use: 'role: "research" and a no-edit brief' },
  { re: /environment: "(cloud|local)"|cloud_base_branch/, use: 'isolation: "worktree"' },
  { re: /file_attachments/, use: "absolute paths in the brief" },
  { re: /generalPurpose/, use: "a brief with no persona line" },
  { re: /pstack-models\.mdc|\.cursor\/(rules|skills|projects|plugins)/, use: "the paths in docs/harness/t3-code.md" },
  { re: /agent-transcripts/, use: "t3_thread_read" },
  { re: /\bgemini-\d/, use: "a model that orchestrator_capabilities lists" },
  { re: /\bSendToUser\b|\bupdate_state\b/, use: "request_secret or schedule_task" },
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const problems = [];
for (const path of SCOPES.flatMap((scope) => walk(join(PSTACK, scope))).filter((path) => path.endsWith(".md"))) {
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      for (const { re, use } of BANNED) {
        const match = line.match(re);
        if (match) problems.push(`pstack/${relative(PSTACK, path).replaceAll("\\", "/")}:${index + 1} uses ${match[0]}. Use ${use}.`);
      }
    });
}
for (const problem of problems) console.log(`FAIL ${problem}`);
console.log(`${problems.length} Cursor-only names in pstack skills and agents`);
if (problems.length > 0) process.exit(1);
