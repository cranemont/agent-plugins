# agent-plugins

Personal collection of portable [Agent Skills](https://agentskills.io). Every skill is a spec-pure `SKILL.md` (frontmatter: `name` + `description` only), so the same files load natively in Claude Code, Codex, and any client that follows the open standards — no per-tool forks, no install scripts.

The skills ship as small plugins, one per function. Install only the plugins you need ([ADR-0003](docs/adr/0003-split-into-function-plugins.md)).

## Plugins

<!-- BEGIN:catalog (auto-generated from plugins/*/skills/*/SKILL.md — edit descriptions there, then run scripts/gen-readme.sh) -->
| Plugin | Skill | Description |
|---|---|---|
| [adr](plugins/adr) | [adr](plugins/adr/skills/adr/SKILL.md) | Architecture Decision Record(ADR) 워크플로우 — 되돌리기 비싼 결정을 불변 파일로 기록하고(docs/adr/NNNN-slug.md, status 없이 superseded_by로 상태 파생), 자동 인덱스·supersede·작업 전 참조까지 하나의 캐논으로 관리한다. |
| [appscript](plugins/appscript) | [appscript](plugins/appscript/skills/appscript/SKILL.md) | Google Apps Script(GAS, V8 런타임) 한국어 레퍼런스 — Sheets/Gmail/Drive/Calendar/Docs/Slides/Forms 자동화, 트리거, 웹앱(doGet/doPost), OAuth scope, quota, clasp/TypeScript, 매니페스트(appsscript.json), 6분 제한 회피 등 50여 개 문서를 라우팅 표로 필요한 부분만 읽어 답한다. |
| [git-tools](plugins/git-tools) | [commit-semantic](plugins/git-tools/skills/commit-semantic/SKILL.md) | Analyze uncommitted changes and create semantic commits — group changes into meaningful units (feat/fix/refactor/docs/test/chore) and commit them in dependency order. |
| [thinking-tools](plugins/thinking-tools) | [grilling](plugins/thinking-tools/skills/grilling/SKILL.md) | Grill the user relentlessly about a plan, decision, or idea. |
| [thinking-tools](plugins/thinking-tools) | [internalize](plugins/thinking-tools/skills/internalize/SKILL.md) | Sync the user's mental model with the codebase through retrieval practice — quiz first, reveal gaps, then correct. |
| [writing](plugins/writing) | [plain-korean](plugins/writing/skills/plain-korean/SKILL.md) | 기능 구현이나 문서 작업 중 사용자에게 보이는 한국어 제품 문구 또는 저장소에 남는 한국어 기술 산문을 작성·번역·수정할 때 자연스럽고 간결하게 다듬는다. |
| [writing](plugins/writing) | [prose-check](plugins/writing/skills/prose-check/SKILL.md) | Review human-readable prose against ASD-STE100 (Simplified Technical English) and report findings with rule tags and concrete rewrites. |
<!-- END:catalog -->

## Install

Each tool's native mechanism, nothing else. Add the marketplace once, then install each plugin you want as `<plugin>@agent-plugins`. The examples install `adr`.

**Claude Code**

```
/plugin marketplace add cranemont/agent-plugins
/plugin install adr@agent-plugins
```

**Codex CLI**

```
codex plugin marketplace add cranemont/agent-plugins
codex plugin add adr@agent-plugins
```

**GitHub Copilot CLI**

```
copilot plugin marketplace add cranemont/agent-plugins
copilot plugin install adr@agent-plugins
```

**Anything else that speaks the Agent Skills standard** (Gemini CLI, Cursor, opencode, Amp, Goose, Crush, …): copy or symlink a skill directory into `~/.agents/skills/`:

```
cp -r plugins/thinking-tools/skills/grilling ~/.agents/skills/
```

**Upgrading from 0.2.x.** Versions up to 0.2.2 shipped every skill in one plugin, `agent-plugins@agent-plugins`. That plugin no longer exists. Uninstall it, then install the plugins you need.

## Layout

```
.claude-plugin/marketplace.json            # lists every plugin, source ./plugins/<plugin>
plugins/<plugin>/
  plugin.json                              # Agent Plugins v1 manifest (agent-plugins.org)
  .claude-plugin/plugin.json               # plugin manifest (Claude Code format, also read by Codex/Copilot/Cursor)
  skills/<skill>/SKILL.md                  # agentskills.io spec
.claude/skills/                            # repo-local skills (not published with any plugin)
docs/adr/                                  # design decisions for this repo
scripts/                                   # repo maintenance (see below)
.githooks/pre-push                         # runs scripts/check.sh before every push
```

## Origins

- **grilling** — adapted from [Matt Pocock's grilling skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) ([mattpocock/skills](https://github.com/mattpocock/skills), MIT). This copy is maintained independently and is expected to diverge.
- **internalize** — methodology grounded in the learning-science research cited in [references/research.md](plugins/thinking-tools/skills/internalize/references/research.md).
- **appscript** — every reference doc cites its official Google documentation sources inline (`> 출처` blocks); maintained with the toolchain in `scripts/appscript-docs/`.
- **plain-korean** — the rules and their evidence are kept apart. [references/research.md](plugins/writing/skills/plain-korean/references/research.md) records which style guide was followed where two disagree, and which popular "AI writing tells" were measured and deliberately not turned into rules.
- **prose-check** — Korean rules adapt ASD-STE100 Issue 9 at about 80%, and English text follows STE as written. [references/research.md](plugins/writing/skills/prose-check/references/research.md) gives the source of each rule. The checker's tests and word-list measurements are in `scripts/prose-check/`. The repo-local skill `.claude/skills/prose-check-eval` measures the whole review, script and model, on the same edited sentence pairs.

## Maintenance

```
scripts/check.sh           # all checks: spec-purity lint, README sync, marketplace and version lockstep, manifest validation
scripts/lint-skills.sh     # fail if any SKILL.md strays from the Agent Skills spec, or two plugins share a skill name
scripts/gen-readme.sh      # regenerate the plugin table above from SKILL.md frontmatter (--check to verify)
scripts/bump-version.sh    # bump one plugin's version in its three manifests: <plugin> [patch|minor|major]
scripts/fetch-docs.sh      # fetch the Claude Code docs mirror (.claude/docs/, gitignored) for the local claude-code-guide skill
scripts/install-hooks.sh   # once per clone: enable the pre-push gate
```

## License

[MIT](LICENSE)
