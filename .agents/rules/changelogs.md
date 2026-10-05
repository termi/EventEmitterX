## Changelog Strategies

All changelog files are stored in the `changelogs/` folder and written in **Markdown**.

### Language Rules — Single Bilingual File

- Create one changelog file per change set, never separate files per language.
- Write the English sections first.
- Append equivalent Russian sections at the end of the same file,
  after `---`, using `## [RU] ...` headings.
- Every English content section must have a corresponding Russian section,
  including optional sections when present. Metadata is written once.
- Never create `*_RU.md` files anywhere under `changelogs/`.
- Reason documents in `changelogs/reasons/` follow the same language rule:
  one bilingual file per problem.

### One changelog per change set

A single change set (a bug fix plus its tests, a refactor plus its reason docs) gets **one** changelog file. Do not split
one change set across several changelogs just because the work took more than one session.

When work spans sessions and earlier drafts already exist, **merge** them: keep the newest
`changelogs/<datetime>_<Name>.md`, fold the earlier content in, and delete the superseded files. The merged entry must
read as one document — one `## Meta`, one `## Reasons`, one coherent `## Human-Readable Summary` — not as two drafts
stapled together. Commit the merge as part of the change-set commit, not as a separate "merge changelogs" commit.

Reason documents in `changelogs/reasons/` are the opposite: **one per problem, never merged**. Several independent
problems mean several reason docs, each listed under the changelog's `## Meta` and `## Reasons`.

### Changelog File Structure

#### Content Requirements

- Start with `# Changelog at <Local datetime according CLDR/ICU>`.
- Include one `## Meta` section: model name (AI-made changes only), affected
  areas, affected file count, directories touched, and other relevant metadata.
  List reason document links here when reason documents exist.
- Include `## Human-Readable Summary`: describe changes from the end-user
  perspective. Group by frontend, backend, or other areas when applicable;
  omit irrelevant groups.
- Include `## Technical Details`: describe which files changed, what changed,
  and why. Include AI reasoning for AI-made changes; omit it for human-made changes.
- Include `## Reasons` when reason documents exist: link each problem's reason
  document and explain its connection to the change set.
- Include `## Original User Request` when available: quote or faithfully
  paraphrase the request. Do not invent missing requests.
- Include `## Change Assessment` when useful: describe quality, risks,
  completeness, and relevant follow-up suggestions supported by the changes.
- Add other content sections when needed. Omit inapplicable optional sections
  and placeholder text from the final changelog.

#### Translation Requirements

Every English content section must have an equivalent Russian section at the
end of the **same file**, after `---`, in the same order. This applies to
required, optional, and additional sections alike.

Translate section headings and prose. Prefix Russian top-level section headings
with `## [RU]`. Preserve heading levels, subsection order, lists, tables, and
level of detail. Preserve code, paths, identifiers, URLs, and other technical
literals. The translation must contain the same information, without additions
or omissions.

Write the document title and metadata (including `## Meta` and any properties
block) only once; they do not require Russian duplicates. Never create a
separate `*_RU.md` counterpart.

#### Illustrative Template

The generic content sections below demonstrate the translation pattern, not
literal headings or an exhaustive list of sections. Replace them with the
required and applicable sections above, and mirror every section included.

```markdown
# Changelog at <Local datetime according CLDR/ICU>

## Meta
- Model: <ModelName — omit for human-made changes>
- Area: <affected areas>
- Files affected: <count>
- Directories touched: <list>
- <Other relevant metadata, including reason document links when applicable>

## <First English content section heading>
<English content, including any subsections, lists, or tables>

## <Next English content section heading>
<English content>

<!-- Include all required and applicable English content sections here. -->

## [RU] <Russian translation of the first content section heading>
<Equivalent Russian translation, preserving subsections, lists, and tables>

## [RU] <Russian translation of the next content section heading>
<Equivalent Russian translation of that section's content>

<!-- Mirror every English content section above, in the same order. -->
```

### When to Create a Changelog

| Trigger                                                                                                   | Filename                       | Includes AI meta              |
|-----------------------------------------------------------------------------------------------------------|--------------------------------|-------------------------------|
| **AI made any code changes**                                                                              | `<datetime>_AI_<ModelName>.md` | ✅ Yes (`Model`, AI reasoning) |
| **User explicitly requests a changelog** for their own changes                                            | `<datetime>.md`                | ❌ No                          |
| **User requests a commit** for their own changes **and** no uncommitted changelog exists in `changelogs/` | `<datetime>.md`                | ❌ No                          |

> For strategies 2 and 3 — analyze the staged/changed files to generate the changelog content.

**Datetime format:** `YYYYMMDD_hhmmss` (e.g. `20260314_153045`)
