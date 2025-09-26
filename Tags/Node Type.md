### Standardized Tag System

Node types must use the current standardized tags. **Note**: This tag list is actively maintained and may be expanded in the future.

**Current Tag Categories:**

**Behavior Types**: (Mandatory, basic definition of node behavior)
`#Active`, `#Passive`, `#Title`

**Weapon Types** (for weapon proficiency nodes):
`#Sword`, `#Axe`, `#Spear`, `#Dagger`, `#Wand`, `#Mace`, `#Hammer`, `#Staff`, `#Bow`, `#Gun`

**Damage Types** (for attack nodes - do NOT combine with weapon tags unless specifically required):
`#Pierce`, `#Blunt`, `#Slash`, `#Magic`, `#Mental`

**Elemental Types**:
`#Physical`, `#Fire`, `#Water`, `#Earth`, `#Wind`, `#Electric`, `#Metal`, `#Ice`, `#Thunder`, `#Plant`, `#Dark`, `#Light`

**Skill Categories**:
`#Crafting`, `#Knowledge`, `#Party`, `#Survival`

**Knowledge Subcategories** (combine with #Knowledge):
`#Nature`, `#Social`, `#Crafting`

**Race/Heritage Categories**:
`#Wolf`, `#Wood`, `#Herb`, `#Beast` (Use in combination with other Animal Tags)

**Status Effect Types**:
`#Bleed`, `#Stun`, `#Freeze`, `#Poison`, `#Burn`, `#Slow`, `#Root`

**Special Categories**:
`#Healing`, `#Ranged`, `#Food`

**Tag Usage Rules:**
- Attack nodes use damage type tags (#Slash, #Pierce, etc.) NOT weapon tags UNLESS SPECIFIED.
- Weapon proficiency nodes use weapon type tags (#Sword, #Axe, etc.)
- Combine categories as needed (e.g., `#Passive #Knowledge #Nature` for nature lore)
- Active crafting nodes that create items use `#Active #Crafting`
- Passive crafting nodes that enhance crafting use `#Passive #Crafting`