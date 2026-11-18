---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects the models the T3 Code orchestrator offers and writes ~/.pstack/models.md, which overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.pstack/models.md`, the file that sets pstack's model per role. Slugs, families, and how a slug maps to a `delegate_task` target are in the Models section of [`docs/harness/t3-code.md`](../../docs/harness/t3-code.md). Read it first.

## Steps

### 1. Detect available models

Call `orchestrator_capabilities`. Skip every provider whose `canRunChildTask` is false or whose `constraints` say it is disabled. For each remaining model, the detected slugs are `<model>-<effort>` for each value of its effort option, plus `<model>-<effort>-fast` when the model has a `fastMode` or `serviceTier: "priority"` option. The result lists a short set per provider and says how many it left out. Call it again with `search` for a model the defaults name that the short list omits. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the file shape shown in step 5 below. If `~/.pstack/models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `how explorer` or `why investigators`, is from a retired role. Drop it. A value whose family no detected provider offers, such as a `gemini-*`, `grok-*`, or `cursor-*` slug copied from a Cursor setup, takes the role's step 5 default in a single-model role. In a panel list it becomes the list's step 5 entry at the same position, or `gpt-6.2-sol-high` when that position has none. Tell the user which values you replaced and which lines you dropped.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer a structured question (`AskUserQuestion`) over free text. Offer these four options with these exact labels, and name the current budget when the file records one. With no file, say that `large` matches the skill defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). Families are the ones the T3 doc defines, so Fable is its own family. Each role has a target effort, which is its default's effort moved by the budget. `large` keeps it, `unlimited` raises it one step, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. A target at either end of the ladder stays there. Most defaults are at `xhigh`, and each budget label names where those land. Set the effort token of every real slug in the role, panel entries included, to the role's target. The effort token is the last token, or the one before a trailing `fast`. Effort values above `max`, such as `ultrathink` or `ultra`, are never a target. If the result is not a detected slug, use the same model's detected slug with the highest effort at or below the target, else mark the role as needing a choice. `inherit-parent` and `auto` do not change. So `unlimited` turns `claude-opus-5-5-xhigh` into `claude-opus-5-5-max` and `claude-opus-5-5-high-fast` into `claude-opus-5-5-xhigh-fast`, and it keeps `claude-fable-5-2-max`. `small` turns the first two into `claude-opus-5-5-medium` and `claude-opus-5-5-low-fast`. Write a fast slug only for a model with a fast option.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped or replaced. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model) as the options. Prefer a structured question over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. A panel stays diverse only when its entries come from different families, so keep at least one non-Anthropic entry when a provider offers one. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values from a vendor other than the parent's, in list order, so order it by preference. Fable and the other Claude models are one vendor. An `inherit-parent` or `auto` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.

### 5. Write the file

Create `~/.pstack/` if needed, then write `~/.pstack/models.md` with the comment lines, a `# budget` line with the chosen label and the effort that label names, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Never put the role lines in `CLAUDE.md` or `AGENTS.md`. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# A slug is <model>-<effort>[-fast]. <model> is a model id from orchestrator_capabilities.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the delegate_task target). Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: claude-opus-5-5-xhigh
bug-fix: claude-opus-5-5-xhigh
perf-issue: claude-opus-5-5-xhigh
hill-climb: claude-opus-5-5-xhigh
judgment and prose: claude-opus-5-5-xhigh
hardest tasks: claude-fable-5-2-max
reflect tooling: claude-opus-5-5-high-fast
reflect judgment, divergent, synthesizer: claude-opus-5-5-xhigh
arena runners: claude-fable-5-2-high, claude-opus-5-5-high-fast, gpt-6.2-sol-high
arena cross-judge pool: claude-fable-5-2-high, claude-opus-5-5-high-fast, gpt-6.2-sol-high
swarm workers: claude-opus-5-5-high-fast
architect runners: claude-fable-5-2-high, claude-opus-5-5-high-fast, gpt-6.2-sol-high
interrogate reviewers: claude-fable-5-2-high, claude-opus-5-5-high-fast, gpt-6.2-sol-high
```

### 6. Confirm

Tell the user the file was written. pstack skills read it at their first spawn in each session, so it applies to every session from now on, this one included. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, run `/create-verification-skill`. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, run `/create-formal-verification-skill`. On no, move on without pushing.
