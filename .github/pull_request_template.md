## Summary

<!-- What does this PR change? -->

## Version bump (required for merges to `develop`)

Apply **one** label to this PR before merging:

- [ ] `version:patch` — bug fixes, small tweaks, docs-only
- [ ] `version:minor` — new command or feature slice (e.g. `/open-pack`)
- [ ] `version:major` — breaking change (rare during `0.x`)

If no label is set, the version bump workflow defaults to **patch**.

## Checklist

- [ ] Tested locally (`npm run dev` or `npm run dev:register`)
- [ ] Re-ran `register-commands` if slash command definitions changed
- [ ] No secrets committed (`.env`, tokens)
