# Cardano XP — Tokenomics v0

## Supply

100,000 XP. Strictly limited, one-time mint. That's it.

## How You Earn

Complete tasks. Tasks are the only mint. You can't buy or transfer your way into initial XP — you have to do work.

What counts as a task:
1. Give constructive feedback on a feature or course
2. Submit an issue or improvement
3. More tasks added as the experiment grows

## Circulation

Once you hold XP, you can give it to others. Recognition flows through the network. This is the economy: earned by doing, circulated by giving.

## Credentials

When you claim a project credential, your XP count is snapshotted. The credential is permanent proof — independent of your current balance. You don't need to hold XP to keep the credential.

Your contribution history becomes your identity. Not your Twitter following, not who you know, not how long you've been around. What you've demonstrated, on-chain, verifiable by anyone.

## Open Platform

Anyone can host a project on Cardano XP and receive an allocation of XP to distribute to contributors. You don't need permission from the Andamio team. The protocol enforces validity — no single entity controls who can coordinate or who gets recognized.

## Governance

If this experiment works, XP holders decide what V2 looks like. This experiment is scaffolding — designed to be outgrown by whatever the community builds next.

Let's not get ahead of ourselves. Let's see if this works first.

## What This Is Not

This is not learn-to-earn. This is a feature feedback collection mechanism. "Support Cardano development, earn rewards." The reward is proof you showed up and did something useful — recorded on-chain, composable, permanent.

Without verifiable proof of what people can do and have done, ecosystems default to informal reputation and relationship networks. XP replaces "take my word for it" with "check the ledger."

## Implementation Notes

### Live earning dashboard

Ship a page in the app that shows real-time XP state: total minted, circulating supply, credentials claimed, active projects distributing. Not a separate analytics tool — part of the product. This replaces the static "allocation pie chart" that every other project uses. The data is on-chain; surface it.

### On-chain verifiability via CIP-68

Use CIP-68 (datum metadata standard) for credentials. When a credential is claimed, the XP count at time of claim is stored in the on-chain datum — readable by any Cardano tool, not just this app. This makes credentials composable and independently verifiable without trusting a dashboard or API.

### Give graph visibility

The circulation mechanic (users giving XP to each other) is the differentiator. Most XP systems are one-directional: platform to user. This one has a secondary recognition economy. Make the give graph visible — who recognized whom, when, and how much. Let the network speak for itself. This is where the project can push boundaries that no comparable project has.

### Build journal as reproducibility proof

The journal/ directory documents every step of development with agent skills. "Vibe coded on a Sunday afternoon" is a verifiable claim — anyone can follow the journal entries and reproduce the process. The journal is evidence, not marketing.

### Supply dynamics modeling

100k fixed supply + open project hosting = a natural question: what happens when XP gets thin? Build a simple interactive model showing supply distribution under different adoption scenarios (few projects vs. many, concentrated vs. distributed giving patterns). Even a static scenario analysis in the docs would be a first for this kind of project. Tools like Machinations.io or cadCAD can support this if we want to go deeper.

## Context

This app and these courses were vibe coded on a Sunday afternoon on top of Andamio. Full documentation of the process is public.

Source: [XP tokenomics strategy](../../020-areas/strategy/xp-tokenomics-draft.md) + voice memo, 2026-03-15.
