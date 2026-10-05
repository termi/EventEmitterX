## Technical Review Rules

When performing a **technical review** of a project, commit changes, or a Pull Request — and when identifying **Risks**,
**Limitations**, **Problems**, **Bugs**, **Illogicalities**, or any other code issues — always follow these rules:

### 1. Be Specific — Always Include Location

For **every** identified issue, you **must** provide:

- **File path** — relative to the repository root (e.g. `modules/EventEmitterEx/EventEmitterX.ts`)
- **Line numbers** — exact line or range (e.g. `line 42` or `lines 38–51`)
- **Code snippet** — paste the relevant code inline (use a fenced code block with language tag)

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
