"""
Combat engine for turn-based battles.
"""
from typing import List, Dict, Optional, Any, Tuple
import random
from enum import Enum


class ActionType(Enum):
    """Types of actions in combat."""
    SKILL = "skill"
    MOVE = "move"
    WAIT = "wait"
    ITEM = "item"


class CombatAction:
    """Represents an action taken in combat."""
    
    def __init__(
        self,
        actor_id: str,
        action_type: str,
        target_ids: Optional[List[str]] = None,
        target_position: Optional[Tuple[int, int]] = None,
        skill_id: Optional[str] = None,
        item_id: Optional[str] = None
    ):
        self.actor_id = actor_id
        self.action_type = action_type
        self.target_ids = target_ids if target_ids else []
        self.target_position = target_position
        self.skill_id = skill_id
        self.item_id = item_id


class CombatLog:
    """Records combat events."""
    
    def __init__(self):
        self.entries: List[str] = []
    
    def add(self, message: str):
        """Add a log entry."""
        self.entries.append(message)
        print(f"[COMBAT] {message}")
    
    def get_recent(self, count: int = 10) -> List[str]:
        """Get recent log entries."""
        return self.entries[-count:]
    
    def clear(self):
        """Clear the log."""
        self.entries.clear()


class CombatEngine:
    """
    Manages turn-based combat on a grid map.
    """
    
    def __init__(self, game_map, config: Dict):
        self.game_map = game_map
        self.config = config
        self.characters: Dict[str, Any] = {}  # character_id -> Character
        self.turn_order: List[str] = []
        self.current_turn_index: int = 0
        self.round_number: int = 0
        self.combat_active: bool = False
        self.log = CombatLog()
        self.skill_graph = None  # Will be set externally
    
    def add_character(self, character, position: Tuple[int, int]) -> bool:
        """Add a character to combat at a position."""
        if not self.game_map.is_valid_position(*position):
            self.log.add(f"Cannot place {character.name} at invalid position {position}")
            return False
        
        # Check if position is already occupied
        for char in self.characters.values():
            if char.position == position:
                self.log.add(f"Position {position} already occupied")
                return False
        
        character.position = position
        self.characters[character.id] = character
        self.log.add(f"{character.name} enters battle at {position}")
        return True
    
    def remove_character(self, character_id: str):
        """Remove a character from combat."""
        if character_id in self.characters:
            char = self.characters[character_id]
            self.log.add(f"{char.name} removed from battle")
            del self.characters[character_id]
    
    def start_combat(self):
        """Initialize combat and calculate first turn order."""
        self.combat_active = True
        self.round_number = 1
        self.calculate_turn_order()
        self.log.add("=== COMBAT START ===")
        self.log.add(f"Turn order: {', '.join(self.characters[cid].name for cid in self.turn_order)}")
    
    def calculate_turn_order(self):
        """Calculate turn order based on SPD stat."""
        # Sort by SPD (descending), then by DEX for ties, then by character ID for stability
        sorted_chars = sorted(
            self.characters.values(),
            key=lambda c: (
                -c.stats.get_effective("SPD"),
                -c.stats.get_effective("DEX"),
                c.id
            )
        )
        self.turn_order = [c.id for c in sorted_chars]
        self.current_turn_index = 0
    
    def get_current_character(self):
        """Get the character whose turn it is."""
        if not self.turn_order:
            return None
        return self.characters.get(self.turn_order[self.current_turn_index])
    
    def next_turn(self):
        """Advance to the next turn."""
        self.current_turn_index += 1
        
        # Check if round is complete
        if self.current_turn_index >= len(self.turn_order):
            self.end_round()
            self.start_new_round()
        
        # Process turn start for current character
        current = self.get_current_character()
        if current:
            current.process_turn_start()
            self.log.add(f"\n--- {current.name}'s Turn (SPD: {current.stats.get_effective('SPD')}) ---")
    
    def end_round(self):
        """End the current round."""
        self.log.add(f"=== End of Round {self.round_number} ===")
    
    def start_new_round(self):
        """Start a new round."""
        self.round_number += 1
        self.current_turn_index = 0
        
        # Recalculate turn order if configured
        if self.config.get("combat", {}).get("turn_order_recalc") == "per_round":
            self.calculate_turn_order()
        
        self.log.add(f"\n=== Round {self.round_number} ===")
    
    def validate_action(self, action: CombatAction) -> tuple[bool, str]:
        """Validate if an action can be performed."""
        actor = self.characters.get(action.actor_id)
        if not actor:
            return False, "Actor not found"
        
        if not actor.is_alive():
            return False, "Actor is defeated"
        
        if action.action_type == "skill":
            if not action.skill_id:
                return False, "No skill specified"
            
            if not self.skill_graph:
                return False, "Skill graph not available"
            
            skill = self.skill_graph.get_skill(action.skill_id)
            if not skill:
                return False, f"Skill '{action.skill_id}' not found"
            
            if not actor.has_skill(action.skill_id):
                return False, f"Actor does not have skill '{skill.name}'"
            
            # Check MP cost
            if actor.current_mp < skill.costs.mp:
                return False, f"Insufficient MP ({actor.current_mp}/{skill.costs.mp})"
            
            # Validate targets
            if not action.target_ids and skill.range_spec.pattern != "self":
                return False, "No targets specified"
            
            # Check range for each target
            for target_id in action.target_ids:
                target = self.characters.get(target_id)
                if not target:
                    return False, f"Target '{target_id}' not found"
                
                if not target.is_alive():
                    return False, f"Target {target.name} is defeated"
                
                dist = self.game_map.diagonal_distance(
                    *actor.position,
                    *target.position
                )
                
                if dist < skill.range_spec.min_range or dist > skill.range_spec.max_range:
                    return False, f"Target {target.name} out of range ({dist} vs {skill.range_spec.min_range}-{skill.range_spec.max_range})"
        
        elif action.action_type == "move":
            if not action.target_position:
                return False, "No target position specified"
            
            if not self.game_map.is_valid_position(*action.target_position):
                return False, "Invalid target position"
            
            # Check if position is occupied
            for char in self.characters.values():
                if char.position == action.target_position and char.id != actor.id:
                    return False, "Position occupied"
        
        return True, "Action valid"
    
    def execute_action(self, action: CombatAction) -> bool:
        """Execute a combat action. Returns True if successful."""
        is_valid, reason = self.validate_action(action)
        if not is_valid:
            self.log.add(f"Action failed: {reason}")
            return False
        
        actor = self.characters[action.actor_id]
        
        if action.action_type == "skill":
            return self._execute_skill(actor, action)
        
        elif action.action_type == "move":
            return self._execute_move(actor, action)
        
        elif action.action_type == "wait":
            self.log.add(f"{actor.name} waits")
            return True
        
        return False
    
    def _execute_skill(self, actor, action: CombatAction) -> bool:
        """Execute a skill action."""
        skill = self.skill_graph.get_skill(action.skill_id)
        if not skill:
            return False
        
        # Deduct costs
        actor.current_mp -= skill.costs.mp
        if skill.costs.hp > 0:
            actor.current_hp = max(0, actor.current_hp - skill.costs.hp)
        
        self.log.add(f"{actor.name} uses {skill.name}!")
        
        # Apply effects
        effects = skill.get_effects_with_potential(actor.potential)
        
        for effect in effects:
            if effect.kind == "damage":
                self._apply_damage_effect(actor, action.target_ids, effect, skill)
            
            elif effect.kind == "heal":
                self._apply_heal_effect(actor, action.target_ids, effect, skill)
            
            elif effect.kind == "buff":
                self._apply_buff_effect(actor, action.target_ids, effect)
            
            elif effect.kind == "debuff":
                self._apply_debuff_effect(actor, action.target_ids, effect)
        
        return True
    
    def _apply_damage_effect(self, actor, target_ids: List[str], effect, skill):
        """Apply damage to targets."""
        damage_type = effect.params.get("damage_type", "Pierce")
        
        for target_id in target_ids:
            target = self.characters.get(target_id)
            if not target or not target.is_alive():
                continue
            
            # Calculate damage
            base_damage = skill.calculate_damage(actor, actor.potential)
            
            # Apply luck variance
            luck_factor = 1.0 + (actor.stats.get_effective("LCK") - 10) * 0.01
            variance = random.uniform(0.9, 1.1) * luck_factor
            final_damage = int(base_damage * variance)
            
            # Critical hit check
            crit_chance = actor.stats.get_effective("DEX") / 200.0
            if random.random() < crit_chance:
                final_damage = int(final_damage * 1.5)
                self.log.add(f"  Critical hit!")
            
            # Apply damage with mitigation
            actual_damage = target.take_damage(final_damage, damage_type)
            self.log.add(f"  {target.name} takes {actual_damage} {damage_type} damage (HP: {target.current_hp}/{target.stats.HP})")
            
            # Check for defeat
            if not target.is_alive():
                self.log.add(f"  {target.name} has been defeated!")
                self._check_combat_end()
    
    def _apply_heal_effect(self, actor, target_ids: List[str], effect, skill):
        """Apply healing to targets."""
        for target_id in target_ids:
            target = self.characters.get(target_id)
            if not target or not target.is_alive():
                continue
            
            heal_amount = skill.calculate_heal(actor, actor.potential)
            actual_heal = target.heal(heal_amount)
            self.log.add(f"  {target.name} healed for {actual_heal} HP (HP: {target.current_hp}/{target.stats.HP})")
    
    def _apply_buff_effect(self, actor, target_ids: List[str], effect):
        """Apply buff to targets."""
        for target_id in target_ids:
            target = self.characters.get(target_id)
            if not target or not target.is_alive():
                continue
            
            buff = {
                "name": effect.params.get("name", "Buff"),
                "duration": effect.params.get("duration", 3),
                "stat_mod": effect.params.get("stat_mod", {}),
                "hot": effect.params.get("hot", 0)
            }
            target.add_buff(buff)
            self.log.add(f"  {target.name} receives buff: {buff['name']}")
    
    def _apply_debuff_effect(self, actor, target_ids: List[str], effect):
        """Apply debuff to targets."""
        for target_id in target_ids:
            target = self.characters.get(target_id)
            if not target or not target.is_alive():
                continue
            
            # Check if debuff hits based on WIS
            accuracy = actor.stats.get_effective("WIS") - target.stats.get_effective("WIS")
            hit_chance = 0.7 + (accuracy * 0.01)
            hit_chance = max(0.3, min(0.95, hit_chance))
            
            if random.random() < hit_chance:
                debuff = {
                    "name": effect.params.get("name", "Debuff"),
                    "duration": effect.params.get("duration", 3),
                    "stat_mod": effect.params.get("stat_mod", {}),
                    "dot": effect.params.get("dot", 0)
                }
                target.add_debuff(debuff)
                self.log.add(f"  {target.name} is afflicted with: {debuff['name']}")
            else:
                self.log.add(f"  {target.name} resisted the debuff!")
    
    def _execute_move(self, actor, action: CombatAction) -> bool:
        """Execute a movement action."""
        old_pos = actor.position
        new_pos = action.target_position
        
        # Simple implementation: allow movement if adjacent or within reasonable distance
        dist = self.game_map.diagonal_distance(*old_pos, *new_pos)
        max_move = max(1, actor.stats.get_effective("SPD") // 10)
        
        if dist > max_move:
            self.log.add(f"{actor.name} cannot move that far ({dist} > {max_move})")
            return False
        
        actor.position = new_pos
        self.log.add(f"{actor.name} moves from {old_pos} to {new_pos}")
        return True
    
    def _check_combat_end(self):
        """Check if combat should end."""
        allies_alive = any(c.is_ally and c.is_alive() for c in self.characters.values())
        enemies_alive = any(not c.is_ally and c.is_alive() for c in self.characters.values())
        
        if not allies_alive:
            self.log.add("\n=== DEFEAT ===")
            self.combat_active = False
        elif not enemies_alive:
            self.log.add("\n=== VICTORY ===")
            self.combat_active = False
            # Trigger loot drops (handled externally by game manager)
    
    def get_defeated_enemies(self) -> List:
        """Get list of defeated enemy characters."""
        return [c for c in self.characters.values() 
                if not c.is_ally and not c.is_alive()]
    
    def get_characters_at_position(self, x: int, y: int) -> List:
        """Get all characters at a position."""
        return [c for c in self.characters.values() if c.position == (x, y)]
    
    def get_characters_in_range(
        self,
        center: Tuple[int, int],
        min_range: int,
        max_range: int,
        pattern: str = "radial"
    ) -> List:
        """Get all characters within a range pattern."""
        tiles = self.game_map.get_tiles_in_range(*center, min_range, max_range, pattern)
        characters = []
        
        for tile_pos in tiles:
            chars_at_pos = self.get_characters_at_position(*tile_pos)
            characters.extend(chars_at_pos)
        
        return characters
