# {{Zone Name}} (Tier {Zone Difficulty}) (Enemy Zone)

How to use
- Tierless template. Do not write numeric tiers in names. Use role-based Tier below.
- Assign enemies a role (Basic, Elite, Boss) and scale their difficulty relative to the zone’s intended challenge.
- Keep node names in [Square Case] and include Acquisition/Mitigation where relevant.

---

## Overview
2–4 sentences on terrain, mood, traversal risks, and why players come here.
- Biome: Forest, Marsh, Ruins, Mountains, etc.
- Hooks: Starting nodes, rare resources, unique enemies.
- Navigation: Trails, waterways, landmarks.

---

## Monsters
List 2–4 enemy types with role, description, notable nodes, and acquisition.

### {{Monster A}}
*   **Role**: Basic | Elite | Boss
*   **Description**: Distinguishing behavior and threat.
*   **Tier**: Basic ≥ {Zone Difficulty} − 2; Elite ≥ {Zone Difficulty} − 1; Boss ≥ {Zone Difficulty} (optionally +1 for apex threats).
*   **Notable Nodes**:
      *   `[{{Attack/Skill}}]`: Effect.
      *   **Acquisition** Defeat/observe/recreate trigger (match role; e.g., Basic node ≈ zone − 2).
      *   `[{{Passive/Tactic}}]`: Effect.
      *   **Acquisition** Defeat elite/observe behavior N times without detection (≈ zone − 1).

### {{Monster B}}
*   **Role**: …
*   **Description**: …
*   **Tier**: …
*   **Notable Nodes**:
      *   `[{{Skill}}]`: Effect.
      *   **Acquisition** …

---
**Note**: Some enemy zones won’t have Fauna or Flora (e.g., human settlements, enemy camps like Brown Wolf Camp).

## Fauna (Non-Hostile Wildlife) (Optional)
Add 1–3 with gentle node rewards for exploration or patience.

### {{Fauna A}}
*   **Description**: Flavor + behavior.
*   **Tier**: Non-combat rewards trend toward zone difficulty − 2; rarities may reach − 0.
*   **Notable Nodes**:
      *   `[{{Passive/Utility}}]`: Effect.
      *   **Acquisition** Non-combat action (catch, mimic, observe).

---

## Flora (Plants & Fungi) (Optional)
Add 3–6 resource nodes; emphasize gathering conditions.

### {{Plant A}}
*   **Description**: Habitat + visual cue.
*   **Tier**: Knowledge/recipe nodes trend toward zone difficulty − 1; rarities may reach − 0.
*   **Notable Nodes**:
      *   `[{{Recipe/Knowledge}}]`: Effect.
      *   **Acquisition** Harvest with timing/tool/prereq node.

---

## Detriments & Situational Nodes
Local negatives that encourage prep and environmental play.
    *   `[{{Terrain Penalty}}]`: Effect.
    *   **Acquisition** Condition.
    *   **Mitigation**: Clear, thematic counterplay (often available in adjacent towns).
    *   `[{{Ambient Irritant}}]`: Effect.
    *   **Acquisition** …
    *   **Mitigation**: …

Example (from Harken Forest)
    *   [Forest Muck], [Pollen Irritation], [Buzzing Harried]

---

## Recruitable Characters (Optional)
Provide up to 3 with role clarity and learnables.

### {{Name, Role}}
*   **Description**: Personality + motive.
- Power Target: Typically around zone difficulty − 1 to zone for wilderness; adjust per narrative.
*   **Notable Nodes**:
      *   `[{{Skill}}]
      *   `[{{Skill}}]
*   **Recruitment Method**: How to recruit.
*   **Learnable Nodes**: [{{Skill A}}], [{{Skill B}}]

---

## Integration Notes (Designer)
  - Role-based Tier (tierless):
  - Enemies: Basic ≥ zone − 2; Elite ≥ zone − 1; Boss ≥ zone (optionally +1 for apex).
  - Nodes: Basic/knowledge ≈ zone − 2; tactical/elite ≈ zone − 1; boss/unique ≈ zone to zone +1.
  - Detriments: Baseline intensity ≈ zone − 2; escalate in hazardous sub-biomes.
- Provide at least one alternate acquisition path for knowledge nodes when possible.
- Ensure detriments have 2–3 mitigations discoverable in nearby towns.
- Cross-link to adjacent towns or hubs for services (repairs, cures, auctions).
