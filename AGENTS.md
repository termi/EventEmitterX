---
iso date: "2026-10-09T12:05:52.513Z"
timestamp: 1791547552513
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "config/ai"
---

# AGENTS — Project Instructions

## Always Applicable

- Commit only when the user explicitly requests it. Editing files is not permission
  to commit. When a commit is requested, follow the commit rules without asking
  for confirmation.
- Stage only relevant changes; never include unrelated work, logs, or temporary files.
- Write commit messages in English using Conventional Commits with a required scope.
  Use `ref`, not `refactor`. AI-authored commits require a model tag and trailers;
  human-authored changes use the human-authorship exception in the commit rules.
- AI-instruction-only commits use `docs(config/ai)` and `Area: config/ai`.
- Use `git --no-pager` for commands with paginated output, including `log`, `diff`,
  `show`, `blame`, and `shortlog`.
- When generating dates or timestamps, try Node.js first, then Python on failure,
  then the current shell. Follow the date/time rules for formats and exceptions.

## EventSignal Naming

- When creating or modifying EventSignal code or tests, suffix identifiers that
  hold signal instances with `$` (for example, `signal$`, `mapped$`, `computed$`).
- Suffix functions that return signal instances with `$$`.
- This naming rule applies whether or not the optional `eventsignal` skill is
  loaded. Before finishing, check all new and modified signal identifiers.

## Documentation and Changelogs

| Kind                                                           | Language and file policy                                                                                          |
|----------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| Ordinary project documentation                                 | English original plus a separate `_RU.md` file with equivalent structure and detail                               |
| Markdown anywhere under `changelogs/`                          | One bilingual file: English sections first, then mirrored Russian sections after `---`; never a separate `_RU.md` |
| AI instructions and skills, including this file and `.agents/` | No `_RU.md` counterpart                                                                                           |

- AI-generated Markdown requires the properties block defined in the documentation
  rules; changelog-specific structure and commit rules take precedence.
- Create one changelog per change set after AI code changes. Reason documents are
  separate: one bilingual file per problem. Read the changelog rules for other triggers.
- For non-obvious or complex changes, create or update a reason document in
  `changelogs/reasons/` before finishing. Explain the problem, chosen mechanism,
  alternatives and tradeoffs, concrete examples, verification and limitations.
  Use one bilingual file per problem and link it from the related changelog's
  Meta and Reasons sections. This requirement applies regardless of skill use.
- Include related changelog files in the related change-set commit. Never mention
  those files in the commit message or let them determine its type or scope.
- In technical reviews, every issue needs severity, repository-relative file path,
  exact lines, a relevant code snippet, and a concrete recommendation.

## Mandatory Rules by Trigger

Before performing an action listed below, read the corresponding rule files.
These files contain mandatory project instructions, not optional references.
Paths are relative to the repository root. If multiple triggers apply, read all
matching files. If a required file cannot be read, report the blocker before
proceeding with the dependent action.

| Trigger                                                                                          | Files to read                                                                                                    |
|--------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| Prepare any commit                                                                               | [.agents/rules/commits.md](.agents/rules/commits.md), [.agents/rules/changelogs.md](.agents/rules/changelogs.md) |
| Create or modify documentation, AI instructions, or skills                                       | [.agents/rules/documentation.md](.agents/rules/documentation.md)                                                 |
| Make AI code changes; create or modify a changelog or reason document; user requests a changelog | [.agents/rules/changelogs.md](.agents/rules/changelogs.md)                                                       |
| Perform a technical review of a project, changes, or PR; report code issues                      | [.agents/rules/reviews.md](.agents/rules/reviews.md)                                                             |
| Generate a date/time string or timestamp                                                         | [.agents/rules/datetime.md](.agents/rules/datetime.md)                                                           |

Reading a rule file may activate additional triggers; read those rules before
performing the corresponding action. Creating documentation or changelogs never
implies permission to commit them.

## Optional Project Skills

Project skills are discoverable under `.agents/skills/`. They provide module
knowledge and focused workflows; they are not mandatory rules. Do not load all
skills for every task. Select module skills when their knowledge helps; read only
relevant references. Explicit-only workflow skills require a direct user request.

| Skill           | Entry point                                                                    | When useful                                                                                    |
|-----------------|--------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `eventemitterx` | [.agents/skills/eventemitterx/SKILL.md](.agents/skills/eventemitterx/SKILL.md) | Emitter behavior, Node compatibility, event awaiting, async iteration, proxies and their tests |
| `eventsignal`   | [.agents/skills/eventsignal/SKILL.md](.agents/skills/eventsignal/SKILL.md)     | Signal computation, dependency tracking, subscriptions, lifecycle, types and React integration |
| `split-preserving-history` | [.agents/skills/split-preserving-history/SKILL.md](.agents/skills/split-preserving-history/SKILL.md) | Explicit invocation only: split source and matching specifications while preserving Git line ancestry |

Use `$eventemitterx` or `$eventsignal` in clients supporting repository skill
discovery. In other clients, explicitly read the linked SKILL.md when useful.
No global installation or copying to a user profile is required. Loading a skill
does not authorize commits, publication or changes outside the requested scope.
Mandatory rules above apply regardless of whether a skill is loaded.

Invoke `$split-preserving-history` explicitly to use the history-preserving split workflow;
otherwise do not load it automatically. Its `agents/openai.yaml` also disables implicit invocation.
When active, it proposes splitting related tests into the same domains and does so by default
if the user does not answer the optional proposal. This default never authorizes missing commits.
The skill and its registration are a separate AI-instruction change set from implementation changes.

## Instruction Migration Decisions

`AGENTS.md` and `.agents/rules/` replace `.github/copilot-instructions.md`.
The old rule areas are covered by: commits → `commits.md`; documentation →
`documentation.md`; Git pager → Always Applicable; dates → `datetime.md`;
changelogs → `changelogs.md`; technical reviews → `reviews.md`;
module knowledge → Optional Project Skills above.

Intentional differences from the retired instructions:

- AI commit trailers are `AI-Assistant`, `Quality` and `Area`, as defined in
  `commits.md`. The old `Signed-off-by: AI-Agent` and `Refactor: required`
  trailers are superseded; the human-authorship exception remains.
- Changelogs use one bilingual file per change set, with English sections followed
  by equivalent Russian sections. Ordinary documentation uses EN/RU file pairs.
- Module skills are optional and selected for relevant work, replacing the old
  unconditional requirement to consult both legacy knowledge files.
- SKILL.md uses standard skill frontmatter with document properties nested under
  `metadata`, as defined in `documentation.md`.
- The legacy prohibition on modifying internal packages remains in effect;
  revising it is deferred until the dependency-development stage. Compiled
  demo copies are regenerated from their source rather than edited directly.
