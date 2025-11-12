"""
Character model with stats, tier, potential, and skill management.
"""
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
import json
import math


@dataclass
class Stats:
    """Character statistics with base values and modifiers."""
    # Core stats
    STR: int = 10  # Physical power / melee scaling
    DEX: int = 10  # Agility, accuracy, crit chance
    INT: int = 10  # Magical power / spell scaling
    WIS: int = 10  # Resistance, insight, status accuracy
    CHA: int = 10  # Social influence, recruitment, morale
    LCK: int = 10  # Random outcome bias
    END: int = 10  # Physical durability / armor mitigation
    SPD: int = 10  # Turn sequencing influence
    HP: int = 100  # Health pool
    MP: int = 50   # Mental/Mana pool
    
    # Modifiers (applied from buffs, passives, equipment)
    modifiers: Dict[str, int] = field(default_factory=dict)
    
    def get_effective(self, stat_name: str) -> int:
        """Get stat value with modifiers applied."""
        base = getattr(self, stat_name, 0)
        modifier = self.modifiers.get(stat_name, 0)
        return max(0, base + modifier)
    
    def add_modifier(self, stat_name: str, value: int):
        """Add a modifier to a stat."""
        self.modifiers[stat_name] = self.modifiers.get(stat_name, 0) + value
    
    def remove_modifier(self, stat_name: str, value: int):
        """Remove a modifier from a stat."""
        self.modifiers[stat_name] = self.modifiers.get(stat_name, 0) - value
    
    def clear_modifiers(self):
        """Clear all modifiers."""
        self.modifiers.clear()


@dataclass
class SpecialTier:
    """Represents special tier types (God or Eldritch)."""
    tier_type: str  # "god" or "eldritch"
    base: int       # Base tier value
    imaginary: int = 0  # For eldritch complex tiers (e.g., 3+2i)
    
    def get_effective_tier(self) -> int:
        """Convert special tier to effective numeric tier for calculations."""
        if self.tier_type == "god":
            # Negative tiers map to high effective tiers
            return 10 + abs(self.base)
        elif self.tier_type == "eldritch":
            # Complex tier: use base + imaginary component influence
            return self.base + (self.imaginary // 2)
        return self.base


class Character:
    """
    Represents a hero or enemy with stats, tier, potential, and skills.
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        tier: int = 1,
        potential: int = 0,
        stats: Optional[Stats] = None,
        tags: Optional[List[str]] = None,
        skills: Optional[List[str]] = None,  # Skill IDs
        portrait_asset: Optional[str] = None,
        special_tier: Optional[SpecialTier] = None,
        is_ally: bool = True
    ):
        self.id = id
        self.name = name
        self.tier = tier
        self.potential = potential
        self.stats = stats if stats else Stats()
        self.tags = tags if tags else []
        self.skills = skills if skills else []
        self.portrait_asset = portrait_asset
        self.special_tier = special_tier
        self.is_ally = is_ally
        
        # Combat state
        self.current_hp = self.stats.HP
        self.current_mp = self.stats.MP
        self.buffs: List[Dict[str, Any]] = []
        self.debuffs: List[Dict[str, Any]] = []
        self.position: Optional[tuple] = None  # (x, y) on map
        
        # Equipment system (max 3 items)
        self.equipped_items: Dict[str, Any] = {
            "slot_1": None,
            "slot_2": None,
            "slot_3": None
        }
        
        # Inventory reference (managed externally)
        self.inventory = None
        
    def get_effective_tier(self) -> int:
        """Get the effective tier for calculations."""
        if self.special_tier:
            return self.special_tier.get_effective_tier()
        return self.tier
    
    def get_active_slots(self, config: Dict) -> int:
        """Calculate active ability slots based on tier and potential."""
        tier = self.get_effective_tier()
        formula = config.get("ability_slots", {}).get("formula_active", "")
        # Default: min(4, ceil(tier/2) + floor(potential/50))
        slots = min(4, math.ceil(tier / 2) + math.floor(self.potential / 50))
        return slots
    
    def get_passive_slots(self, config: Dict) -> int:
        """Calculate passive ability slots based on tier and potential."""
        tier = self.get_effective_tier()
        # Default: min(4, 2 + floor(tier/3) + floor(potential/60))
        slots = min(4, 2 + math.floor(tier / 3) + math.floor(self.potential / 60))
        return slots
    
    def can_advance_tier(self, new_tier: int, pt_thresholds: Dict[str, int], events_met: bool = False) -> bool:
        """Check if character can advance to new tier."""
        if new_tier <= self.tier:
            return False
        
        required_pt = pt_thresholds.get(str(new_tier), float('inf'))
        if self.potential < required_pt:
            return False
        
        # Must have met required event conditions (checked externally)
        return events_met
    
    def advance_tier(self, new_tier: int):
        """Advance character to new tier."""
        self.tier = new_tier
    
    def add_skill(self, skill_id: str):
        """Add a skill to the character."""
        if skill_id not in self.skills:
            self.skills.append(skill_id)
    
    def remove_skill(self, skill_id: str):
        """Remove a skill from the character."""
        if skill_id in self.skills:
            self.skills.remove(skill_id)
    
    def has_skill(self, skill_id: str) -> bool:
        """Check if character has a skill."""
        return skill_id in self.skills
    
    def add_buff(self, buff: Dict[str, Any]):
        """Add a buff effect."""
        self.buffs.append(buff)
        if "stat_mod" in buff:
            for stat, value in buff["stat_mod"].items():
                self.stats.add_modifier(stat, value)
    
    def add_debuff(self, debuff: Dict[str, Any]):
        """Add a debuff effect."""
        self.debuffs.append(debuff)
        if "stat_mod" in debuff:
            for stat, value in debuff["stat_mod"].items():
                self.stats.add_modifier(stat, -value)
    
    def process_turn_start(self):
        """Process buffs/debuffs at start of turn."""
        # Decrement durations
        for buff in self.buffs[:]:
            if "duration" in buff:
                buff["duration"] -= 1
                if buff["duration"] <= 0:
                    self.remove_buff(buff)
        
        for debuff in self.debuffs[:]:
            if "duration" in debuff:
                debuff["duration"] -= 1
                if debuff["duration"] <= 0:
                    self.remove_debuff(debuff)
        
        # Apply DOT/HOT effects
        for buff in self.buffs:
            if "hot" in buff:
                self.current_hp = min(self.stats.HP, self.current_hp + buff["hot"])
        
        for debuff in self.debuffs:
            if "dot" in debuff:
                self.take_damage(debuff["dot"], "Mental")
    
    def remove_buff(self, buff: Dict[str, Any]):
        """Remove a buff and its effects."""
        if buff in self.buffs:
            self.buffs.remove(buff)
            if "stat_mod" in buff:
                for stat, value in buff["stat_mod"].items():
                    self.stats.remove_modifier(stat, value)
    
    def remove_debuff(self, debuff: Dict[str, Any]):
        """Remove a debuff and its effects."""
        if debuff in self.debuffs:
            self.debuffs.remove(debuff)
            if "stat_mod" in debuff:
                for stat, value in debuff["stat_mod"].items():
                    self.stats.remove_modifier(stat, -value)
    
    def take_damage(self, amount: int, damage_type: str) -> int:
        """Apply damage with mitigation. Returns actual damage dealt."""
        mitigation = 0
        if damage_type in ["Pierce", "Blunt", "Slash"]:
            # Physical damage mitigated by END
            mitigation = self.stats.get_effective("END") // 2
        elif damage_type == "Mental":
            # Mental damage mitigated by WIS
            mitigation = self.stats.get_effective("WIS") // 2
        
        actual_damage = max(0, amount - mitigation)
        self.current_hp = max(0, self.current_hp - actual_damage)
        return actual_damage
    
    def heal(self, amount: int) -> int:
        """Heal character. Returns actual healing done."""
        max_hp = self.stats.get_effective("HP")
        old_hp = self.current_hp
        self.current_hp = min(max_hp, self.current_hp + amount)
        return self.current_hp - old_hp
    
    def is_alive(self) -> bool:
        """Check if character is alive."""
        return self.current_hp > 0
    
    def equip_item(self, item, slot: str = None) -> tuple[bool, str]:
        """
        Equip an item to a slot.
        Returns (success, message)
        """
        if item.item_type != "equipment":
            return False, "Item is not equipment"
        
        # Find available slot or use specified slot
        if slot and slot in self.equipped_items:
            target_slot = slot
        else:
            # Find first empty slot
            target_slot = None
            for slot_name, equipped in self.equipped_items.items():
                if equipped is None:
                    target_slot = slot_name
                    break
            
            if target_slot is None:
                return False, "All equipment slots full"
        
        # Unequip old item if slot occupied
        old_item = self.equipped_items[target_slot]
        if old_item:
            self.unequip_item(target_slot)
        
        # Equip new item
        self.equipped_items[target_slot] = item
        
        # Apply stat bonuses
        for stat, bonus in item.stat_bonuses.items():
            # For base stats, add to modifier dict
            if hasattr(self.stats, stat):
                self.stats.add_modifier(stat, bonus)
        
        return True, f"Equipped {item.name} to {target_slot}"
    
    def unequip_item(self, slot: str) -> tuple[bool, Any]:
        """
        Unequip item from slot.
        Returns (success, unequipped_item)
        """
        if slot not in self.equipped_items:
            return False, None
        
        item = self.equipped_items[slot]
        if item is None:
            return False, None
        
        # Remove stat bonuses
        for stat, bonus in item.stat_bonuses.items():
            if hasattr(self.stats, stat):
                self.stats.remove_modifier(stat, bonus)
        
        self.equipped_items[slot] = None
        return True, item
    
    def get_equipped_items(self) -> List[Any]:
        """Get list of equipped items."""
        return [item for item in self.equipped_items.values() if item is not None]
    
    def has_equipment_slot_available(self) -> bool:
        """Check if character has empty equipment slot."""
        return any(item is None for item in self.equipped_items.values())
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize character to dictionary."""
        data = {
            "id": self.id,
            "name": self.name,
            "tier": self.tier,
            "potential": self.potential,
            "stats": {
                "STR": self.stats.STR,
                "DEX": self.stats.DEX,
                "INT": self.stats.INT,
                "WIS": self.stats.WIS,
                "CHA": self.stats.CHA,
                "LCK": self.stats.LCK,
                "END": self.stats.END,
                "SPD": self.stats.SPD,
                "HP": self.stats.HP,
                "MP": self.stats.MP
            },
            "tags": self.tags,
            "skills": self.skills,
            "is_ally": self.is_ally
        }
        
        if self.portrait_asset:
            data["portrait_asset"] = self.portrait_asset
        
        if self.special_tier:
            data["special_tier"] = {
                "type": self.special_tier.tier_type,
                "base": self.special_tier.base,
                "imaginary": self.special_tier.imaginary
            }
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Character':
        """Deserialize character from dictionary."""
        stats_data = data.get("stats", {})
        stats = Stats(**{k: v for k, v in stats_data.items() if k in Stats.__annotations__})
        
        special_tier = None
        if "special_tier" in data:
            st = data["special_tier"]
            special_tier = SpecialTier(
                tier_type=st["type"],
                base=st["base"],
                imaginary=st.get("imaginary", 0)
            )
        
        return cls(
            id=data["id"],
            name=data["name"],
            tier=data.get("tier", 1),
            potential=data.get("potential", 0),
            stats=stats,
            tags=data.get("tags", []),
            skills=data.get("skills", []),
            portrait_asset=data.get("portrait_asset"),
            special_tier=special_tier,
            is_ally=data.get("is_ally", True)
        )
