## Git Commit Conventions

When the user asks to **make a commit**, **commit changes**, **git commit**, **make commit**, or any similar phrasing — always follow the rules below **without asking for confirmation**.

> ⚠️ **Important:** Do **NOT** commit changes on your own initiative. Only commit when the user **explicitly** requests it (e.g. "make a commit", "commit this", "закоммить", "сделай коммит"). Making changes to files does **not** imply a request to commit them.

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

#### Scope Rules (required)

- If a commit contains **only** AI-agent rules/instructions/config changes (for example in `.github/`, `.cursor/`, `.continue/`, or similar AI-tooling config directories), the scope **must** be `config/ai`.
- For such commits, use subjects like: `docs(config/ai): (AI/<ModelName>): <subject>`.
- `docs(config): ...` is **not allowed** for AI-instruction-only commits.

### 2. AI Authorship Prefix

Always add an AI model tag right after the type/scope, before the subject:

```
<type>(<scope>): (AI/<ModelName>): <subject>
```

**ModelName:** Use your **actual model name** at the time of generation (e.g. `ClaudeSonnet4`, `GPT4o`, `GeminiPro2`).
Format: `<Provider><ModelVersion>` — no spaces, no special characters, PascalCase.

### 3. Commit Message Language

**Always write commit messages in English.**

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

### 5. Required Git Trailers

Always add the following trailers at the end of every AI-generated commit:

```
AI-Assistant: <ModelName>
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

AI-Assistant: ClaudeSonnet4.6
Quality: needs-review
Area: frontend, tests
```

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

### 8. Human-Made Commits

If the user indicates that the changes were made **by themselves** (not by AI) — using phrases like:
- "commit my changes"
- "commit changes I made"
- "закоммить мои изменения"
- "закоммить изменения сделанные мной"
- or any similar phrasing implying human authorship

Then:
- **Do NOT** add the `(AI/<ModelName>):` prefix to the commit subject
- **Do NOT** add Git Trailers (`AI-Assistant`, `Quality`, `Area`) unless explicitly requested
- Still follow Conventional Commits format and write the message in English
- Still follow all other rules (staging, structure, commit types)
