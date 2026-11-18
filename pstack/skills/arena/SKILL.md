---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

# Arena

Open a todolist with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Pick the runners. Use the `arena runners` line in `~/.pstack/models.md`. If the file or that line is missing, default to one each on `claude-fable-5-2-high`, `claude-opus-5-5-high-fast`, and `gpt-6.2-sol-high`. Map each slug to a `delegate_task` target per the Models section of [`docs/harness/t3-code.md`](../../docs/harness/t3-code.md). An `auto` or `inherit-parent` entry in this line means the parent model, so omit `target` for it. If a configured entry is rejected, run that seat on its family's default and say so. Families are the ones the T3 doc defines: `claude-fable-*`, `claude-*`, and `gpt-*`, longest prefix first. A family's default is its entry in the default list above. If the family has no default, or that default is rejected, use the closest listed model of the same family in `orchestrator_capabilities`, or drop the seat and say so when there is none. If dropped seats leave fewer than two runners, add runners until there are two, or one when the line has one entry. Run each added runner on a remaining runner's model, or omit `target` so it runs on the parent model when none remain, and say so. Spawn more runners when the arena covers multiple design directions. Use the same model N times when the work is generation-bound rather than judgment-sensitive. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.
4. Give each candidate its own output location (`isolation: "worktree"` where the artifact lives in the repo, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Spawn all N subagents in one message as `delegate_task` calls with `mode: "async"`, each with the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, choose one model from the `arena cross-judge pool` line in `~/.pstack/models.md`. If the file or that line is missing, choose from `claude-fable-5-2-high`, `claude-opus-5-5-high-fast`, and `gpt-6.2-sol-high`. Spawn one read-only judge subagent (`role: "review"`, a brief that says not to edit files). The judge is never from the parent's vendor. Vendors are the ones the T3 doc defines, so `claude-fable-*` and `claude-*` are one vendor. Try only the entries from another vendor, in pool order. An `auto` or `inherit-parent` entry is the parent model, so it never judges. With the default pool, a Claude parent gets `gpt-6.2-sol-high`. A parent from any other vendor gets `claude-fable-5-2-high` first, then `claude-opus-5-5-high-fast`. If an entry is rejected, use a listed slug of the same model at the closest level or speed, or move to the next entry when there is none. If no entry from another vendor runs, try the default pool's entries from another vendor the same way. If none of those runs, skip the judge, pick the base alone in Phase D, and say so. Your own model is `inheritedModel` in the `orchestrator_capabilities` result. If it is missing, try the pool's real slugs in pool order and say that the vendor check did not run. The judge sees the rubric and the candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with your reading in Phase D. Don't spawn it while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when Phase C ran one. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict or that Phase C skipped the judge, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
