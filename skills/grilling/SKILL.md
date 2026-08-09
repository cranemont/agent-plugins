---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea until nothing is left silently assumed. Use when the user wants to stress-test their thinking or a design before acting on it — e.g. "grill me", "grill this plan", "stress-test this", "poke holes in this", "challenge my assumptions", or any 'grill' trigger phrase — or when they ask to be interviewed about a decision before implementation.
metadata:
  source: https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), look it up yourself with whatever tools you have — in the background if your environment supports that — never ask the user for anything you could find on your own. Don't block on it: a running lookup is an unsettled prerequisite, so only the questions downstream of it wait for the answer — ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
