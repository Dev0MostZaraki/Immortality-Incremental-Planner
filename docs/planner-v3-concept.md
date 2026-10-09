# Planner v3 — Player-First Progression Route Concept

## Objective

Turn the Endurance side of the site from a collection of calculators into one progression planner that answers:

1. What should I do next?
2. Why is that the best action?
3. What is my realistic time to the target?
4. What will happen along the way?

Only mechanics that are numerically verified and covered by deterministic tests may affect production recommendations.

The public UI shows player inputs, calculated results and recommendations. Verification notes, formulas, model confidence and source/evidence details remain internal.

---

## 1. Primary information architecture

Keep the top-level product switch:

- Endurance Planner
- Law Synthesis

Rebuild Endurance Planner around three views:

### Plan
The default view and the main product.

Contains:
- Current State
- Target
- Proficiency
- Best Next Move
- Route Timeline
- Dynamic ETA
- compact alternatives

### Muscle Training
A focused detail view for the Muscle Training portion of the same shared plan.

Contains:
- current Muscle Training level
- optional displayed next game cost
- global optimum
- read-only level journey
- detailed comparison around the optimum

### More Tools
Secondary utilities only:
- Increase comparison until Strength is fully integrated
- Generic Upgrade
- Milestones
- Reset / Perseverance tools
- What-if
- advanced generic path if retained

No shared values are duplicated between views.

---

## 2. Plan view

### A. Current State

One compact input card.

Primary shared inputs:
- Current Endurance
- Current Gain / second
- Target Endurance

Progression inputs:
- Muscle Training level
- Proficiency base level
- Proficiency bonus level
- current Proficiency XP

Proficiency XP requirement:
- auto-derived where the verified recurrence/range permits
- optional “use displayed requirement” correction when needed
- never expose the recurrence formula in normal UI

Optional:
- Next Gain, until Strength/Increase is fully modeled

Do not ask for internal multipliers, model constants, XP rate, cost growth or gain growth.

### B. Best Next Move

Largest card on the page.

Examples:
- Buy Muscle Training Lv. 61 now
- Farm 18m 49s, then buy Lv. 61
- Keep farming directly to the target
- Increase now
- Later, when Strength is verified: train Strength for X, then Increase

Outputs:
- next action
- when to perform it
- target ETA
- finish time
- time saved vs direct farming
- projected Gain after the recommended route
- number of Proficiency level-ups expected before target

This card is the final answer. Other sections explain it.

### C. Route Timeline

Chronological event list rather than a spreadsheet.

Example:

Now
→ 18m 49s — Muscle Training Lv. 61
→ 32m 19s — Proficiency Lv. 44
→ 47m 04s — Muscle Training Lv. 62
→ 1h 21m — Proficiency Lv. 45
→ …
→ 2d 08h — Target reached

Each event can show:
- event name
- elapsed time
- Endurance after event
- Gain after event

Later Strength / Increase and Perseverance events slot into the same timeline without redesigning the page.

### D. Dynamic ETA summary

Show:
- realistic ETA
- finish time
- current Gain
- projected final Gain
- Proficiency levels before target
- optional static ETA comparison in a small secondary line

Current per-minute/hour/day stats remain “at current Gain”, not presented as future constant production.

---

## 3. Proficiency integration

Verified production behavior:
- Proficiency XP advances by 1 per second during Endurance training
- future requirement = integer-rounded previous requirement progression
- each future base Proficiency level-up increases the then-current Endurance Gain
- current Gain already includes current Proficiency, so the absolute multiplier is never re-applied

Player-facing inputs:
- base level
- bonus level
- current XP
- requirement only when it cannot safely be derived or the player chooses to override with the displayed requirement

Player-facing outputs:
- next Proficiency level
- time to next level
- Gain after next level
- expected number of level-ups before target

No public formulas.

---

## 4. Muscle Training optimizer — global search, not display-limited search

### Critical rule

The optimizer must never use the visible row count as its calculation horizon.

The current 3 / 5 / 10 selector is a presentation control only.

The global optimizer must evaluate every reachable future Muscle Training prefix until a mathematically safe stop condition is met.

Safe stop conditions:
1. Muscle Training reaches max level 150.
2. The next purchase cannot be reached before the target under the current route.
3. The next purchase cost is at or above the target value and therefore cannot improve time to first reach that target.
4. Any additional route branch is provably unable to beat the current best ETA.

Because the level cap is only 150, exhaustive evaluation of all reachable prefixes is cheap and preferable to an arbitrary +10 limit.

### Consequence

If current level is 60 and the global optimum is level 73:
- Best Plan must say 60 → 73 immediately.
- It must not incorrectly mark Lv. 70 best just because only ten rows are visible.

### Read-only Level Journey

Do not show all 90 possible rows by default.

Default view should show:
- Buy none baseline
- next 3 immediate levels
- the recommended level
- one level before recommended
- one or two levels after recommended when valid

If the recommendation is far away, collapse the middle:

Lv. 61
Lv. 62
Lv. 63
…
Lv. 71
Lv. 72
Lv. 73 — Best
Lv. 74

Actions:
- Show route to recommended level
- Show all candidates

No editable rows, unit selectors, reorder controls or delete controls.

### Candidate row values

For every candidate stop:
- level
- cumulative cost paid
- next purchase cost when useful
- Gain after purchases
- time until that stop is completed
- total ETA to target if stopping there
- time saved/lost vs no purchase

All values use the same Proficiency-aware event engine.

---

## 5. Unified event-driven simulation engine

The route engine should be shared by Plan and Muscle Training.

State:
- elapsed time
- Endurance
- Endurance Gain
- target
- Muscle Training level
- Proficiency base level
- Proficiency bonus level
- Proficiency XP
- Proficiency requirement
- optional Next Gain
- later: Strength
- later: Perseverance stage

Verified events today:
- target reached
- Proficiency level-up
- Muscle Training purchase becomes affordable

Future verified events:
- Strength decision point
- Increase
- Perseverance transition/effect

### Simulation principle

Do not tick once per second.

Advance directly to the next event:
- time to target
- time to next Proficiency level
- time to next planned purchase

Whichever occurs first is processed, state is updated, and simulation continues.

This makes long multi-day routes exact and fast.

---

## 6. Global route search

For the current verified feature set, compare at least:

- Direct farm
- 1 Muscle Training purchase then farm
- 2 purchases then farm
- …
- every reachable Muscle Training prefix then farm
- Increase-only when Next Gain is supplied and the current temporary Increase model is enabled
- Increase + reachable Muscle Training prefixes only while Increase semantics remain valid

When Strength is verified, replace the temporary Increase shortcut with real Strength-aware route branches.

### Branch pruning

Prune a branch when:
- target is reached before the next purchase
- the next purchase cannot become affordable before target
- max Muscle Training reached
- mathematically dominated by an already-known route at the same equivalent state

Never prune simply because a UI display limit was reached.

---

## 7. Fix for the current “10 levels” problem

Current problem:
- current level + visible horizon is also used as the optimization horizon
- selecting 10 can produce a false “Best Plan” at the tenth row
- a later run starting from a higher current level can reveal that the real optimum was farther away

Required correction:
- split calculation horizon from display horizon
- calculation horizon = all reachable valid levels
- display horizon = only how much detail the user wants to see
- Best Plan always uses global calculation result

The 3 / 5 / 10 control should either:
1. become “Detail: Compact / Normal / Extended”, or
2. be removed in favor of automatic rows around the global optimum

Preferred option: automatic rows around the optimum.

---

## 8. Visual hierarchy

### Desktop

Top:
- shared Current State / Target on left
- Best Next Move on right

Middle:
- Route Timeline full width
- Dynamic ETA metrics

Bottom:
- compact alternatives
- links to Muscle Training detail / More Tools

Use the existing ~1600px max shell.

### Mobile

Order:
1. Current State
2. Best Next Move
3. ETA
4. Timeline
5. alternatives

No wide tables. Muscle Training level candidates become stacked cards.

### Ultrawide

Do not stretch text endlessly.
Use extra width for:
- state + recommendation side-by-side
- timeline with more columns
- compact comparison metrics

Keep readable line lengths.

---

## 9. Public copy policy

Production UI should not mention:
- community confirmation
- screenshots
- confidence scores
- “unknown”
- formulas
- internal multipliers
- validation evidence

If a mechanic is verified, present its result as normal calculator behavior.

If a mechanic is not verified, do not use it in production recommendations.

Technical details stay in:
- internal docs
- code comments
- deterministic tests

---

## 10. Strength integration later

Do not redesign the UI again when Strength is ready.

Add Strength to Current State:
- current Strength
- Strength gain/rate inputs only if genuinely required by the verified formula

Add route events:
- Strength threshold/decision
- Increase

The Best Next Move can then produce:
- Train Strength for X
- Increase now
- Wait until Y Strength then Increase
- Buy Muscle Training first
- Continue farming

Same timeline, same route engine.

---

## 11. Perseverance later

Use automatic stage detection only after thresholds/effects are verified.

UI pattern:
- detected stage shown compactly
- optional override dropdown

Perseverance affects the shared simulator internally; it should not become another separate calculator.

---

## 12. Implementation priority

### Phase 1 — simulation foundation
- finish Proficiency-aware event engine
- make Muscle Training use it
- add global reachable-prefix optimizer
- remove all dependency between optimization horizon and visible row count
- add target-cost/target-before-purchase pruning

### Phase 2 — Plan view
- replace calculator-only landing experience with Current State + Best Next Move
- add dynamic ETA summary
- add Route Timeline
- keep Calculator fields available in the same Plan view

### Phase 3 — Muscle Training detail
- auto-window rows around global optimum
- remove 3/5/10 as an optimization control
- add “show full route/candidates” only as presentation

### Phase 4 — More Tools cleanup
- ensure generic tools never duplicate the main route recommendation
- keep them collapsed and secondary

### Phase 5 — Strength / Increase
- implement only after numerical verification
- add to the existing event engine and route search, not as a separate calculator

### Phase 6 — Perseverance
- integrate verified stage logic into the same state/event model

---

## 13. Required regression tests

Global Muscle Training optimization:
- optimum within next 3
- optimum within next 10
- optimum beyond next 10
- current 60 with an optimum such as 73 must still return 73 regardless of display detail
- purchase cost above target pruned
- purchase becomes affordable after target pruned
- max level 150 safe

Proficiency:
- level-up before purchase
- multiple level-ups while waiting
- level-up after purchase
- multiple level-ups before target
- exact event-time tie handling

UI:
- changing visible detail never changes Best Plan
- collapsed middle rows still include recommended level
- no false “best” label on last visible row
- mobile route cards
- DE/EN
- persistence and backup
