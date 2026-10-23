---
name: prose-check
description: Review human-readable prose against ASD-STE100 (Simplified Technical English) and report findings with rule tags and concrete rewrites. Korean text uses an 80% adaptation. Each Korean rule traces to an STE Issue 9 rule number or is marked Korean-only. Korean text is also checked for plain written Korean (쉬운 글말): one speech level, no spoken contractions, no empty discourse frames, no whole-sentence bold. These rules remove the AI-like tone. English text uses STE as written. Use while writing text for people (docs, README, guides, PR bodies, commit messages, explanations, diagram labels, UI copy): read "When writing" first, then review before publishing. Also use when the user asks to review, check, or proofread writing, says "STE 검토", "문장 검사", "글 검토해줘", objects to wording ("직역투다", "○○가 뭐야", "이 용어도 없애"), or when another skill or a CLAUDE.md rule asks for a prose review. Do not trigger on casual chat.
---

Review prose so a reader who does not know the code can read it fast and in one meaning. The STE rule table is `references/rules.md`.

The machine check only finds candidates. It never passes or fails a text. You decide each finding by reading, and every finding cites a rule tag from `references/rules.md`.

## When writing

Follow these rules while you write text for people: guides, explanations, diagrams, narratives, and PR bodies. Then review the result with Steps 1–3 before you publish it. The full table is in `references/rules.md` §2. A project's own writing rules come first.

| Rule | In Korean text |
|---|---|
| One word, one meaning (1.1, 1.11) | Name one object or one action with one word in the whole text. Use the names that the screen and the code use |
| Noun clusters (2.1) | Put at most three nouns in a row. Break a longer cluster with particles or a verb |
| Active voice (3.6, 3.7) | The actor is the subject. Do not turn an action into a noun with `수행하다` or `이루어지다` |
| One topic per sentence (4.1, 4.2) | The guide is 15 어절 for descriptions and 12 for procedures. Do not drop particles or subjects to make a sentence shorter |
| Paragraphs (K4, 6.5, 6.6) | The point comes first. One topic, at most six sentences |
| Lists (4.3) | Use a list or a table for three or more items or two or more conditions |
| Plain written Korean (K9–K12) | One speech level. No contractions or spoken endings, no empty discourse frames, no whole-sentence bold, and no em dashes between clauses |
| Diagrams (K5) | One question per diagram. Show the overview first and the details after it. An arrow label names what the actor does, not `연결` or `관계` |

English text follows STE as written: 25 words for descriptions, 20 for procedures, active voice, and simple tenses.

## Inputs

- **Files**: review each path given, whole file.
- **Changed lines only**: review only what a change added or modified.
  - `--diff`: uncommitted changes (`git diff HEAD`) and new untracked files.
  - `--staged`: staged changes (`git diff --cached`).
  - `--base=<ref>`: changes on this branch since it left `<ref>` (`git diff <ref>...HEAD`).
- **`--pr <number>`**: review the title and body from `gh pr view <number> --json title,body`. To review the PR's file changes too, check out its branch and use `--base=<its base branch>`.
- **Pasted text** or "the text above": write it to a file in the scratchpad and review that file, so line numbers work.
- **Text extracted from a structured document** (report fields, JSON values): keep the structure. Write prose as paragraphs, steps as list items, and labels as table rows. The speech-level rule (K9) counts paragraphs, lists, and tables separately. A file that turns every field into a paragraph reports each list item as a speech-level mix.
- **Nothing given**: use `--base=<default branch>` and say which base you chose.

In the changed-lines modes, the script reads each whole file for sentence context but reports only candidates on added or modified lines. It looks at Markdown, text, HTML, SVG, and JSON files. Code files are left out because comments are compressed on purpose (Step 0). Add `--code` to include JS and TS files.

Options:

- `--procedure`: the text is a procedure. Use 12 어절 / 20 words instead of 15 / 25.
- `--all`: show every S2 candidate, not only rules that occur three or more times in a file.
- `--strict`: English only. Also apply the STE dictionary rules (1.1–1.4, 9.2). This skill does not bundle the dictionary, so say that word-level compliance needs the official dictionary or a deterministic checker such as OneRead.
- `--fix`: apply the findings after reporting them. See "Fixing".

## Step 0 — Classify

For each text, decide three things before reading for problems:

1. **Language.** Korean, English, or mixed. In mixed text, apply the Korean column to Korean sentences and STE as written to English sentences.
2. **Type.** Procedure, warning, description, or label (table cell, heading, diagram text, UI string). Strictness by type is in `references/rules.md` §5.
3. **Target.** Review text that people who do not know the code will read. Code comments, ADRs, and design notes are compressed on purpose. Review them only when the user asks or the project's rules say so (`references/korean-patterns.md` §4).

A project's own writing rules take precedence over this skill. Look for them in `CLAUDE.md`, `AGENTS.md`, or a style guide before you start.

## Step 1 — Machine candidates

Run the script from the repository you review. `<skill-dir>` is the directory that holds this SKILL.md.

```bash
node <skill-dir>/scripts/check.mjs [--procedure] <file...>        # whole files
node <skill-dir>/scripts/check.mjs --base=main [--procedure] [path...]   # changed lines only
```

Exit code 0 means no candidates, 1 means candidates, and 2 means a file or git error.

The script reads raw text, including SVG `<text>`, table headers, and `title`/`alt` attributes.

Each candidate carries a group letter and, where one exists, the STE rule number or Korean-only rule:

| Group | Checks |
|---|---|
| A–E | Invented metaphors (K3), code-comment idiom (1.10), calques (K2, K6), vague verbs (3.7), sentence rules |
| F | Speech level (K9): body sentences that differ from the document's main level. Markdown, text, and HTML files |
| G | Spoken forms (K10): contractions, spoken endings, discourse markers, spoken adverbs |
| H | Discourse frames (K11): empty contrasts, colon lead-ins, self-answered questions, summary signposts, chat phrases |
| I | Formatting (K12): whole-sentence bold, em dashes in prose |

Each candidate also has a severity. S1 candidates are always listed. S2 candidates are common in human writing too. The script lists them only when the same rule occurs three or more times in a file. Below that, it prints one summary line. `rules.md` §3 explains the severities.

The script also reports two kinds of whole-file candidates. One is two words for the same action, such as `재다` and `측정` (1.11). The other is one light verb used in several sentence patterns, such as `보다` (1.3).

If a quarter or more of the body sentences use another speech level, the script prints one `주의` line for the file. The usual cause is a flattened extract: lists or tables written as paragraphs. Fix the extract first, then read the K9 candidates again.

Korean morphology comes from Kiwi (kiwipiepy, model `cong-global`), for Markdown, text, and HTML files. With Kiwi, the script finds contractions such as `~는 건`, spoken adverbs, and interjections by part of speech. It also classifies sentence endings that the surface form cannot, such as noun-form endings (`높아짐`). Without Kiwi, the script uses regex only and misses some of these. If the Kiwi helper fails or runs longer than 5 minutes (`PROSE_CHECK_KIWI_TIMEOUT_MS`), the script says so and continues with regex only.

If the output starts with `[형태소 분석기 없음]`, ask the user once whether to install Kiwi. The setup installs kiwipiepy into `~/.cache/prose-check` (about 140 MB).

- If the user agrees, run the setup and then run the check again.
- If the user declines, run `--skip-setup`. Later runs use regex and do not show the prompt again.
- If you cannot ask, for example when another skill runs this review on its own, continue with regex and say so in the report.

```bash
node <skill-dir>/scripts/check.mjs --setup        # install Kiwi
node <skill-dir>/scripts/check.mjs --skip-setup   # do not install, do not ask again
```

The script skips text that a reader does not see: `<script>`, `<style>`, HTML comments, `<pre>`, fenced code blocks, and code spans (backticks or `<code>`). A code span counts as one 어절 and never gives a word candidate. Block tags such as `</p>`, `</li>`, `</td>`, and `<br>` end a sentence, so text from neighbouring elements does not join into one long sentence. A noun chain that repeats in a table is reported once, with a count. Text in quotes, quote lines (`>`), and HTML `<blockquote>` or `<q>` gives no word candidate either, because it is someone else's words or a mention of a pattern. For the speech level, each HTML block element is one paragraph. Headings, table cells, captions, buttons, and fragments without end punctuation (card titles, link text) are labels and do not count.

Zero candidates is not a pass. The word lists record past mistakes, and the next mistake uses a word that is not on the list. Always do Step 2.

### Allow list

A project can declare phrases that state a fact in its own domain, such as `메시지가 남아 있` for an SQS queue that still holds messages. Put them in `.prose-check-allow` at the repository root, one phrase per line. Text after `#` is a comment. The script does not report a word candidate that lies inside such a phrase, and it prints how many candidates it left out.

- A phrase must have two or more 어절. A single word such as `남아` is ignored with a warning, so the list cannot hide a word everywhere.
- The script matches the phrase against the raw file text. Write it as it appears in the file.
- Add a phrase only after it passed the two conditions in `references/korean-patterns.md` §6. The list records a judgment. It is not a rule, and Step 2 still reads those sentences.
- The script looks for the file from the reviewed file's directory up to the repository root (the first directory with `.git`).
- A reviewed file outside any repository, such as text extracted to a temporary folder, uses the list of the current directory's repository. A file inside another repository does not borrow it.

The tests for this script are in the source repository, not in the installed skill. See "Maintaining the lists".

## Step 2 — Read against the rules

Read sentence by sentence with `references/rules.md` open. For Korean, also use `references/korean-patterns.md`.

In the changed-lines modes, report findings on changed lines. Read the lines around them for context. Report an unchanged line only when the change breaks it. For example, a changed line renames a term that an unchanged line still uses (1.11).

1. **Sentences.** One topic per sentence (4.1). A sentence over the length guide is a reason to look, not a verdict. Split it only when it has two or more topics. Do not drop particles or subjects to make it shorter (4.2).
2. **Words.** For each doubtful noun or verb, ask the four questions: source, screen, reverse question, substitution (K1). Check for invented metaphors (K3), English calques (K2, K6), and vague verbs (3.7).
3. **Core verbs.** List the verbs the text uses for its main actions. In a guide to a test, these are measuring, scoring, judging, and showing. Each verb has one meaning (1.3), and each action has one verb (1.11). Light verbs such as `보다` often carry several meanings in one text (`references/korean-patterns.md` §5). Three verbs have a fixed rule there: `쓰다` is not used at all (`사용한다` or `작성한다`), `두다` only means keep (`그대로 둔다`), and `잡다` only means catch (`예외를 잡는다`). `적다` in the write sense is not used either (`기록한다`). A word that is literally true still fails when the text names the same action with another word.
4. **Plain written Korean (쉬운 글말).** Check the speech level (K9), spoken forms (K10), discourse frames (K11), and formatting (K12). The target is written grammar with everyday words. Do not "fix" a spoken form with officialese: `이건` becomes `이 값은`, not `본 건은`. A contrast that corrects a real reader assumption stays (K11). Procedures in `references/korean-patterns.md` §5.
5. **Paragraphs.** The point comes first (K4). One topic, at most six sentences (6.5, 6.6). Keep connectors when you split sentences (6.2).
6. **Structure.** Use a list or table for three or more items or two or more conditions (4.3). Put conditions before the instruction (5.4). Put warnings before the step, command first, risk after (7.1–7.3). Notes carry no instructions (5.5).
7. **Labels and diagrams.** Box names use the same words as the body. Arrow labels say what the actor does, not `연결` or `관계`. The overview diagram comes before the detailed ones (K5). Headings, table headers, and labels are noun phrases, not plain-style Korean questions such as `무엇을 보나` or `왜 ~인가`, and not verb forms such as `고쳐서` or `나오면` (9.4).

## Step 3 — Sweep and family search

When you decide a word must change, search the whole file for it, including SVG text, table headers, attributes, legends, and captions. Then find other words that came from the same source, such as the same code comment or ADR. They usually carry the same problem. Also search for other words that name the same action, because the text may already use two (`references/korean-patterns.md` §8).

## Report

Default output is a review, not an edit. List findings in file order:

```
docs/guide.md:42  [STE 6.5 원문]  한 문단에 저장 흐름과 재시도 정책을 함께 썼다.
  → 재시도 정책을 새 문단으로 나눈다.
docs/guide.md:57  [K2 한국어 고유]  "결과가 캐시에 남는다"는 물건이 놓이는 것처럼 썼다.
  → "결과를 캐시에 저장한다."
```

Each finding has four parts: location, rule tag, the problem in one sentence, and a concrete rewrite. Then:

- Report S2 candidates that the script summarized on one line only when reading shows they hurt this text.
- One line on machine candidates you judged false positives, with the reason. A word is a false positive only when no more precise word fits and the text does not name the same action with another word.
- A count of findings by tag.
- The items from `references/rules.md` §8 (pass criteria) that the text still misses.

## Fixing

Edit only when the user asked for fixes, passed `--fix`, or the invoking skill says to apply them.

- Rewrite whole sentences, particles included (STE 9.1). Never bulk-replace a word (K7).
- In code files, edit inside comments only. String literals are screen text and tests depend on them. After the edit, compare the generated output before and after. It must be the same byte for byte, apart from timestamps.
- After editing, check the diff for broken particles, doubled words, and edits inside longer words (`references/korean-patterns.md` §7). Then run Step 1 again.

## Maintaining the lists

The word lists record past mistakes, and models change their habits between versions. Re-measure them instead of only adding words by hand. `references/korean-patterns.md` §10 has the procedure.

The maintenance tools and their data are not part of the installed skill, so an install does not copy them. They are in the source repository (`cranemont/agent-plugins`), in `scripts/prose-check/`. Run them from the repository root.

- `excess.mjs`: compares AI output (Claude Code transcripts by default, or given files) with the morpheme frequencies of human Korean technical writing published before 2022-11-30. It lists morphemes with a high frequency ratio and G². Transcript text is shown only on screen and never saved.
- `baseline.mjs`: rebuilds the frequency tables, counts only. The core table `baseline.tsv` is committed and holds what the default run reads. The full table, with nouns and morpheme pairs, goes to the data folder.
- `check.mjs --tsv=<file>` and `precision.mjs`: label candidates `y`/`n`, then measure precision per rule. Demote or remove a rule with more than 10% false positives.
- `test.mjs` and `check.test.mjs`: rule fixtures in both Kiwi and regex modes, and script behaviour. Run them after every rule change.
- `pairs.mjs`: the verification loop. It runs the check on sentence pairs that the National Institute of Korean Language edited (`pairs/style.tsv`). It reports how many original sentences get a candidate for the expected rule, and which candidates remain on the edited sentences. Then it compares the result with the saved reference (`pairs/results.json`). It fails when a rule change misses a pair that it found before, or adds a candidate to an edited sentence. `--human` also measures candidates per 1,000 어절 in the human baseline. Run it with `test.mjs` after every rule change. Save a new reference with `--save` when the result improves and the precision of the new candidates is checked.
- `vocab.mjs`: measures whether the institute's basic vocabulary grades separate hard words (STE 1.9). The result is in `references/research.md` §9. It is not a rule.
- `calibrate.mjs`: re-measures the 12 / 15 어절 guide (`references/calibration.md`).

## Rules

- The project's own writing rules win over this skill.
- Every finding cites a tag from `references/rules.md`. Do not invent rules.
- A long sentence with one topic stays as it is.
- Respond in the user's language.

## References

- `references/rules.md`: the 53 STE rules, each with its Korean application and tag. It also holds the Korean-only rules K1–K12, the definition of plain written Korean, and severities. It also holds the length guides, strictness by text type, rejected alternatives, examples, and pass criteria.
- `references/korean-patterns.md`: the four questions, three causes, calque and vague-verb tables, false positives, how to fix without breaking particles.
- `references/calibration.md`: the measurement behind 12 / 15 어절 (ratio 0.62 on 43 official STE examples), its limits, and how to redo it in the source repository.
- `references/research.md`: where each rule came from, STE sources, effect studies, critiques, LLM and STE. §8 holds the evidence for K9–K12. §9 compares this skill with existing Korean checkers and research, and records the detection rate on edited sentence pairs.
