# GitHub Copilot — Project Instructions

## Git Commit Conventions

When the user asks to **make a commit**, **commit changes**, **git commit**, **make commit**, or any similar phrasing — always follow the rules below **without asking for confirmation**.

---

### 1. Conventional Commits (Extended)

Use the following commit types:

| Type       | When to use                                                                 |
|------------|-----------------------------------------------------------------------------|
| `feat`     | New feature                                                                 |
| `fix`      | Bug fix                                                                     |
| `test`     | Adding or updating tests                                                    |
| `docs`     | Documentation changes only                                                  |
| `ref`      | Code refactoring (use `ref` instead of `refactor`)                          |
| `dev`      | Changes to dev/launch scripts, bash scripts, build tooling, CI configs      |
| `deps`     | Dependency changes (package.json, pnpm-lock.yaml, etc.)                    |
| `chore`    | Minor, trivial changes that don't affect logic                              |
| `revert`   | Reverting a previous commit                                                 |
| `types`    | TypeScript type-only changes (`.d.ts`, type annotations, interfaces)        |
| `style`    | Formatting, whitespace, semicolons (no logic change)                        |
| `perf`     | Performance improvements                                                    |
| `ci`       | CI/CD pipeline changes                                                      |

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

