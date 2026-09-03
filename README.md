# agent-plugins

Personal collection of portable [Agent Skills](https://agentskills.io). Every skill is a spec-pure `SKILL.md` (frontmatter: `name` + `description` only), so the same files load natively in Claude Code, Codex, and any client that follows the open standards — no per-tool forks, no install scripts.

## Skills

<!-- BEGIN:catalog (auto-generated from skills/*/SKILL.md — edit descriptions there, then run scripts/gen-readme.sh) -->
| Skill | Description |
|---|---|
| [adr](skills/adr/SKILL.md) | Architecture Decision Record(ADR) 워크플로우 — 되돌리기 비싼 결정을 불변 파일로 기록하고(docs/adr/NNNN-slug.md, status 없이 superseded_by로 상태 파생), 자동 인덱스·supersede·작업 전 참조까지 하나의 캐논으로 관리한다. |
| [appscript](skills/appscript/SKILL.md) | Google Apps Script(GAS, V8 런타임) 한국어 레퍼런스 — Sheets/Gmail/Drive/Calendar/Docs/Slides/Forms 자동화, 트리거, 웹앱(doGet/doPost), OAuth scope, quota, clasp/TypeScript, 매니페스트(appsscript.json), 6분 제한 회피 등 50여 개 문서를 라우팅 표로 필요한 부분만 읽어 답한다. |
| [commit-semantic](skills/commit-semantic/SKILL.md) | Analyze uncommitted changes and create semantic commits — group changes into meaningful units (feat/fix/refactor/docs/test/chore) and commit them in dependency order. |
| [grilling](skills/grilling/SKILL.md) | Grill the user relentlessly about a plan, decision, or idea. |
| [internalize](skills/internalize/SKILL.md) | Sync the user's mental model with the codebase through retrieval practice — quiz first, reveal gaps, then correct. |
| [plain-korean](skills/plain-korean/SKILL.md) | 기능 구현이나 문서 작업 중 사용자에게 보이는 한국어 제품 문구 또는 저장소에 남는 한국어 기술 산문을 작성·번역·수정할 때 자연스럽고 간결하게 다듬는다. |
<!-- END:catalog -->

## Install

Each tool's native mechanism, nothing else:

**Claude Code**

```
/plugin marketplace add cranemont/agent-plugins
/plugin install agent-plugins@agent-plugins
```

**Codex CLI**

```
codex plugin marketplace add cranemont/agent-plugins
codex plugin add agent-plugins@agent-plugins
```

**GitHub Copilot CLI**

```
copilot plugin marketplace add cranemont/agent-plugins
copilot plugin install agent-plugins@agent-plugins
```

**Anything else that speaks the Agent Skills standard** (Gemini CLI, Cursor, opencode, Amp, Goose, Crush, …): copy or symlink a skill directory into `~/.agents/skills/`:

```
cp -r skills/grilling ~/.agents/skills/
```

## Layout

```
plugin.json                  # Agent Plugins v1 manifest (agent-plugins.org)
.claude-plugin/plugin.json   # plugin manifest (Claude Code format, also read by Codex/Copilot/Cursor)
.claude-plugin/marketplace.json
skills/<name>/SKILL.md       # one shared skills tree, agentskills.io spec
.claude/skills/              # repo-local skills (not published with the plugin)
scripts/                     # repo maintenance (see below)
.githooks/pre-push           # runs scripts/check.sh before every push
```

## Origins

- **grilling** — adapted from [Matt Pocock's grilling skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) ([mattpocock/skills](https://github.com/mattpocock/skills), MIT). This copy is maintained independently and is expected to diverge.
- **internalize** — methodology grounded in the learning-science research cited in [skills/internalize/references/research.md](skills/internalize/references/research.md).
- **appscript** — every reference doc cites its official Google documentation sources inline (`> 출처` blocks); maintained with the toolchain in `scripts/appscript-docs/`.
- **plain-korean** — the rules and their evidence are kept apart. [skills/plain-korean/references/research.md](skills/plain-korean/references/research.md) records which style guide was followed where two disagree, and which popular "AI writing tells" were measured and deliberately not turned into rules.

## Maintenance

```
scripts/check.sh           # all checks: spec-purity lint, README sync, version lockstep, manifest validation
scripts/lint-skills.sh     # fail if any SKILL.md strays from the Agent Skills spec
scripts/gen-readme.sh      # regenerate the skills table above from SKILL.md frontmatter (--check to verify)
scripts/bump-version.sh    # bump the version across all three manifests (patch|minor|major)
scripts/fetch-docs.sh      # fetch the Claude Code docs mirror (.claude/docs/, gitignored) for the local claude-code-guide skill
scripts/install-hooks.sh   # once per clone: enable the pre-push gate
```

## License

[MIT](LICENSE)
