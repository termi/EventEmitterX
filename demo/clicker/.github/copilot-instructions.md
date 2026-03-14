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

---

### 2. AI Authorship Prefix

Always add an AI model tag right after the type/scope, before the subject:

```
<type>(<scope>): (AI/<ModelName>): <subject>
```

Examples:
- `feat(frontend): (AI/ClaudeSonnet4.6): Add user profile page`
- `test(backend): (AI/ClaudeSonnet4.6): Add unit tests for auth service`
- `ref(logic): (AI/ClaudeSonnet4.6): Simplify round state machine`

**Current model name:** `ClaudeSonnet4.6` — update this if a different model is being used.

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

**Affected Area keywords:** `frontend`, `backend`, `tests`, `auth`, `api`, `logic`, `db`, `ci`, `deps`, `types`, `scripts`, `docs`, `config`

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

1. **Default language is English** — the primary file must be written in English
2. **Always create a Russian version** alongside it, with the suffix `_RU` added before the file extension:
   - `PROJECT_ANALYSIS.md` → also create `PROJECT_ANALYSIS_RU.md`
   - `API.md` → also create `API_RU.md`
   - `ARCHITECTURE.md` → also create `ARCHITECTURE_RU.md`
3. Both files must have **equivalent content** — same structure, same sections, same level of detail
4. Commit both files together under the `docs` type in a single commit

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

---

## Changelog Strategies

All changelog files are stored in the `changelogs/` folder and written in **Markdown**.

---

### Changelog File Structure

Every changelog file follows this structure:

```
# Changelog at <YYYYMMDD_hhmmss>

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

---

## [RU] Человеко-читаемая сумма изменений
<Дублирование содержимого на русском — та же структура>
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

