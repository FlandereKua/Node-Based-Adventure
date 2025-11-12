# Quick Start Guide - Douluo RPG

## Installation

1. **Install Python** (3.8 or higher)
   - Windows: Download from python.org
   - Linux: Usually pre-installed, or `sudo pacman -S python`

2. **Install Pygame**
   ```powershell
   # Windows
   py -m pip install pygame

   # Linux
   pip install pygame
   # or
   sudo pacman -S python-pygame
   ```

3. **Run the Game**
   ```powershell
   # Windows
   cd d:\Sovern\Douluo
   py main.py

   # Or use the run script
   .\run.ps1
   ```

   ```bash
   # Linux
   cd /path/to/Douluo
   python main.py

   # Or use the run script
   chmod +x run.sh
   ./run.sh
   ```

## Game Controls

### Keyboard
- **SPACE** - Advance to next turn
- **H** - Use health potion on selected ally
- **I** - Display inventory (console)
- **Arrow Keys** - Move camera
- **ESC** - Quit game

### Mouse
- **Left Click** - Select character (shows stats)
- **Right Click** - End current character's turn

## How to Play

### Starting Combat
1. Game loads with 2 allies vs 2 enemies on the Training Arena map
2. Turn order shown on left (sorted by SPD stat)
3. Current turn highlighted in white

### Taking Actions
1. Click on your character when it's their turn
2. Press **SPACE** to end turn and move to next character
3. Press **H** to use a health potion on selected ally

### Using Items
- **Health Potions** (Start with 5): Press **H** with ally selected
- **View Inventory**: Press **I** to see all items in console
- Items are shared across the party

### Winning Combat
- Defeat all enemies to win
- Loot automatically collected based on party's LCK
- Check console for loot drops

## Understanding Stats

### Core Stats
- **STR** - Physical damage (Pierce, Blunt, Slash)
- **DEX** - Critical chance, accuracy
- **INT** - Magical damage (Mental)
- **WIS** - Magic defense, debuff resistance
- **END** - Physical defense
- **SPD** - Turn order (higher = earlier)
- **HP** - Health points
- **MP** - Mana/skill resource
- **LCK** - Better loot drops, crit chance
- **PT** - Potential (for tier advancement)

### Damage Types
- **Pierce** - Mitigated by END (swords, spears)
- **Blunt** - Mitigated by END (hammers, fists)
- **Slash** - Mitigated by END (axes, claws)
- **Mental** - Mitigated by WIS (psionics, magic)

## Equipment System

### Equipping Items
- Each character has **3 equipment slots**
- Equipment provides permanent stat bonuses
- Examples:
  - **Iron Sword**: +3 STR, +1 DEX
  - **Mystic Staff**: +5 INT, +2 WIS, +15 MP
  - **Ring of Speed**: +3 SPD, +2 DEX

### Starting Equipment
- Characters start without equipment
- Find equipment from loot drops after combat
- Boss enemies drop rare equipment

## Item Types

### Consumables (Usable)
**Healing**:
- Health Potion - Restore 50 HP
- Mega Health Potion - Restore 150 HP (rare drop)
- Mana Potion - Restore 30 MP

**Buffs** (Combat only):
- Elixir of Strength - +5 STR for 3 turns

**Progression** (Non-combat):
- Spirit Essence - +5 Potential
- Breakthrough Pill - +15 Potential (helps tier advancement)

**Utility**:
- Antidote - Removes all debuffs

### Materials
- Dragon Scale, Monster Core (for future crafting)
- Cannot be used directly

### Equipment
- Weapons, Armor, Accessories
- Equip for permanent bonuses
- Non-stackable (unique)

## Loot System

### How Loot Works
1. Defeat enemies in combat
2. System automatically rolls loot tables
3. Party's average LCK increases drop chances
4. Rarer items have lower base drop rates

### Enemy Loot Tables
- **Goblins**: Health potions, monster cores, occasional weapons
- **Orcs**: Better drops, armor, spirit essences
- **Bosses**: Epic equipment, breakthrough pills, dragon scales

### Luck Influence
- Base LCK 10 = neutral
- Each LCK point above 10 improves drop rates
- Amulet of Fortune (+5 LCK) significantly helps

## Progression

### Tier System
1. Common (Tier 1) - Starting
2. Uncommon (Tier 2) - 10+ Potential
3. Rare (Tier 3) - 25+ Potential
4. Renowned (Tier 4) - 40+ Potential
5. Heroic (Tier 5) - 60+ Potential
6. Epic (Tier 6) - 80+ Potential
7. Legendary (Tier 7) - 110+ Potential
8. Mythical (Tier 8) - 140+ Potential
9. Transcendence (Tier 9) - 180+ Potential

### Advancing Tiers
1. Gain Potential through:
   - Combat victories
   - Events
   - Consumable items (Spirit Essence, Breakthrough Pill)
2. Meet Potential threshold for next tier
3. Trigger advancement event (automatic with items)

### Skills
- Start with "Life" (Tier 0 base skill)
- Acquire new skills via skill graph
- Requirements:
  - Character tier ≥ Skill tier
  - Own at least one linked prerequisite skill
- Examples:
  - **Thrust** (T1): Basic pierce attack, links from Life
  - **Triple Thrust** (T2): 3x strikes, links from Thrust or Quick Hand
  - **Mental Blast** (T2): Ranged mental damage

## Character Overview

### Starter Allies

**Valiant** (Warrior)
- Role: Tank/Melee DPS
- High: STR (15), END (14), HP (150)
- Skills: Thrust, Power Strike
- Tags: warrior, human, melee, tank

**Arcana** (Mage)
- Role: Ranged DPS/Healer
- High: INT (16), WIS (14), MP (100)
- Skills: Mental Blast, Minor Heal
- Tags: mage, human, ranged, magic

### Enemy Types

**Goblin Grunt**
- Fast (SPD 12), low health
- Physical attacks
- Drops: Health potions, monster cores

**Orc Warrior**
- High STR (16), END (15)
- Powerful strikes
- Drops: Armor, cores, occasionally spirit essences

## Tips & Strategies

### Combat
1. **Positioning matters** - Use terrain (forests slow movement)
2. **Focus fire** - Eliminate enemies one at a time
3. **Save potions** - Use healing between fights if possible
4. **Watch MP** - Skills cost mana, manage resources

### Progression
1. **Collect Breakthrough Pills** - Speed up tier advancement
2. **Equip high LCK gear** - Better loot = faster progression
3. **Balance party** - Tank + DPS + Support
4. **Hoard rare consumables** - Use for tough fights or tier-ups

### Items
1. **Health potions are plentiful** - Use liberally in combat
2. **Equipment beats consumables** - Permanent > temporary
3. **Save tier items** - Use when close to threshold
4. **Check inventory often** - Press 'I' to see what you have

## Troubleshooting

### Game won't start
- Check Python installed: `py --version`
- Install Pygame: `py -m pip install pygame`
- Run from correct directory

### Low frame rate
- Close other applications
- Map size affects performance (24x16 is optimized)

### No loot drops
- Loot is probability-based
- Increase party LCK for better rates
- Some rolls may drop nothing (bad luck)

## Advanced Features

### Custom Content
- All game data in `assets/` directory (JSON files)
- Edit files to create:
  - New characters
  - Custom skills
  - New maps
  - Unique items
  - Custom loot tables
- Restart game to load changes

### Modding
See JSON files in `assets/` for examples:
- `characters/*.json` - Character definitions
- `skills/*.json` - Skill definitions
- `items/*.json` - Item & loot table definitions
- `maps/*.json` - Map layouts
- `events/*.json` - Progression events

## FAQ

**Q: How do I equip items?**  
A: Equipping currently requires editing character data or future UI. Items apply bonuses when equipped.

**Q: Can I save my progress?**  
A: Save/load system is planned for future update. Current session is not persistent.

**Q: How do I acquire new skills?**  
A: Skill acquisition system is implemented but requires UI integration (future update).

**Q: What's the max level?**  
A: Tier 9 (Transcendence) is the highest standard tier. Special tiers (God, Eldritch) exist for unique characters.

**Q: Can I recruit more characters?**  
A: Town map with recruitment planned for future. Currently play with starter duo.

**Q: How do I craft items?**  
A: Crafting system is planned (materials exist for this purpose).

## Support

For issues or questions:
- Check `IMPLEMENTATION_SUMMARY.md` for technical details
- Review `requirementPrompts.prompt.md` for design rationale
- Run `py test_system.py` to verify installation

---

**Enjoy your adventure in the Douluo RPG system!**
