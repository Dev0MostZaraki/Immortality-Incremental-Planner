# Mechanics Verification & Simulation Roadmap

This document is the internal source of truth for progression mechanics used by the planner.

## Rule for production logic

A mechanic may affect production calculations only after its formula has been reproduced numerically from measured game values and passes deterministic tests.

The public UI should show calculated results, not uncertainty labels, community/source labels, screenshot references, inferred formulas, or developer diagnostics.

Unverified candidate models stay documented here and must not affect production ETA/recommendations.

---

## 1. Verified mechanics

### Muscle Training

Production model:
- First purchase cost: 1,000 Endurance
- Maximum level: 150
- Cost progression is deterministic by level
- Gain progression is deterministic by purchase
- Current displayed next cost, when supplied by the player, is used as the anchor for the next purchase and future projection
- Unit changes are formatting only; calculations use normalized values

Validation points already covered by deterministic tests:
- Level 59 next cost is consistent with 10.26 Sx
- Level 60 next cost is consistent with 21.54 Sx
- A displayed next cost must remain unchanged for projection row +1
- Future rows use full internal precision
- Suffix crossing such as 800 Sx/s to 1.12 Sp/s is handled by normalized values

Planner rule:
- A purchase path must stop when the next required purchase cost is above the target Endurance. A purchase that can only be afforded after the target is already reached cannot improve ETA to that target.

### Proficiency multiplier

Let:
- B = base Proficiency level
- A = added/bonus Proficiency level
- E = effective Proficiency = B + A

Verified displayed sequence:
- 42 (+7) -> E = 49 -> 1.15^49 = 942.310818... -> displayed x942.31
- next effective level 50 -> 1.15^50 = 1083.657441... -> displayed x1083.66
- after base level-up 43 (+7) -> E = 50 -> current x1083.66
- next effective level 51 -> 1.15^51 = 1246.206057... -> displayed x1246.21

Production-safe formula:
- effective Proficiency = base level + bonus level
- displayed Proficiency multiplier = 1.15 ^ effective Proficiency
- one effective Proficiency level increases the multiplier by exactly x1.15

Important simulator implication:
- The current Endurance Gain entered from the game already includes the current Proficiency multiplier.
- Future Proficiency level-ups should therefore scale the current Gain by x1.15 per future level-up; the simulator must not multiply the current Gain by the full absolute Proficiency multiplier again.

---

## 2. Candidate Proficiency timing model — NOT production-ready

Measured requirements:
- base Proficiency 42 -> 43: 3,731 XP
- base Proficiency 43 -> 44: 4,291 XP

Numerical relation:
- 3,731 x 1.15 = 4,290.65
- displayed next requirement = 4,291

Candidate recurrence:
- next requirement may be the previous requirement scaled by x1.15 and converted to an integer

This is not yet used in production because one transition is not enough to determine the exact integer rule (round / ceil / hidden full-precision value).

Candidate XP rate:
- +1 Proficiency XP per second while Endurance training is active

This must be measured with timed runs before it affects ETA.

### Data needed to verify Proficiency timing

Minimum:
1. Two timed XP runs with no Proficiency level-up during the run
   - start XP
   - end XP
   - exact elapsed seconds
   - training active for the full interval
2. At least two more consecutive XP requirements
   - requirement 44 -> 45
   - requirement 45 -> 46
   - ideally one higher-level requirement as a cross-check
3. One complete level-up capture
   - XP immediately before level-up
   - new level
   - new requirement
   - current Endurance Gain immediately before/after

Once the rate and requirement recurrence are exact, Proficiency can be integrated into dynamic ETA independently of Strength.

---

## 3. Strength / Increase — unresolved core model

We still need to determine:
- Strength growth as a function of time
- relationship between Strength and displayed Next Gain
- exact meaning of Next Gain after pressing Increase
- whether Current Gain after Increase equals the previously displayed Next Gain
- any dependence on Proficiency, Perseverance, Muscle Training, or other progression stages

### Required Strength measurement run

Keep all other progression state unchanged if possible.

Record at:
- t = 0
- +30 s
- +60 s
- +120 s
- +300 s
- +600 s when practical

At every point record:
- Strength
- Current Endurance Gain/s
- Next Gain
- current Endurance
- base Proficiency level
- bonus Proficiency level
- Proficiency XP / requirement
- Muscle Training level
- Perseverance stage

Preferred experiment:
1. Capture state immediately before an Increase
2. Press Increase
3. Capture state immediately after
4. Continue recording Strength and Next Gain from the reset state
5. Later perform one more Increase at a known Strength value

This lets us separately fit:
- time -> Strength
- Strength -> Next Gain
- Next Gain before Increase -> Current Gain after Increase

Do not build a Strength-aware ETA until these relations are numerically reproducible.

---

## 4. Perseverance integration

Perseverance should use:
- automatic stage detection from verified thresholds when possible
- visible detected stage
- optional manual stage override

The auto-detected stage must never be based only on a heuristic such as the suffix currently displayed.

Before Perseverance affects the unified route simulator, verify:
- exact stage thresholds
- exact stage effect(s)
- whether those effects apply to Strength growth, Endurance Gain, Increase outcome, or another layer

Existing planner data may be reused only after it is checked against the current game version.

---

## 5. Recommended implementation order

### Phase A — documentation and measurement now

Do not add more speculative inputs to the public page.

Complete:
- Proficiency XP timing verification
- Proficiency requirement recurrence verification
- Strength measurement run
- Increase before/after validation
- Perseverance data audit

### Phase B — Proficiency-aware ETA

Implement Proficiency before Strength once the timing formula is exact.

Reason:
- Proficiency is an independent timed event
- the current Gain already contains the current multiplier
- each future verified Proficiency level-up can be represented as a discrete x1.15 Gain step
- this immediately improves long-duration ETA without needing the Strength model

Simulator loop:
1. calculate time to target at current Gain
2. calculate time to next Proficiency level
3. if target occurs first -> finish
4. otherwise farm until Proficiency level-up
5. increase Gain by x1.15
6. update XP requirement
7. repeat

Public UI additions should be minimal:
- Proficiency base level
- bonus level
- current XP
- current XP requirement
Everything else is calculated.

### Phase C — Strength + Increase route simulation

After Strength is verified, add event-driven comparison:
- continue farming
- wait for a better Increase
- Increase now
- Muscle Training purchase(s)
- combinations in valid order

The output should remain player-first:
- Best Next Move
- next action time
- route to target
- total ETA
- time saved against baseline

No raw formulas in the public UI.

### Phase D — Perseverance-aware unified simulator

Once Perseverance effects are exact, add it as another verified state layer.

Final route engine can then simulate:
- current Endurance farming
- timed Proficiency level-ups
- Strength growth
- Increase resets
- Muscle Training purchases
- Perseverance effects
- target completion

---

## 6. Event-driven simulator architecture

Avoid simulating every second when an exact event boundary can be computed.

State:
- time
- Endurance
- Endurance Gain
- Strength
- Next Gain
- Muscle Training level
- Proficiency base level
- Proficiency bonus level
- Proficiency XP
- Proficiency requirement
- Perseverance stage

Events:
- target reached
- Muscle Training becomes affordable
- Proficiency level-up
- chosen Increase point
- Perseverance transition when applicable

For each candidate route:
1. advance directly to the next relevant event
2. update state exactly
3. branch only at meaningful player decisions
4. prune any route that cannot beat the current best ETA
5. never recommend a purchase whose affordability occurs at or after target completion

This produces accurate results without a slow per-second simulation.

---

## 7. Public UI policy

The public page should present only:
- player inputs
- deterministic calculated values
- recommendations produced by verified formulas

Do not display:
- community-confirmed labels
- screenshot references
- "we do not know" messages
- model confidence percentages
- hidden multipliers/formulas unless intentionally added to technical documentation
- experimental mechanics

If a mechanic is not verified, it is simply not part of the production recommendation yet.

The public UI may use neutral wording such as:
- "Proficiency"
- "Next Proficiency"
- "Time to next level"
- "Projected Gain"
- "Best Next Move"

Internal verification status belongs only in project documentation/tests.

---

## 8. Next data collection checklist

### Proficiency
- [ ] timed XP run #1
- [ ] timed XP run #2
- [ ] requirement 44 -> 45
- [ ] requirement 45 -> 46
- [ ] one higher-level requirement cross-check
- [ ] full level-up before/after Gain capture

### Strength / Increase
- [ ] immediate state before Increase
- [ ] immediate state after Increase
- [ ] Strength + Next Gain at 0 / 30 / 60 / 120 / 300 seconds
- [ ] optional 600-second point
- [ ] second Increase validation

### Perseverance
- [ ] current stage threshold table audit
- [ ] stage effects audit
- [ ] auto-detection rule verification
