## Summary

<!-- What does this PR change? -->

## Version bump (required for merges to `develop`)

Apply **one** label to this PR before merging:

- [ ] `version:patch` — bug fixes, small tweaks, docs-only
- [ ] `version:minor` — new command or feature slice (e.g. `/open-pack`)
- [ ] `version:major` — breaking change (rare during `0.x`)

If no label is set, the version bump workflow defaults to **patch**.

CI only updates `package.json` and creates a tag. Set `package.json` on this branch to the **pre-bump** base so the labeled bump lands on the intended target (e.g. `0.1.5` + `version:patch` → `0.1.6`).

## README & CHANGELOG (required before merge)

- [ ] [CHANGELOG.md](../CHANGELOG.md) has a dated `## [X.Y.Z]` section for the **target** version (not only `[Unreleased]`)
- [ ] README **Version** line, development status, and roadmap checkboxes match this PR
- [ ] README setup / env / commands / structure updated if those areas changed

## Checklist

- [ ] Tested locally (`npm run dev` or `npm run dev:register`)
- [ ] Re-ran `register-commands` if slash command definitions changed
- [ ] No secrets committed (`.env`, tokens, Supabase secret keys)
