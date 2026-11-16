---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

## Start

Open a todolist with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Pick the worker model from the `swarm workers` line in `~/.pstack/models.md`. If the file or that line is missing, use `claude-opus-5-5-high-fast`. Map the slug to a `delegate_task` target per the Models section of [`docs/harness/t3-code.md`](../../docs/harness/t3-code.md). For `auto` or `inherit-parent`, omit `target` so the workers run on the parent model. If a slug is rejected, use the default and say so. If the default is rejected, use the closest listed model of the same family in `orchestrator_capabilities`. For a model race, name each arm's model up front. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.
4. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Spawn all N workers in one message as `delegate_task` calls with no persona line, `mode: "async"`, `isolation: "worktree"`, and the step 3 target, left unset for `auto` or `inherit-parent`. Use `isolation: "shared"` only for a read-only worker. Each completion wakes you. Do not poll.

When a worker must start from another pushed branch, its brief says to run `git fetch origin <branch> && git checkout <branch>` first. A worktree starts from your current commit and leaves out uncommitted edits, so commit what the workers need first.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

## Phase D: Report

Return one consolidated in-chat report with a result table, issue one-liners, gaps or dropouts, and the race rule when used.
