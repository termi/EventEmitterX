# GitHub Copilot — Project Instructions

## Git Commit Conventions

When the user asks to **make a commit**, **commit changes**, **git commit**, **make commit**, or any similar phrasing — always follow the rules below **without asking for confirmation**.

> ⚠️ **Important:** Do **NOT** commit changes on your own initiative. Only commit when the user **explicitly** requests it (e.g. "make a commit", "commit this", "закоммить", "сделай коммит"). Making changes to files does **not** imply a request to commit them.

---

### 1. Conventional Commits (Extended)

Use the following commit types:

| Type     | When to use                                                            |
|----------|------------------------------------------------------------------------|
| `feat`   | New feature                                                            |
| `fix`    | Bug fix                                                                |
| `test`   | Adding or updating tests                                               |
| `docs`   | Documentation changes only                                             |
| `ref`    | Code refactoring (use `ref` instead of `refactor`)                     |
| `dev`    | Changes to dev/launch scripts, bash scripts, build tooling, CI configs |
| `deps`   | Dependency changes (package.json, pnpm-lock.yaml, etc.)                |
| `chore`  | Minor, trivial changes that don't affect logic                         |
| `revert` | Reverting a previous commit                                            |
| `types`  | TypeScript type-only changes (`.d.ts`, type annotations, interfaces)   |
| `style`  | Formatting, whitespace, semicolons (no logic change)                   |
| `perf`   | Performance improvements                                               |
| `ci`     | CI/CD pipeline changes                                                 |

Format:
```
<type>(<scope>): <subject>
```

#### Scope Rules (required)

- If a commit contains **only** AI-agent rules/instructions/config changes (for example in `.github/`, `.cursor/`, `.continue/`, or similar AI-tooling config directories), the scope **must** be `config/ai`.
- For such commits, use subjects like: `docs(config/ai): (AI/<ModelName>): <subject>`.
- `docs(config): ...` is **not allowed** for AI-instruction-only commits.

---

### 2. AI Authorship Prefix

Always add an AI model tag right after the type/scope, before the subject:

```
<type>(<scope>): (AI/<ModelName>): <subject>
```

Examples:
- `feat(frontend): (AI/ClaudeSonnet4): Add user profile page`
- `test(backend): (AI/GPT4o): Add unit tests for auth service`
- `ref(logic): (AI/GeminiPro2): Simplify round state machine`
- `docs(config/ai): (AI/GPT5Codex): Update agent instruction rules`

**ModelName:** Use your **actual model name** at the time of generation (e.g. `ClaudeSonnet4`, `GPT4o`, `GeminiPro2`).
Format: `<Provider><ModelVersion>` — no spaces, no special characters, PascalCase.

---

### 3. Commit Message Language

**Always write commit messages in English.**

---

### 4. Commit Message Structure

```
<type>(<scope>): (AI/<ModelName>): <short description — imperative mood, max 72 chars>
<blank line>
<detailed description>
- What was changed and why
- List all significant changes
- Mention modified source files if relevant
<blank line>
<Git Trailers>
```

---

### 5. Required Git Trailers

Always add the following trailers at the end of every AI-generated commit:

```
Signed-off-by: AI-Agent <ModelName>
Refactor: required
Quality: needs-review
Area: <comma-separated list of affected areas, e.g.: frontend, tests, auth, backend>
```

If a commit contains **only** AI-agent rules/instructions changes (for example in `.github/`, `.cursor/`, `.continue/`, or similar AI-tooling config directories), set:

```
Area: config/ai
```

`scope` and `Area` must be aligned for AI-config-only commits:
- Subject scope: `config/ai`
- Trailer area: `Area: config/ai`
- Do not use `scope=config` for AI-config-only commits.

**Affected Area keywords:** `frontend`, `backend`, `tests`, `auth`, `api`, `logic`, `db`, `ci`, `deps`, `types`, `scripts`, `docs`, `config`, `config/ai`

---

### 6. Full Example

```
test(frontend): (AI/ClaudeSonnet4.6): Add unit tests for components, hooks and event handlers

Added unit tests using Vitest + React Testing Library:
- Component tests: AuthForm, FormFromSchema, Meter
- Hook tests: useAuth
- Event handler tests: clicks, forms
- Layout tests: AppLayout
- Test environment setup: vitest.config.ts, tsconfig.test.json, src/tests/setup.ts
- Updated frontend/package.json with test dependencies

Modified source files to improve testability:
- frontend/src/eventHandlers/forms.ts
- frontend/src/layouts/AppLayout.tsx
- frontend/src/main.tsx

Signed-off-by: AI-Agent ClaudeSonnet4.6
Refactor: required
Quality: needs-review
Area: frontend, tests
```

---

### 7. Staging Files

Before committing:
- Run `git status` to see all changed files
- Stage all relevant files with `git add`
- Do **not** stage unrelated files (e.g. auto-generated logs, temp files)
- If `PROJECT_ANALYSIS*.md` or similar AI-generated docs changed — commit them separately with type `docs`
- If AI-config-only files are mixed with non-AI changes, split them into separate commits. Keep AI-config-only commits with `scope=config/ai`.
- Any new or modified files in the `changelogs/` folder must be staged and included in the same commit as the related code changes — **silently**, without mentioning them in the commit message and without affecting the commit type or scope

  > ⚠️ **Never** reference `changelogs/` files anywhere in the commit message — not in the subject, not in the body, not in the trailers. Treat them as invisible to the commit message.
  >
  > ❌ Wrong: `- Added changelogs/20260314_141840_AI_ClaudeSonnet4.6.md`
  > ✅ Correct: *(nothing — changelogs are not mentioned at all)*

---

### 8. Human-Made Commits

If the user indicates that the changes were made **by themselves** (not by AI) — using phrases like:
- "commit my changes"
- "commit changes I made"
- "закоммить мои изменения"
- "закоммить изменения сделанные мной"
- or any similar phrasing implying human authorship

Then:
- **Do NOT** add the `(AI/<ModelName>):` prefix to the commit subject
- **Do NOT** add Git Trailers (`Signed-off-by`, `Refactor`, `Quality`, `Area`) unless explicitly requested
- Still follow Conventional Commits format and write the message in English
- Still follow all other rules (staging, structure, commit types)

---

## Documentation Language Rules

When creating any project documentation file (e.g. `PROJECT_ANALYSIS.md`, `API.md`, `ARCHITECTURE.md`, `README.md`, etc.):

1. **For any Markdown document generated by an AI agent, always start the file with a properties block** (first lines of the file, before any headings/content):
   ```yaml
   ---
   iso date: <ISO date time string>
   timestamp: <Milliseconds since epoch>
   ai_model: <ModelName>
   git user: <git user name + email>      ← in format: `"username" <email>`
   area: <comma-separated list of affected areas, e.g.: frontend, tests, auth, backend>
   ---
   ```

2. **Default language is English** — the primary file must be written in English
3. **Always create a Russian version** alongside it, with the suffix `_RU` added before the file extension:
   - `PROJECT_ANALYSIS.md` → also create `PROJECT_ANALYSIS_RU.md`
   - `API.md` → also create `API_RU.md`
   - `ARCHITECTURE.md` → also create `ARCHITECTURE_RU.md`
4. Both files must have **equivalent content** — same structure, same sections, same level of detail
5. Commit both files together under the `docs` type in a single commit

### Exception: Agent Skills / AI Instruction Files

Do **NOT** create a `_RU.md` counterpart for markdown files located in folders typically used for AI agent configuration or skills, such as:
- `.github/` (e.g. `copilot-instructions.md`, `CODEOWNERS`)
- `.cursor/`
- `.continue/`
- or any similar AI-tooling config directories

These files are technical instructions for AI agents and do not require translation.

---

## Git Command Rules

Commands that produce paginated output (e.g. `log`, `diff`, `show`, `blame`, `shortlog`) **must always** be called with the `--no-pager` flag to prevent terminal blocking:

```bash
git --no-pager log
git --no-pager diff
git --no-pager show
git --no-pager log --oneline
```

> ⚠️ Never call these commands without `--no-pager` in an automated/agent context — the pager will hang the terminal waiting for input.

### Date/Time and Timestamp Retrieval Rules

When an AI agent needs to generate a date/time string or timestamp, use this strict fallback order:

1. Try a `nodejs` script first.
2. If `nodejs` fails (command/script error), try `Python`.
3. If `Python` also fails, use equivalent shell commands for the **current shell** and requested format.

#### Local date/time according CLDR/ICU

Locale date and time is shown in the format that is commonly used in the user's region, including local time zone,
date order (e.g. day/month/year vs month/day/year), and local language for month names if applicable.

* In `nodejs`: For CLDR/ICU "Local datetime", "Local date", "Local time", use locale-aware APIs: `Date.toLocaleString()`, `Date.toLocaleDateString()`, `Date.toLocaleTimeString()`.
* In `Python`: For CLDR/ICU "Local datetime", "Local date", "Local time", use `locale.localeconv` together with `now.strftime` to format the output according to the user's locale settings.
* If the user asks for a date/time format that is not supported by default `nodejs` and `Python` formatting capabilities, use shell commands.
* Use shell commands with default formatting only when both `nodejs` and `Python` are unavailable/failed, or the requested format requires shell-specific formatting.

#### Milliseconds since epoch

When an AI agent needs to generate a "Milliseconds since epoch":

* Use `Date.now()` in `nodejs`
* Use `date +%s%3N` in shell (or PowerShell equivalent)
* Use `int(time.time() * 1000)` in `Python`
* Get "Unix timestamp" (seconds since epoch) and multiply by 1000 if the environment does not support direct milliseconds retrieval

---

## Changelog Strategies

All changelog files are stored in the `changelogs/` folder and written in **Markdown**.

---

### Changelog File Structure

Every changelog file follows this structure:

```
# Changelog at <Local datetime according CLDR/ICU>

## Meta
- Model: <ModelName>        ← omit if human-made
- Area: <affected areas>
- Files affected: <count>
- Directories touched: <list>
- <any other relevant meta>

## Human-Readable Summary
<Summarize changes from the end-user perspective>
- Frontend: UI/UX changes visible to the user
- Backend: API / RPC / EventBus event changes
- (omit sections not applicable)

## Technical Details
<Summarize changes from the developer perspective>
- Which files were changed and what was done
- Why these changes were made (AI reasoning ← omit if human-made)

## Original User Request                ← optional, include if the model remembers it
<Paste or paraphrase the user's original request that triggered these changes>

## Change Assessment                    ← optional, include if the model can provide useful evaluation
<AI's assessment of the changes: quality, risks, completeness, suggestions for follow-up>

---

## [RU] Человеко-читаемая сумма изменений
<Дублирование содержимого "Human-Readable Summary" на русском>

## [RU] Технические детали
<Дублирование содержимого "Technical Details" на русском>

## [RU] Оригинальный запрос пользователя   ← optional
<Дублирование содержимого "Original User Request" на русском>

## [RU] Оценка изменений                   ← optional
<Дублирование содержимого "Change Assessment" на русском>
```

---

### When to Create a Changelog

| Trigger                                                                                                   | Filename                       | Includes AI meta              |
|-----------------------------------------------------------------------------------------------------------|--------------------------------|-------------------------------|
| **AI made any code changes**                                                                              | `<datetime>_AI_<ModelName>.md` | ✅ Yes (`Model`, AI reasoning) |
| **User explicitly requests a changelog** for their own changes                                            | `<datetime>.md`                | ❌ No                          |
| **User requests a commit** for their own changes **and** no uncommitted changelog exists in `changelogs/` | `<datetime>.md`                | ❌ No                          |

> For strategies 2 and 3 — analyze the staged/changed files to generate the changelog content.

**Datetime format:** `YYYYMMDD_hhmmss` (e.g. `20260314_153045`)

---

## Technical Review Rules

When performing a **technical review** of a project, commit changes, or a Pull Request — and when identifying **Risks**,
**Limitations**, **Problems**, **Bugs**, **Illogicalities**, or any other code issues — always follow these rules:

### 1. Be Specific — Always Include Location

For **every** identified issue, you **must** provide:

- **File path** — relative to the repository root (e.g. `modules/EventEmitterEx/EventEmitterX.ts`)
- **Line numbers** — exact line or range (e.g. `line 42` or `lines 38–51`)
- **Code snippet** — paste the relevant code inline (use a fenced code block with language tag)

> ❌ Wrong: "There is a potential memory leak in the EventEmitter module."
>
> ✅ Correct:
>
> **File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 38–45
> **Issue:** Listeners added via `addListener()` are never cleaned up when the emitter is destroyed.
> ```typescript
> destroy() {
>   this._destroyed = true;
>   // listeners are NOT cleared here — potential memory leak
> }
> ```

### 2. Always Include a Recommendation

For each identified issue, add a **"Recommendation"** subsection explaining:

- How to fix or mitigate the problem
- What the preferred approach is (with a code example if applicable)
- Whether the issue is critical, a warning, or a suggestion

### 3. Severity Labels

Prefix each issue with a severity label:

| Label             | Meaning                                                     |
|-------------------|-------------------------------------------------------------|
| 🔴 **Critical**   | Bug, data loss, security vulnerability                      |
| 🟠 **Warning**    | Risky code, likely to cause issues under certain conditions |
| 🟡 **Suggestion** | Improvement, code smell, best practice violation            |
| 🔵 **Info**       | Observation, minor note, possible future concern            |

### 4. Format Each Issue as a Section

Use the following structure for every issue found:

````
#### [🔴/🟠/🟡/🔵] <Short Issue Title>

**File:** `<relative/path/to/file.ts>`, line(s) <N>

**Problem:**
<Describe the issue clearly>

```<language>
// relevant code snippet
```

**Recommendation:**
<How to fix it, with example if helpful>
````

> ⚠️ Do NOT save space when describing code issues. The more specific and detailed the description — the better. Vague summaries without file paths and line numbers are not acceptable.

---
---

# Agent Skills — Project Knowledge

> Detailed project architecture, conventions, and patterns are split into separate skill files per module.
> The AI agent **must** consult these files when working with the corresponding module.

| Skill File                                                   | Covers                                                                                                                                                                                           |
|--------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`.github/skills-EventEmitterX.md`](skills-EventEmitterX.md) | Project overview, repository structure, code conventions, performance patterns, import aliases, EventEmitterX architecture, testing conventions, documentation references, common pitfalls       |
| [`.github/skills-EventSignal.md`](skills-EventSignal.md)     | EventSignal architecture, internal event buses, signal lifecycle, dependency tracking, React integration (hooks, JSX rendering, component type system), EventSignal-specific naming and pitfalls |

