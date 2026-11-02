---
name: internalize
description: Sync the user's mental model with the codebase through retrieval practice — quiz first, reveal gaps, then correct. Manual trigger only. use when the user invokes /internalize or explicitly asks to internalize code, check their understanding, or sync their mental model with the codebase. Do NOT auto-trigger after coding tasks.
---

AI-assisted coding creates a gap between what the user knows and what they *think* they know: code gets generated faster than it gets internalized, and the boundary blurs. This skill closes that gap.

The one rule that matters: **retrieval before re-reading**. Never open by summarizing or re-explaining the code — passive review feels like learning but isn't. Make the user pull knowledge out of their head first, then hold it against the actual code. The evidence behind this design is in `references/research.md`; read it if you need to adapt the method, not for every session.

## Scope

Use the scope the user stated. If they didn't state one, ask a single question before anything else — for example:

- Recent changes (the latest diff / merged PR)
- A specific module or feature
- Overall architecture and its core design decisions

Wait for the answer. Do not guess.

## Session flow

### 1. Build the answer key (silently)

Read the target code thoroughly before asking anything: trace data flows, entry points, and — most importantly — design decisions and *why* they were made (check git history and comments if the code alone doesn't say). Do not show any of this yet. You are preparing an answer key, not a lecture.

### 2. Quiz loop — one question at a time

Ask exactly one question, wait for the answer, then give the verdict. Never batch questions.

Read the user's certainty from the answer itself: how firmly they state it, how precise it is, and whether they give a reason. When the answer leaves it unclear, ask one short follow-up before the verdict, such as "Why?" or one concrete case. Miscalibration (sure but wrong, or hedged but right) is the most valuable signal this skill produces. Call it out when you see it.

Each question asks about one mechanism, one transition, or one decision. It names the start and end point, or the case to predict, and the shape of the answer: a name, two or three steps, or one reason. A longer flow becomes a series of such questions.

Follow the flow from its entry point. When the scope is a flow with several stages, the first question asks for those stages. Its verdict sets a stage map, one row per stage with the actor and the result, and each later question points at one row. A question builds only on terms and steps that an earlier verdict or a one-line explanation has set up.

Rotate question types; each targets a different layer of the mental model:

| Type | Example shape | Targets |
|---|---|---|
| Prediction | "If X is called with Y, what happens?" | Behavior |
| Causal explanation | "After A calls B, which component writes C, and when?" | Structure |
| Design rationale | "Why is this a queue and not a direct call? What breaks otherwise?" | Theory — the *why* behind the architecture |
| Teaching frame | "A new teammate asks what this module is for. Your one-paragraph answer?" | Core-value compression |
| Boundary probe | "What happens when this input is empty / duplicated / fails midway?" | Edge understanding |

After each answer, verdict in three parts, briefly:

1. **정확 / 부분 / 오해** — against the actual code, quoting the specific lines that decide it (`path:line`)
2. Correct only the gap — do not re-explain what the user already got right
3. If the answer sounded sure but was wrong, or hedged but right, say so ("단정했지만 실제로는…")

### 3. Calibrate difficulty

Start at moderate depth. Two easy-correct answers in a row → go deeper (rationale, edge cases, failure modes). Two misses in a row → zoom out to structure before drilling back down. The questions should feel effortful but answerable — that difficulty is the point, not a bug.

Default to around 5–8 questions, then ask whether to continue or wrap up. The user can stop anytime.

### 4. Wrap up — mental model report

End with a short report:

- **견고함** — what the user demonstrably knows (no need to elaborate)
- **교정됨** — each gap found: what they thought vs. what the code actually does
- **미탐구** — areas the session didn't reach, worth a future session
- **핵심 한 줄** — the one design idea this code exists to serve; if the user's answers showed they'd lost sight of it, say so directly

## Rules

- Conduct the session in the user's language.
- Facts live in the code — look them up yourself for the answer key. The user's answers are diagnostic data, never something to argue with.
- Never lecture first, never summarize as an opener, never reveal the answer inside the question.
- If the user answers "모르겠다", that is a clean gap, not a failure — record it and teach just that piece.
- This skill never modifies code.
