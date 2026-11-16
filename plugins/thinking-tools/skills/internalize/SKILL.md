---
name: internalize
description: Sync the user's mental model with the codebase through retrieval practice — quiz first, reveal gaps, then correct. Manual trigger only. use when the user invokes /internalize or explicitly asks to internalize code, check their understanding, or sync their mental model with the codebase. Do NOT auto-trigger after coding tasks.
---

AI-assisted coding creates a gap between what the user knows and what they *think* they know: code gets generated faster than it gets internalized, and the boundary blurs. This skill closes that gap.

Two rules matter most.

**Retrieval before re-reading.** Never open by summarizing or re-explaining the code — passive review feels like learning but isn't. Make the user pull knowledge out of their head first, then hold it against the actual code.

**Follow the flow through its layers, not only along its surface.** A user who can name every function in order can still not know what the database, the cache, or a second instance does to that flow. Each thread of questions goes down to the layer that really keeps a guarantee, and then comes back up to what the caller sees.

The evidence behind this design is in `references/research.md`; read it if you need to adapt the method, not for every session.

## Scope

Use the scope the user stated. If they didn't state one, ask a single question before anything else — for example:

- Recent changes (the latest diff / merged PR)
- A specific module or feature
- Overall architecture and its core design decisions

Wait for the answer. Do not guess.

## Layers

The skill uses four layers. "Down" means toward Runtime, and "up" means toward Purpose.

| Layer | What it holds |
|---|---|
| Purpose | The invariant that the stage must keep, and who calls the stage |
| Code | The control flow that keeps the invariant |
| State | Where the data lives: table, index, constraint, transaction boundary, lock, cache key with its TTL and invalidation, queue delivery guarantee |
| Runtime | How the code runs: instance count, process or worker model, timeout, retry, schedule |

## Session flow

### 1. Build the answer key (silently)

Read the target code thoroughly before asking anything: trace data flows, entry points, and — most importantly — design decisions and *why* they were made (check git history and comments if the code alone doesn't say). Do not show any of this yet. You are preparing an answer key, not a lecture.

Then build a vertical slice for each stage of the flow: one entry per layer that the stage touches. A stage with no cache gets no cache entry.

Take the evidence from the repository: migrations, schema files, ORM settings, raw queries, config files, IaC, and deploy manifests. When the repository does not decide a fact, mark it 확인 불가 and do not guess. Do not ask a question whose answer is 확인 불가.

Research outside the repository in two cases only:

- The user asks for it.
- A thread depends on the fact. For example, the answer changes with the default isolation level of the database engine, or with the lock behaviour of a library. Read the documentation for the version that the repository uses.

Query live systems (monitoring, a running database) only when the user asks.

### 2. Quiz loop — one question at a time

Ask exactly one question, wait for the answer, then give the verdict. Never batch questions.

Read the user's certainty from the answer itself: how firmly they state it, how precise it is, and whether they give a reason. When the answer leaves it unclear, ask one short follow-up before the verdict, such as "Why?" or one concrete case. Miscalibration (sure but wrong, or hedged but right) is the most valuable signal this skill produces. Call it out when you see it.

Each question asks about one mechanism, one transition, or one decision. It names the start and end point, or the case to predict, and the shape of the answer: a name, two or three steps, or one reason. A longer flow becomes a series of such questions.

Follow the flow from its entry point. When the scope is a flow with several stages, the first question asks for those stages. Its verdict sets a stage map, one row per stage with the actor and the result, and each later question points at one row. A question builds only on terms and steps that an earlier verdict or a one-line explanation has set up.

#### Threads

After the stage map, the questions follow a thread. A thread is one invariant, followed down through the layers and back up.

1. Choose the invariant whose break costs the most, for example "a coupon is used only once".
2. Ask which code keeps it.
3. Ask what the State and Runtime layers do when that code is under pressure: a second request, a failure midway, a stale copy.
4. Return to the Purpose layer: what does the user or the caller see in that case?

Each question starts from the previous verdict, so the series reads as one connected line. Finish a thread before you start the next one. A session of 5–8 questions holds one or two threads.

An example thread, one question per turn:

- "A coupon is used only once. Which code guarantees that?"
- "Two requests pass that check at the same time. What happens?"
- "What in the database stops the second one: a unique index, a lock, or the isolation level?"
- "When does the cache show the coupon as used? What does the user see before that?"

#### Question types

Rotate question types. The first five test the flow along its surface. The last five take a thread down a layer.

| Type | Example shape | Targets |
|---|---|---|
| Prediction | "If X is called with Y, what happens?" | Behavior |
| Causal explanation | "After A calls B, which component writes C, and when?" | Structure |
| Design rationale | "Why is this a queue and not a direct call? What breaks otherwise?" | Theory — the *why* behind the architecture |
| Teaching frame | "A new teammate asks what this module is for. Your one-paragraph answer?" | Core-value compression |
| Boundary probe | "What happens when this input is empty / duplicated / fails midway?" | Edge understanding |
| Layer link | "What query does this line become, and what does it lock?" | Code → State |
| Concurrent run | "Two requests reach this line at the same time. What stops the second?" | State, Runtime |
| State location | "Where is the source of truth for X? Which copy can be stale, and for how long?" | State |
| Partial failure | "The process dies between step 2 and step 3. What is left, and what repairs it?" Also: "This dependency is slow, down, or wrong. What happens?" | State, Runtime |
| Load | "The cache is empty and 100 requests arrive. What does the database get?" | State, Runtime |

Ask a layer question only where the answer key has evidence for that layer in this flow. The types are not a checklist: a session that asks about caching because caching is on the list is shallow again.

After each answer, verdict in three parts, briefly:

1. **정확 / 부분 / 오해** — against the actual code, quoting the specific lines that decide it (`path:line`). For a State or Runtime answer, the deciding line is often in a migration, a query, or a config file.
2. Correct only the gap — do not re-explain what the user already got right
3. If the answer sounded sure but was wrong, or hedged but right, say so ("단정했지만 실제로는…")

### 3. Calibrate by layer

Start each thread at the Code layer. Two correct answers in a row → go down one layer on the same thread. Two misses in a row → go up one layer, rebuild the picture there, and then go down again. The questions should feel effortful but answerable — that difficulty is the point, not a bug.

Default to around 5–8 questions, then ask whether to continue or wrap up. The user can stop anytime.

### 4. Gaps in general knowledge

Some gaps are not about this codebase. The user does not know what an isolation level is, or what "at-least-once delivery" means.

- By default, explain the term in one line and return to the code question.
- When the user asks for more, or does not know the meaning of the term at all, teach it through this code. Point at the line. Say what the concept does at that line. Say what would go wrong at that line without it. Then ask the earlier question again in a smaller form.

Do not turn the session into a general lecture. The concept is taught only as far as this flow needs it.

### 5. Wrap up — mental model report

End with a short report:

- **견고함** — what the user demonstrably knows (no need to elaborate)
- **교정됨** — each gap found: what they thought vs. what the code actually does
- **층별 결과** — for each thread, the layers that held and the layer where the understanding stopped, for example "쿠폰 중복 방지: 코드 층은 견고, 상태 층(유니크 인덱스)에서 끊김"
- **일반 지식** — concepts that needed an explanation, worth study outside this codebase
- **확인 불가** — facts that the repository does not decide, with the place where the user can find them
- **미탐구** — areas and layers the session didn't reach, worth a future session
- **핵심 한 줄** — the one design idea this code exists to serve; if the user's answers showed they'd lost sight of it, say so directly

## Rules

- Conduct the session in the user's language.
- Facts live in the code — look them up yourself for the answer key. The user's answers are diagnostic data, never something to argue with.
- A fact about a lower layer needs evidence too. Quote the migration, the query, the config, or the documentation. Without evidence it is 확인 불가.
- Never lecture first, never summarize as an opener, never reveal the answer inside the question.
- If the user answers "모르겠다", that is a clean gap, not a failure — record it and teach just that piece.
- This skill never modifies code.
