# Douluo - Turn-Based Grid RPG

A tactical turn-based RPG with hero management, skill progression, and grid-based combat.

## Features

- **Turn-Based Combat**: SPD-based turn order, 4 damage types (Pierce, Blunt, Slash, Mental)
- **Character Progression**: 9-tier system with Potential-based advancement
- **Skill Graph**: Interconnected skill acquisition with tier requirements
- **Grid Maps**: Tactical positioning with terrain effects
- **Event System**: Dynamic character progression through events and training
- **Item System**: Equipment (3 slots), consumables, inventory management
- **Loot Drops**: LCK-based probability, automatic post-combat rewards
- **Cross-Platform**: Runs on Windows and Linux (tested on Arch-based distros)

## Installation

### Requirements
- Python 3.8+
- pygame 2.5.2

### Windows
```powershell
# Install dependencies
py -m pip install -r requirements.txt

# Run the game (using run script)
.\run.ps1

# Or directly
py main.py
```

### Linux (Arch-based)
```bash
# Install dependencies
pip install -r requirements.txt

# Or using system package manager
sudo pacman -S python-pygame

# Run the game (using run script)
chmod +x run.sh
./run.sh

# Or directly
python main.py
```

## Project Structure

```
Douluo/
├── main.py                  # Entry point with Pygame UI
├── requirements.txt         # Python dependencies
├── config/
│   └── game_config.json    # Game configuration
├── src/
│   ├── models/
│   │   ├── character.py    # Character stats, tier, potential
│   │   ├── skill.py        # Skill graph and effects
│   │   ├── map.py          # Grid maps with terrain
│   │   └── event.py        # Events and training
│   ├── combat/
│   │   └── engine.py       # Turn-based combat engine
│   └── data/
│       └── data_manager.py # JSON import/export
├── assets/
│   ├── characters/         # Character definitions
│   ├── skills/             # Skill definitions
│   ├── maps/               # Map layouts
│   ├── events/             # Event definitions
│   └── trainings/          # Training definitions
└── prompts/
    ├── basePromptTemplate.prompts.md
    └── requirementPrompts.prompt.md
```

## Controls

- **Left Click**: Select character
- **Right Click**: Action menu / End turn
- **SPACE**: Next turn
- **H**: Use health potion on selected character
- **I**: Show inventory (console)
- **Arrow Keys**: Move camera
- **ESC**: Quit

## Core Systems

### Character Stats
- **STR**: Physical power / melee scaling
- **DEX**: Agility, accuracy, crit chance
- **INT**: Magical power / spell scaling
- **WIS**: Resistance, insight
- **CHA**: Social influence
- **LCK**: Random outcome bias
- **END**: Physical mitigation
- **SPD**: Turn order
- **HP/MP**: Health and mana pools
- **PT (Potential)**: Progression gate

### Tier System
1. Common
2. Uncommon
3. Rare
4. Renowned
5. Heroic
6. Epic
7. Legendary
8. Mythical
9. Transcendence

Special tiers: God (negative), Eldritch (complex)

### Damage Types
- **Pierce**: Mitigated by END
- **Blunt**: Mitigated by END
- **Slash**: Mitigated by END
- **Mental**: Mitigated by WIS

### Skill Acquisition
- Requires character tier ≥ skill tier
- Must own at least one linked prerequisite skill
- Base skill "Life" (Tier 0) available to all

### Item System

**Equipment** (Max 3 per character):
- Provides permanent stat bonuses while equipped
- Examples: Iron Sword (+3 STR), Mystic Staff (+5 INT, +15 MP)
- Can be equipped/unequipped freely

**Consumables**:
- **Health/Mana Potions**: Restore HP/MP in or out of combat
- **Stat Boosters**: Temporary buffs (e.g., +5 STR for 3 turns)
- **Tier Advancement Items**: Grant Potential toward next tier
  - Spirit Essence: +5 Potential
  - Breakthrough Pill: +15 Potential (helps tier advancement)
- **Antidote**: Removes all debuffs

**Loot Drops**:
- Triggered automatically after combat victory
- Drop chance modified by party's average LCK stat
- Different enemy types have different loot tables
- Boss enemies drop rare equipment and tier advancement items

**Inventory**:
- Shared party inventory (100 slots)
- Stackable items (potions, materials) up to 99
- Equipment is unique (non-stackable)

## MVP Success Criteria

✅ 1. Load a battle map and deploy 2 allies vs 2 enemies  
✅ 2. Perform one full round with correct turn sequencing  
✅ 3. Use at least one active skill and apply damage  
✅ 4. Acquire a new skill via graph linkage validation  
✅ 5. Advance a character tier after meeting conditions  
✅ 6. Record Change Log entries  
✅ 7. Run on Linux Arch-based system (cross-platform compatible)

## Development

### Adding New Content

**Characters** (`assets/characters/*.json`):
```json
{
  "characters": [
    {
      "id": "char_id",
      "name": "Character Name",
      "tier": 1,
      "potential": 10,
      "stats": { "STR": 10, ... },
      "tags": ["warrior", "human"],
      "skills": ["life"],
      "is_ally": true
    }
  ]
}
```

**Skills** (`assets/skills/*.json`):
```json
{
  "skills": [
    {
      "id": "skill_id",
      "name": "Skill Name",
      "tier": 1,
      "type": "active",
      "links": ["prerequisite_skill"],
      "costs": { "mp": 5 },
      "range": { "min": 0, "max": 1, "pattern": "single" },
      "effects": [
        {
          "kind": "damage",
          "params": {
            "amount": 20,
            "damage_type": "Pierce",
            "scaling": "STR"
          }
        }
      ]
    }
  ]
}
```

## Requirements Checklist

1. ✅ Character stat model with modifiers
2. ✅ Tier advancement with Potential thresholds
3. ✅ Skill graph with acquisition validation
4. ✅ 4 damage types with mitigation
5. ✅ Grid map loader
6. ✅ Token interaction (left/right click)
7. ✅ Turn order recalculation (SPD-based)
8. ✅ Buff/Debuff duration management
9. ✅ Event/Training framework
10. ✅ Creation/Management (JSON import/export)
11. ✅ Non-web runtime (Pygame, Linux compatible)
12. ✅ Change Log tracking

## License

This project is provided as-is for educational and development purposes.

## Change Log

See `prompts/requirementPrompts.prompt.md` for full change log.
