# The Activepieces pull request

Not opened yet: the lead opens it on Adil's word. Everything below is ready.

## Where

- Fork: `adbek/activepieces` (created 2026-10-31 from `activepieces/activepieces`, upstream added as `upstream`).
- Branch: `feat/piece-prooftell`, pushed, one commit on top of upstream `main` at `2c28ed8` (2026-10-31).
- Files of the commit: `packages/pieces/community/prooftell/**` (this folder's `piece/`), one entry in
  `tsconfig.base.json` (`@activepieces/piece-prooftell`, after `piece-prompthub`), and the two hunks `bun install`
  adds to `bun.lock` for the new workspace (CI installs with `--frozen-lockfile`; an unrelated hash drift the same
  install produced was left out).
- Working clone on forge: `integrations/.work-activepieces/` (gitignored; `bun` 1.4.4 and the workspace installed).

## Title

```
feat(pieces): add ProofTell piece
```

Their convention (`validate-pr-title.yml`, conventional commits; merged examples: "feat(pieces): add Clay piece",
"feat(pieces): add Sofya piece"). Labels the maintainers apply: `🌟 feature` and `🧩 area/third-party-pieces`
(an outside account cannot label).

## To open it

```
gh pr create --repo activepieces/activepieces --base main --head adbek:feat/piece-prooftell \
  --title "feat(pieces): add ProofTell piece" --body-file integrations/activepieces/PR-body.md
```

## Body

`PR-body.md` next to this file, from their template (`.github/pull_request_template.md`): description, how it
was tested, no Linear ticket, "no" ticked under both required sections.

## What to know before opening it

- **Outside PRs are auto-closed right now.** `CONTRIBUTING.md` and `.github/workflows/close-external-prs.yml`
  (read 2026-10-31): a PR whose author is not an owner, member, collaborator or past contributor is commented on and
  closed at once, unless a maintainer adds the `keep-open` label ("existing customers who discussed it over Slack").
  The last outside piece PR merged dates from 2026-09-02 (Clay). The path they offer instead: publish the piece as
  our own npm package (rename to `@prooftell/piece-prooftell`, `npm run publish-piece prooftell`), which a
  self-hosted or platform-plan Activepieces installs from Settings → My pieces → Install piece. The branch serves
  both: the PR if they take it, the package if not.
- The "Linear ticket" check (`linear-ticket-check.yml`) fails until a maintainer writes a ticket into the
  description; an outside PR has none, so nothing to do on our side.
- Piece PRs leave `src/i18n/translation.json` to their nightly job (their brain, 2026-10-30): none is included.
- The `User-Agent` version is a constant in `src/lib/common/index.ts`, mirrored from `package.json` (`0.0.1`):
  bump both together.
- `test/staging-run.js` next to this file runs every action of the built piece against staging:
  `K=$(sed -n 7p keys/smoke-accounts.txt) node integrations/activepieces/test/staging-run.js <clone>/packages/pieces/community/prooftell/dist`
  (it redirects `api.prooftell.com` to `api.prooftell.dev` at the `fetch` level; the piece itself has no override).
