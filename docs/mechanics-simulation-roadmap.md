# Mechanics simulation roadmap (internal)

| Mechanic | Status |
| --- | --- |
| Muscle Training cost/gain model | Production (static internal model, `src/lib/muscle-training-model.ts`) |
| Proficiency timing | **Production-integrated (v2.1.0), unified route engine in v3.0.0** (`src/lib/proficiency.ts`, tests in `src/lib/proficiency.test.ts`) |
| Strength | Excluded from simulation until separately verified |

## Proficiency (verified)
- +1 XP per second while Endurance training is active.
- `nextRequirement = round(requirement × 1.15)`, rounded at every transition (R42 = 3731 → R43 = 4291, R56 = 26403, R66 = 106814).
- Effective level = base + bonus; displayed multiplier = 1.15^effective. Bonus does not change the XP timer.
- Entered Gain already includes the current multiplier; each future base level-up multiplies the then-current Gain by 1.15.
- Simulation is event-driven (no per-second loop), capped at 10,000 events; a target exactly at an event boundary finishes before the level-up.
- Muscle Training prefixes use the same event simulation while waiting for each purchase; purchases affordable only at/after the target moment are pruned.
- Formulas and evidence stay internal; the public UI shows only calculated results.