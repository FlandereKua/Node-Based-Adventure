# Alicia — Shifting Moon (Secret Character)

## Character Profile
Alicia - Shifting Moon
*   Description: A white-haired orphan from Arken’s outer border who clings to her family sword. Withdrawn and hollow at first glance, but a steady ember of wrath and resolve glows beneath the quiet. She measures every word, acts with purpose, and refuses to forget.
*   Tier: 2
*   Notable Nodes:
    *   `[Quarter Moon - Unique]`: Alicia’s strikes carry bonus magic damage that pierces resistances and brands foes with a lunar malediction.
        *   Caution: Unique Node can evolve; see Evolution for paths to `[Half-Moon - Unique]` and then either `[Blood Moon - Unique]` or `[Full Moon - Unique]`.
    *   `[Moonlit Footwork - Tier 1]`: Subtle stance shifts grant short bursts of evasive speed after casting.
    *   `[Lunar Veil - Tier 1]`: Veil of cool light grants brief resistance to hostile magic and muffles her silhouette.
*   Role in Party: Magic Striker
*   Secondary Role: Support (resistance shaving and ally amplification)
*   Recruitment Archetype: Investigation → Protection Escort → Trial by Resolve
*   Learnable Nodes (Optional): `[Focus Breath - Tier 1]`, `[Blade Cleaning - Tier 1]`

---

## Unique Node — Evolution
Define the evolution of Alicia’s moon aspect. The branching depends on choices, restraint, and timing.

- Base Form
  - `[Quarter Moon - Unique]`: Her attacks gain bonus magic damage that penetrates 50% of enemy resistance and apply `[Lunar Curse - Tier 1]`.
  - `[Lunar Curse - Tier 1]`: All magic damage the enemy receives is amplified by 20%. Cannot be removed.
  - Triggers/Costs: Recruit Alicia and complete her first oath (see Quest B). Exerts steady willpower drain during extended fights.
  - Limitations: Curse applies to a limited number of targets simultaneously; reapplication refreshes but does not stack.

- Evolution I — `[Half-Moon - Unique]`
  - New Effect: Increased curse potency on the primary target; lunar afterimages extend reach on the opening strike. Allies striking a cursed foe gain a small boon.
  - Trigger: Conclude Quest C without killing any surrendering foes and by shielding a bystander from harm.
  - Cost/Tradeoff: Requires a brief focusing stance after each full-moon cycle; if interrupted, next cast is delayed.

- Evolution II — Branching Outcome
  - Path A: `[Blood Moon - Unique]`
    - Variant: Controlled Wrath (Recruitable)
      - Effect: Devastating strikes ignore defenses and splinter into bleed-like lunar fragments that inflict detriments on nearby foes.
      - Trigger: Lethal resolution against the instigator while preventing collateral harm and with Blood Flags below threshold (see Failure Conditions).
      - Cost/Tradeoff: Alicia’s defenses are reduced; sustained focus fire is dangerous.
    - Variant: Bad End — Madness (Irredeemable Boss)
      - Effect: As above, amplified; Alicia rejects restraint and hunts all connected to her family’s death.
      - Trigger: Blood Flags ≥ threshold OR two or more incidents of killing surrendering foes OR killing the fence in Quest C plus a lethal Final.
      - Outcome: Alicia becomes a Tier 5 Boss. No redemption route. See Bandit-Camp Encounter Rules.
  - Path B: `[Full Moon - Unique]` (Default / Deadline-Failure Variant)
    - Effect: Balanced surge—moderate damage increase, improved defense/resistance, and supportive lunar techniques that stabilize allies and suppress enemy boons.
    - Trigger (Default): Non-lethal resolution at the waystation with evidence submission and protection of bystanders.
    - Trigger (Deadline-Failure): If the clergy removes Alicia before recruitment, she is later recruitable only after the player has pledged loyalty to the Church faction; recruitment occurs at Emle Holy Temple.
    - Outcome: Default recruit at Tier 2; Deadline-Failure recruit enters at Tier 5 with `[Full Moon - Unique]` unlocked.

Notes
- Each evolution should open distinct party lines: Blood favors burst elimination; Full favors team endurance/control.
- The Madness variant is a hard failure branch; it supersedes other outcomes.

---

## Chain Quest (Objective View)
A four-step sequence with explicit triggers, conditions, and flags. Favor ranges from 0–3. Blood Flags track wrath (0–3).

### Quest A — Ashes at the Edge
- Location: Arken Town (Outer Border)
- Trigger: Enter outer border at dusk OR learn rumor of a white-haired girl with a moon-guard blade.
- Objectives:
  - Provide practical aid (food, oil, scarf) and wait quietly (≥60s real-time) without forcing dialogue.
  - Request permission before handling the sword; one respectful question allowed.
- Success Conditions:
  - Aid delivered and quiet kept; permission obtained before examination.
- Rewards: Favor +1; unlock lead: Bandit Banner.
- Failure Conditions:
  - Press trauma topics; handle blade without consent; threaten. Cooldown: 1 in-game day.
- Penalties: Favor −1; townsfolk become guarded.

### Quest B — Banner in the Brambles
- Location: Harken Forest trail → Brown Wolf fringe
- Trigger: Possess Bandit Banner lead.
- Objectives:
  - Retrieve Scorched Banner and Signet Rivet evidence.
  - Do not kill surrendering scouts.
- Success Conditions:
  - Both evidence items secured; zero executions of surrendering targets.
- Rewards: Favor +1; set Restraint Flag; reveal Fence in Spiregate.
- Failure Conditions:
  - Kill surrendering foes OR excessive brutality.
- Penalties: Blood Flag +1; increased patrol density in fringe areas.

### Quest C — Smoke Under the Grates
- Location: Spiregate Sewer access
- Trigger: Hold both evidence items from Quest B.
- Objectives:
  - Keep Alicia above 50% endurance through two junctions.
  - Interrupt exchange; recover Ledger Page; keep the fence alive.
- Success Conditions:
  - Alicia ≥50% endurance; Ledger Page acquired; fence spared.
- Rewards: Favor +1; unlock Evolution I `[Half-Moon - Unique]` condition; reveal instigator.
- Failure Conditions:
  - Alicia <50% endurance OR fence killed OR ledger lost.
- Penalties: Blood Flag +1; increased goblin interference in sewers.

### Quest Final — Moon Over the Gallows
- Location: Arken Road Waystation (Timed Event)
- Trigger: Complete Quest C; event starts on approach; clergy caravan ETA timer begins.
- Objectives:
  - Neutralize instigator; protect bystanders; present evidence to clergy.
- Outcome Mapping:
  - Default Recruit (Full Path): Instigator neutralized (non-lethal or compelled surrender); zero bystander casualties; evidence submitted before timer ends → `[Full Moon - Unique]` unlocked. Tier 2.
  - Blood Path (Recruitable): Instigator killed during a lethal escape attempt; bystanders protected; Blood Flags ≤1 → `[Blood Moon - Unique]` unlocked. Tier 2.
  - Deadline Failure (Church Custody): Timer expires with Alicia un-recruited → Alicia taken to Emle Holy Temple. Later recruit possible only if Church Pledge is active; Alicia joins at Tier 5 with `[Full Moon - Unique]` preset.
  - Bad End — Madness: Any of the following: Blood Flags ≥2, plus lethal Final OR prior fence kill; or ≥2 incidents of executing surrendering foes. Alicia departs. See Boss rules.

---

## Failure Conditions and World Outcomes
- Clergy Deadline: If missed, Alicia becomes unavailable until Emle Holy Temple. Recruitment there requires Church Faction Pledge; she joins at Tier 5 (Full Moon).
- Blood Flag Thresholds:
  - 0–1: Eligible for Recruitable Blood or Full outcomes.
  - ≥2: Locks Bad End — Madness if Final is lethal or fence was killed.
- Favor Loss: At Favor 0, Alicia refuses further steps until a cooldown day passes and a restorative gesture is made (does not remove Blood Flags).

Bad End — Madness (World Boss)
- Status: Irredeemable. No redemption or recruitment route.
- Tier: 5 (Boss).
- Spawn Rule: Random encounter roll each time a new Bandit Camp is entered (including story camps). Increased chance on camps linked to the original crime.
- Encounter Notes: Alicia employs `[Blood Moon - Unique]` aspects with aggressive pursuit; expects fire/holy counters.

Removed Outcomes
- No redemption path from the Madness branch.

---

## Integration Notes (Designer)
- Balance Target: Tier 2 recruit baseline; Tier 5 variant for Church-route Full Moon; Tier 5 Boss for Madness.
- Documentation: Record `[Quarter Moon - Unique]`, `[Lunar Curse - Tier 1]`, `[Half-Moon - Unique]`, `[Blood Moon - Unique]`, `[Full Moon - Unique]` in `Node/Node Effect List.md` under Secret Characters, noting Tier-5 variants and boss usage.
- Cross-Zone Links: Arken Town (outer border), Harken Forest, Brown Wolf Camp fringe, Spiregate Sewer access, Arken Road waystation.
- Encounter Tuning: Provide non-lethal resolutions that are still challenging. Reward protection and restraint with the Full path.
- Narrative: Keep Alicia’s voice sparse; let choices and actions carry weight.
