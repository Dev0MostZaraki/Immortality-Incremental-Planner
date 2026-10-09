# Planner v3 (internal)

Endurance sub-views: **Plan** (shared state, Best Next Move, route timeline, dynamic ETA), **Muscle Training** (level/price anchor, global optimum, candidate stops), **More Tools** (secondary, collapsed).

## Engine (`src/lib/route-engine.ts`)
- One event-driven state: time, Endurance, Gain, Proficiency (base, bonus, XP, requirement), MT level.
- Events: Proficiency level-up, planned MT purchase, target reached; optional temporary Increase at t=0. Strength/Perseverance plug in as further event kinds once verified.
- `candidates()` evaluates every MT prefix exhaustively up to Lv150, incrementally (O(n)). Stops only when the next cost ≥ target, the purchase is unreachable, or it would be affordable only once the target is already reached. Display limits never affect it.
- Route search: direct farm, every MT prefix, Increase only, Increase + every MT prefix; a non-direct route must beat direct farming materially.
- Proficiency requirement auto-derives for base level ≥ 42 from the verified anchor; a displayed value overrides it.