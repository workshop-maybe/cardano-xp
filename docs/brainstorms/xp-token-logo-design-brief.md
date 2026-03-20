# Design Brief: Cardano XP Token Logo

## What We Need

A token logo/mark for **XP** — the native token of Cardano XP (cardano-xp.io). This mark will appear:

- On-chain as the token image (CIP-25/CIP-68 metadata)
- In wallet UIs (Nami, Eternl, Lace) at small sizes (32px–64px)
- In the Cardano XP app alongside balances, credentials, and the give graph
- On social cards, video slides, and promotional material

## Context

Cardano XP is a proof-of-contribution system built on Andamio. You earn XP by doing useful work — giving feedback, submitting improvements, completing tasks. You can give XP to others as recognition. Credentials snapshot your XP balance at claim time as permanent on-chain proof.

**Tagline**: "Support Cardano development, earn rewards."

**What XP is NOT**: It's not DeFi yield. It's not learn-to-earn. It's not a governance token (yet). It's proof you showed up and did something useful.

## Brand Relationship

Cardano XP is built on Andamio but has its own identity. The logo should:

- Stand alone — not require the Andamio logo to make sense
- Feel compatible with the Andamio visual language (the current app uses Andamio's logo set in `public/logos/`)
- Work alongside the Cardano ecosystem without copying Cardano's blue gradient aesthetic

## Design Direction

### Tone
- Earned, not given — this represents work, not speculation
- Grounded and honest — no hype, no "to the moon" energy
- Accessible — a first-time Cardano user should feel invited, not intimidated

### Concepts to Explore

1. **XP as mark/stamp** — something that looks like it was earned or imprinted. A badge, a maker's mark, a stamp of contribution.
2. **Accumulation** — XP grows through participation. Could suggest layers, stacking, or incremental progress.
3. **Recognition flow** — XP circulates through giving. The give graph is the differentiator. Could suggest connection, passing something forward.

### Typography
- "XP" is the primary mark. Two letters — should be bold and readable at 32px.
- Consider whether the letterforms themselves can carry the concept (e.g., the X as a crossroads or intersection, the P as forward momentum).

### Color
- Open — doesn't need to be Cardano blue or Andamio's palette
- Should have strong contrast at small sizes
- Needs to work on both dark and light backgrounds

### Constraints
- Must be legible at 32x32px (wallet thumbnail)
- Must work as a circle crop (most wallet UIs and token explorers display tokens in circles)
- Deliver as SVG + PNG at 512x512 minimum
- Single-color version needed for on-chain metadata where color isn't guaranteed

## What Success Looks Like

When someone sees this in their wallet next to ADA and other tokens, it should feel:
- Distinct — not another generic token logo
- Intentional — clearly designed, not placeholder
- Inviting — makes you want to know what it is

## Reference

- Tokenomics: `docs/tokenomics.md`
- Project context: `docs/project-context.md`
- Current Andamio logos: `public/logos/`
- Domain: cardano-xp.io
