# Card layout and compose assets (non-final)

Per-car **base images** (catalog `image_url`) already include:

- The car photograph
- Make logo and country flag
- Stat-column chrome and **labels** (for example “Top Speed”, “0-60 MPH”)

At compose time the bot draws:

- Year, make, and model
- Stat **values** (Unavailable / N/A when the row says so)
- Drivetrain and tires
- RP (and drop shadow) when that overlay is **on** (off until performance ratings exist)
- Rarity as **one full-row PNG** (`stars/row-1.png` … `row-6.png`), not six separate star stamps

**1–5★** rows use solid fills in the rarity palette (same family as the old pack-reveal embed accents). **6★** is iridescent art — do not tint it in Canvas.

Drop layout references and star-row PNGs in this folder when they are ready. Overlay slots for a **1652×1029** base live in `src/renderers/card/layout.js` (retune against a real PNG). Typography and frame art are maintainer assets. Code owns slot positions, overlay toggles, and data binding.
