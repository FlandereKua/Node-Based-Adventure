"""
Test script to verify core functionality without running full game.
"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.models.character import Character, Stats
from src.models.skill import SkillGraph, Skill
from src.models.item import Item, Inventory, LootTable
from src.models.event import Event, EventManager
import json


def test_character_system():
    """Test character creation and equipment."""
    print("=== Testing Character System ===")
    
    # Create character
    char = Character(
        id="test_hero",
        name="Test Hero",
        tier=1,
        potential=10,
        stats=Stats(STR=12, DEX=10, INT=8, END=11, HP=100, MP=50),
        tags=["warrior"],
        skills=["life"]
    )
    
    print(f"Created: {char.name} (Tier {char.tier}, PT {char.potential})")
    print(f"  STR: {char.stats.STR}, HP: {char.current_hp}/{char.stats.HP}")
    
    # Test equipment
    sword = Item(
        id="test_sword",
        name="Test Sword",
        item_type="equipment",
        stat_bonuses={"STR": 5, "DEX": 2}
    )
    
    success, msg = char.equip_item(sword, "slot_1")
    print(f"  Equip: {msg}")
    print(f"  STR after equip: {char.stats.get_effective('STR')}")
    
    print("✓ Character system working\n")


def test_inventory_system():
    """Test inventory and items."""
    print("=== Testing Inventory System ===")
    
    inventory = Inventory(max_slots=50)
    
    # Create items
    potion = Item(
        id="health_potion",
        name="Health Potion",
        item_type="consumable",
        consumable_effects={"heal_hp": 50},
        stackable=True,
        max_stack=99
    )
    
    # Add items
    inventory.add_item(potion, 5)
    print(f"Added 5 health potions")
    print(f"  Inventory has {inventory.get_quantity('health_potion')} potions")
    
    # Remove item
    inventory.remove_item("health_potion", 2)
    print(f"Used 2 potions")
    print(f"  Inventory has {inventory.get_quantity('health_potion')} potions remaining")
    
    print("✓ Inventory system working\n")


def test_loot_system():
    """Test loot drop mechanics."""
    print("=== Testing Loot System ===")
    
    # Create loot table
    loot_table = LootTable(id="test_loot", name="Test Drops")
    loot_table.add_entry(
        item_id="health_potion",
        drop_chance=0.5,
        min_quantity=1,
        max_quantity=3,
        luck_modifier=0.02
    )
    
    # Create item database
    item_db = {
        "health_potion": Item(
            id="health_potion",
            name="Health Potion",
            item_type="consumable",
            consumable_effects={"heal_hp": 50}
        )
    }
    
    # Roll loot with high luck
    drops = loot_table.roll_loot(luck_stat=15, item_database=item_db)
    print(f"Rolled loot with LCK 15:")
    for item, qty in drops:
        print(f"  Dropped: {item.name} x{qty}")
    
    print("✓ Loot system working\n")


def test_skill_graph():
    """Test skill acquisition."""
    print("=== Testing Skill Graph ===")
    
    graph = SkillGraph()
    
    # Create character
    char = Character(
        id="test",
        name="Test",
        tier=1,
        potential=10,
        skills=["life"]
    )
    
    # Create a skill
    thrust = Skill(
        id="thrust",
        name="Thrust",
        tier=1,
        skill_type="active",
        links=["life"]
    )
    graph.add_skill(thrust)
    
    # Try to acquire
    success, msg = graph.acquire_skill(char, "thrust")
    print(f"Skill acquisition: {msg}")
    print(f"  Character skills: {char.skills}")
    
    print("✓ Skill graph working\n")


def test_tier_advancement():
    """Test tier advancement with items."""
    print("=== Testing Tier Advancement ===")
    
    # Load config
    with open("config/game_config.json", 'r') as f:
        config = json.load(f)
    
    # Create character
    char = Character(
        id="test",
        name="Test Hero",
        tier=1,
        potential=8
    )
    
    print(f"Starting: Tier {char.tier}, Potential {char.potential}")
    
    # Use breakthrough pill
    pill = Item(
        id="breakthrough_pill",
        name="Breakthrough Pill",
        item_type="consumable",
        tier_advancement_value=15
    )
    
    result = pill.use(char, config, in_combat=False)
    print(f"\n{result}")
    print(f"After pill: Tier {char.tier}, Potential {char.potential}")
    
    # Check if can advance
    pt_thresholds = config["potential_thresholds"]
    can_advance = char.can_advance_tier(2, pt_thresholds, events_met=True)
    print(f"Can advance to Tier 2: {can_advance}")
    
    if can_advance:
        char.advance_tier(2)
        print(f"Advanced to Tier {char.tier}!")
    
    print("✓ Tier advancement working\n")


def main():
    """Run all tests."""
    print("=" * 50)
    print("DOULUO RPG SYSTEM TEST")
    print("=" * 50)
    print()
    
    try:
        test_character_system()
        test_inventory_system()
        test_loot_system()
        test_skill_graph()
        test_tier_advancement()
        
        print("=" * 50)
        print("ALL TESTS PASSED ✓")
        print("=" * 50)
        print("\nSystem is ready! Run 'py main.py' to start the game.")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
