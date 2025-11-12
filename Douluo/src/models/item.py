"""
Item system including equipment, consumables, and loot management.
"""
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass, field


class ItemType(Enum):
    """Types of items."""
    EQUIPMENT = "equipment"
    CONSUMABLE = "consumable"
    MATERIAL = "material"
    KEY_ITEM = "key_item"


class ItemRarity(Enum):
    """Item rarity levels."""
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"
    MYTHICAL = "mythical"


class EquipmentSlot(Enum):
    """Equipment slot types."""
    SLOT_1 = "slot_1"
    SLOT_2 = "slot_2"
    SLOT_3 = "slot_3"


class Item:
    """
    Represents an item that can be equipped, consumed, or used.
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        item_type: str,  # "equipment", "consumable", "material", "key_item"
        description: str = "",
        rarity: str = "common",
        stat_bonuses: Optional[Dict[str, int]] = None,
        effects: Optional[List[Dict[str, Any]]] = None,
        consumable_effects: Optional[Dict[str, Any]] = None,
        tier_advancement_value: int = 0,  # Potential gain for tier items
        potential_gain: int = 0,  # Direct potential gain
        stackable: bool = True,
        max_stack: int = 99,
        icon: Optional[str] = None
    ):
        self.id = id
        self.name = name
        self.item_type = item_type
        self.description = description
        self.rarity = rarity
        self.stat_bonuses = stat_bonuses if stat_bonuses else {}
        self.effects = effects if effects else []
        self.consumable_effects = consumable_effects if consumable_effects else {}
        self.tier_advancement_value = tier_advancement_value
        self.potential_gain = potential_gain
        self.stackable = stackable and item_type != "equipment"
        self.max_stack = max_stack if self.stackable else 1
        self.icon = icon
    
    def can_use(self, character, in_combat: bool = False) -> tuple[bool, str]:
        """Check if item can be used by character."""
        if self.item_type == "equipment":
            # Check if character has free equipment slot
            if len([e for e in character.equipped_items.values() if e]) >= 3:
                return False, "All equipment slots full"
            return True, "Can equip"
        
        elif self.item_type == "consumable":
            # Check consumable restrictions
            if not in_combat and self.consumable_effects.get("combat_only", False):
                return False, "Can only be used in combat"
            
            if in_combat and self.consumable_effects.get("non_combat_only", False):
                return False, "Cannot be used in combat"
            
            return True, "Can consume"
        
        elif self.item_type == "material":
            return False, "Materials cannot be used directly"
        
        return True, "Can use"
    
    def use(self, character, config: Dict, in_combat: bool = False) -> str:
        """
        Use/consume the item on a character.
        Returns message describing effects.
        """
        messages = []
        
        if self.item_type == "consumable":
            # Healing effect
            if "heal_hp" in self.consumable_effects:
                heal_amount = self.consumable_effects["heal_hp"]
                actual_heal = character.heal(heal_amount)
                messages.append(f"Restored {actual_heal} HP")
            
            # MP restoration
            if "restore_mp" in self.consumable_effects:
                mp_amount = self.consumable_effects["restore_mp"]
                max_mp = character.stats.get_effective("MP")
                old_mp = character.current_mp
                character.current_mp = min(max_mp, character.current_mp + mp_amount)
                actual_restore = character.current_mp - old_mp
                messages.append(f"Restored {actual_restore} MP")
            
            # Stat boost (temporary buff)
            if "stat_boost" in self.consumable_effects:
                boost_data = self.consumable_effects["stat_boost"]
                for stat, value in boost_data.items():
                    if stat != "duration":
                        buff = {
                            "name": f"{self.name} Boost",
                            "duration": boost_data.get("duration", 3),
                            "stat_mod": {stat: value}
                        }
                        character.add_buff(buff)
                        messages.append(f"+{value} {stat} for {buff['duration']} turns")
            
            # Potential gain
            if self.potential_gain > 0:
                character.potential += self.potential_gain
                messages.append(f"Gained {self.potential_gain} Potential")
            
            # Tier advancement
            if self.tier_advancement_value > 0:
                pt_thresholds = config.get("potential_thresholds", {})
                next_tier = character.tier + 1
                if character.can_advance_tier(next_tier, pt_thresholds, events_met=True):
                    character.advance_tier(next_tier)
                    tier_names = config.get("tier_names", {})
                    new_name = tier_names.get(str(next_tier), f"Tier {next_tier}")
                    messages.append(f"ADVANCED TO {new_name}!")
                else:
                    # Item provides potential boost toward next tier
                    character.potential += self.tier_advancement_value
                    messages.append(f"Gained {self.tier_advancement_value} Potential (toward tier advancement)")
            
            # Remove debuffs
            if self.consumable_effects.get("remove_debuffs", False):
                count = len(character.debuffs)
                character.debuffs.clear()
                messages.append(f"Removed {count} debuffs")
        
        if messages:
            return f"Used {self.name}:\n" + "\n".join(f"  • {msg}" for msg in messages)
        return f"Used {self.name}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize item to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "item_type": self.item_type,
            "description": self.description,
            "rarity": self.rarity,
            "stat_bonuses": self.stat_bonuses,
            "effects": self.effects,
            "consumable_effects": self.consumable_effects,
            "tier_advancement_value": self.tier_advancement_value,
            "potential_gain": self.potential_gain,
            "stackable": self.stackable,
            "max_stack": self.max_stack,
            "icon": self.icon
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Item':
        """Deserialize item from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            item_type=data["item_type"],
            description=data.get("description", ""),
            rarity=data.get("rarity", "common"),
            stat_bonuses=data.get("stat_bonuses", {}),
            effects=data.get("effects", []),
            consumable_effects=data.get("consumable_effects", {}),
            tier_advancement_value=data.get("tier_advancement_value", 0),
            potential_gain=data.get("potential_gain", 0),
            stackable=data.get("stackable", True),
            max_stack=data.get("max_stack", 99),
            icon=data.get("icon")
        )


@dataclass
class ItemStack:
    """Represents a stack of items in inventory."""
    item: Item
    quantity: int = 1
    
    def can_add(self, amount: int = 1) -> bool:
        """Check if can add more items to stack."""
        return self.item.stackable and (self.quantity + amount) <= self.item.max_stack
    
    def add(self, amount: int = 1) -> int:
        """Add items to stack. Returns amount actually added."""
        if not self.item.stackable:
            return 0
        
        max_add = self.item.max_stack - self.quantity
        actual_add = min(amount, max_add)
        self.quantity += actual_add
        return actual_add
    
    def remove(self, amount: int = 1) -> int:
        """Remove items from stack. Returns amount actually removed."""
        actual_remove = min(amount, self.quantity)
        self.quantity -= actual_remove
        return actual_remove


class Inventory:
    """
    Manages a collection of items with stacking.
    """
    
    def __init__(self, max_slots: int = 50):
        self.max_slots = max_slots
        self.items: Dict[str, ItemStack] = {}  # item_id -> ItemStack
    
    def add_item(self, item: Item, quantity: int = 1) -> tuple[bool, str]:
        """
        Add item to inventory.
        Returns (success, message)
        """
        if item.id in self.items:
            # Try to add to existing stack
            stack = self.items[item.id]
            if stack.can_add(quantity):
                added = stack.add(quantity)
                return True, f"Added {added}x {item.name}"
            else:
                # Stack is full or can't stack more
                if not item.stackable:
                    return False, f"Already have {item.name}"
                else:
                    added = stack.add(quantity)
                    remaining = quantity - added
                    return added > 0, f"Added {added}x {item.name} ({remaining} didn't fit)"
        else:
            # New item
            if len(self.items) >= self.max_slots:
                return False, "Inventory full"
            
            self.items[item.id] = ItemStack(item, quantity)
            return True, f"Added {quantity}x {item.name}"
    
    def remove_item(self, item_id: str, quantity: int = 1) -> tuple[bool, str]:
        """
        Remove item from inventory.
        Returns (success, message)
        """
        if item_id not in self.items:
            return False, "Item not in inventory"
        
        stack = self.items[item_id]
        removed = stack.remove(quantity)
        
        if stack.quantity <= 0:
            del self.items[item_id]
        
        return True, f"Removed {removed}x {stack.item.name}"
    
    def has_item(self, item_id: str, quantity: int = 1) -> bool:
        """Check if inventory has item in sufficient quantity."""
        if item_id not in self.items:
            return False
        return self.items[item_id].quantity >= quantity
    
    def get_item(self, item_id: str) -> Optional[Item]:
        """Get item from inventory."""
        stack = self.items.get(item_id)
        return stack.item if stack else None
    
    def get_quantity(self, item_id: str) -> int:
        """Get quantity of item in inventory."""
        stack = self.items.get(item_id)
        return stack.quantity if stack else 0
    
    def get_all_items(self) -> List[tuple[Item, int]]:
        """Get all items as list of (item, quantity) tuples."""
        return [(stack.item, stack.quantity) for stack in self.items.values()]
    
    def get_items_by_type(self, item_type: str) -> List[tuple[Item, int]]:
        """Get items of specific type."""
        return [(stack.item, stack.quantity) 
                for stack in self.items.values() 
                if stack.item.item_type == item_type]
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize inventory to dictionary."""
        return {
            "max_slots": self.max_slots,
            "items": [
                {
                    "item": stack.item.to_dict(),
                    "quantity": stack.quantity
                }
                for stack in self.items.values()
            ]
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Inventory':
        """Deserialize inventory from dictionary."""
        inventory = cls(max_slots=data.get("max_slots", 50))
        
        for item_data in data.get("items", []):
            item = Item.from_dict(item_data["item"])
            quantity = item_data["quantity"]
            inventory.items[item.id] = ItemStack(item, quantity)
        
        return inventory


class LootTable:
    """
    Defines possible loot drops with probabilities.
    """
    
    def __init__(self, id: str, name: str = ""):
        self.id = id
        self.name = name
        self.entries: List[Dict[str, Any]] = []
    
    def add_entry(
        self,
        item_id: str,
        drop_chance: float,  # 0.0 to 1.0
        min_quantity: int = 1,
        max_quantity: int = 1,
        luck_modifier: float = 0.01  # LCK influence per point
    ):
        """Add a loot entry to the table."""
        self.entries.append({
            "item_id": item_id,
            "drop_chance": drop_chance,
            "min_quantity": min_quantity,
            "max_quantity": max_quantity,
            "luck_modifier": luck_modifier
        })
    
    def roll_loot(self, luck_stat: int, item_database: Dict[str, Item]) -> List[tuple[Item, int]]:
        """
        Roll for loot drops based on luck.
        Returns list of (Item, quantity) tuples.
        """
        import random
        
        dropped_items = []
        luck_bonus = (luck_stat - 10) * 0.01  # Base LCK 10 = neutral
        
        for entry in self.entries:
            # Calculate effective drop chance with luck
            base_chance = entry["drop_chance"]
            luck_mult = entry.get("luck_modifier", 0.01)
            effective_chance = base_chance + (luck_bonus * luck_mult)
            effective_chance = max(0.0, min(1.0, effective_chance))  # Clamp 0-1
            
            # Roll for drop
            if random.random() < effective_chance:
                item = item_database.get(entry["item_id"])
                if item:
                    quantity = random.randint(
                        entry["min_quantity"],
                        entry["max_quantity"]
                    )
                    dropped_items.append((item, quantity))
        
        return dropped_items
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize loot table to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "entries": self.entries
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LootTable':
        """Deserialize loot table from dictionary."""
        table = cls(id=data["id"], name=data.get("name", ""))
        table.entries = data.get("entries", [])
        return table
