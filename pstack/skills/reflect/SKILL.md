---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

This conversation is a T3 thread. Its id is `parentThreadId` in the `orchestrator_capabilities` result. Pass that id to each reviewer, per Chat history in [`docs/harness/t3-code.md`](../../docs/harness/t3-code.md). Reviewers read it with `t3_thread_read` (`view: "activity"` for tool calls and file reads, `afterPosition: -1` to page from the start). Never pass another project's thread. If the thread tools are unavailable, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three `delegate_task` calls with no persona line, `role: "review"`, and `mode: "async"`. Children keep MCP access, so reviewers can look up the tickets, chat threads, and observability traces the transcript references.

Each reviewer and the synthesizer name a role line in `~/.pstack/models.md` and a default. Set `target` from that line's value, or from the default if the file or the line is missing, per the Models section of the T3 doc. Leave `target` unset when the value is `auto` or `inherit-parent`. If a slug is rejected, use the default and say so. If the default is rejected, use the closest listed model of the same family in `orchestrator_capabilities`. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.

| Lens | Role line | Default model | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `claude-opus-5-5-high-fast` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the thread id or digest where marked. Reviewers return findings as their final result.

## 3. Synthesize

One `delegate_task` call with no persona line and `role: "review"`, `target` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`). It spot-verifies citations through MCP. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Never edit a skill under a plugin cache (`~/.claude/plugins/` or `~/.codex/plugins/`). Before approval, show its destination, the project or personal skills folder from Paths in the T3 doc. After approval, copy the skill folder there and edit the copy. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to your provider's `skill-creator` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `skill-creator` and run its description-optimization loop.
- `new skill via skill-creator: <kebab-name>`: hand creation to `skill-creator`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
