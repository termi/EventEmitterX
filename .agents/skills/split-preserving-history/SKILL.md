---
name: split-preserving-history
description: "Split source files and matching tests while preserving Git line ancestry. Use only when explicitly requested by the user; do not activate automatically for ordinary refactoring."
metadata:
  iso date: "2026-10-09T12:05:52.513Z"
  timestamp: 1791547552513
  ai_model: "GPT6"
  git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
  area: "config/ai"
---

# Split Files While Preserving History

## Activation and purpose

Load only on an explicit request such as `$split-preserving-history` or a request to use this skill.
`agents/openai.yaml` disables implicit invocation. Loading it does not authorize commits, branch integration
or history rewriting. Obtain authorization for the required preparation commits before making them;
reuse explicit authorization already given for the current operation and respect its scope.

A normal fragment copy can make a small extracted file appear newly authored. Preserving ancestry lets
maintainers trace decisions, regressions and original authors through `git log --follow` and `git blame`.
Git stores snapshots and infers renames/copies; it does not store permanent per-file identity.
`git mv` alone is not proof that every extracted fragment retains its history.

Original procedure: Raymond Chen, [How to split out pieces of a file while preserving git line history:
The hard way with commit-tree](https://devblogs.microsoft.com/oldnewthing/20190917-00/?p=102894).
Use its rename-branch/manual-merge mechanism, adapted to the repository's verified history conventions.
Do not copy destructive scratch-repository reset commands into the user's working tree.

## Boundaries and related tests

Identify cohesive destinations, their imports and public compatibility entries. Keep the move separate
from behavior changes, mass formatting and renaming. Check constructor/symbol identity and runtime cycles
where applicable. Simple newly extracted types may forgo ancestry only if the user permits that exception.

**Look for tests whenever splitting a source file.** Propose splitting its existing specifications into
the same domain areas, preserving their history too. Use an optional question when clarification helps;
continue independent inventory and backup work while awaiting the answer. If the user does not answer,
default to splitting the related tests as part of the move after allowing a reasonable reply interval
(normally at least 60 seconds). If interactive clarification is unavailable, state and apply this default.
An explicit decision to defer tests takes precedence. This default concerns test layout only;
silence never grants missing permission for commits or other restricted actions.

Shared contract helpers belong in test-support files when two domains need the same checks. Preserve
existing test names, bodies, environments, setup/teardown and case counts; explain any unavoidable
redistribution of mixed-domain assertions. Do not silently duplicate suites or discard skipped/todo cases.
Leave future domain extraction, such as EventAwait, for its authorized stage.

## Protect pending work

Record the branch, base commit, index state and affected tracked/untracked paths before preparing history.
Make a durable exact-byte backup with a manifest and hashes, outside staged changes; a retained Git stash
can provide an additional recovery point. Do not lose unrelated staged content or ignored files needed
for recovery. Keep a recoverable copy until restoration and verification succeed.

Check destination collisions, especially existing untracked regression tests. Restore pending patches
onto the new domains after committing the pure move; merge these tests instead of overwriting the moved
specification. Keep pending fixes uncommitted if requested, and verify restored source against the backup.
Report the backup location and restoration result.

## Choose and execute a history procedure

Prefer the original procedure when extracting fragments while retaining the old file:

1. From one recorded base, create a separate branch per destination. Use the user's branch names or the
   configured prefix (`codex/` by default); check for existing refs before creating them.
2. On each branch, commit a full-file rename with unchanged content. In a following commit, retain that
   destination's fragment and put the complementary content back at the old path. Keep each branch
   faithful to its stated extraction rather than discarding another domain prematurely.
3. Assemble the intended final tree: all destination fragments and the retained original content or
   compatibility entry. A normal multi-parent merge may conflict on the old file. If needed, create
   the deliberate merge with `git write-tree` and `git commit-tree`, retaining the integration branch
   and every extraction branch as parents, then fast-forward with `git merge --ff-only <commit>`.

The repository also has a verified **full-copy preparation variant**: branch per full-file rename,
then a deliberate multi-parent merge retaining the original plus all full copies, followed immediately
by an ordinary commit trimming them to the intended domains and removing/replacing the old path.
Use this variant when matching the established decomposition graph is useful; it is not the article's
literal sequence. Preparation snapshots duplicate implementations/tests and may not compile or run.
Do not present them as release-ready checkpoints, leave the final branch there or mix fixes into pruning.

Before using Git plumbing, verify the assembled tree and parent list. An isolated `GIT_INDEX_FILE`
can protect the user's index; resolve `GIT_DIR`/`GIT_WORK_TREE` from the actual repository/worktree rather
than assuming `.git` is always a directory. Plumbing bypasses normal commit hooks: satisfy applicable
commit rules and required checks explicitly. Do not overwrite refs, force-push or rewrite existing history.

## Prove the result and record limitations

- Compare runtime/type/build checks before and after the pure extraction. For specifications, compare
  test names and statuses as multisets, not just totals. Check setup isolation and test discovery.
- For each destination, inspect `git --no-pager log --follow -- <path>` and full-file
  `git --no-pager blame -M -C -C <revision> -- <path>`. Compare representative original lines from
  different blocks against the same command at the base; record original commits and exact paths/lines.
  Include boundary lines and small moved fragments, not only an easy large block.
- Full-file blame retains copy-detection context. A narrow `-L` range, short/repeated lines and changed
  thresholds can yield different attribution. Document the options that actually worked; do not claim
  unconditional support in every Git UI. New imports and glue correctly belong to the extraction.
- If evidence fails, adjust the move graph before acceptance. If maintaining ancestry requires a
  different scope or permission, explain the concrete choice rather than claiming history was preserved.
- Keep preparation commits and merge parents. Squash/rebase/cherry-pick can remove the ancestry links;
  after any authorized graph change, repeat provenance verification. Do not hide provenance failure
  with an ignore-revisions file.
- Record boundaries, base/branch/merge hashes, verified provenance samples, alternatives and tradeoffs
  in the repository's required reason/roadmap documents. Run final verification after restoring fixes;
  commit the pure move only, within the user's authorization, and report remaining uncommitted work.

Local evidence for this variant: [source decomposition](../../../changelogs/reasons/EventEmitterX_PROXY_DECOMPOSITION.md)
and [specification decomposition](../../../changelogs/reasons/EventEmitterX_SPEC_DECOMPOSITION.md).
These are examples of checked results, not hashes or destination names to reuse in another task.
