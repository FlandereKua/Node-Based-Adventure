"""
Skill system with graph-based acquisition and effects.
"""
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class SkillType(Enum):
    """Types of skills."""
    ACTIVE = "active"
    PASSIVE = "passive"
    TITLE = "title"


class TargetPattern(Enum):
    """Targeting patterns for skills."""
    SINGLE = "single"
    RADIAL = "radial"
    LINE = "line"
    CONE = "cone"
    SELF = "self"
    AOE = "aoe"


class EffectKind(Enum):
    """Types of skill effects."""
    DAMAGE = "damage"
    HEAL = "heal"
    BUFF = "buff"
    DEBUFF = "debuff"
    STAT_MOD = "stat_mod"


@dataclass
class SkillEffect:
    """Represents a single effect of a skill."""
    kind: str  # damage, heal, buff, debuff, stat_mod
    params: Dict[str, Any] = field(default_factory=dict)
    
    # For damage/heal
    # params: { "amount": int, "damage_type": str, "scaling": str }
    
    # For buff/debuff
    # params: { "stat_mod": {stat: value}, "duration": int, "dot/hot": int }
    
    # For stat_mod (permanent or until condition)
    # params: { "stat": str, "value": int }


@dataclass
class SkillRange:
    """Range specification for skills."""
    min_range: int = 0
    max_range: int = 1
    pattern: str = "single"  # single, radial, line, cone, self, aoe


@dataclass
class SkillCost:
    """Resource costs for skills."""
    mp: int = 0
    hp: int = 0
    special: Optional[str] = None  # For special resource types


@dataclass
class PotentialBreakpoint:
    """Bonus effect activated at certain potential thresholds."""
    pt_threshold: int
    bonus_effect: SkillEffect


class Skill:
    """
    Represents a skill (active, passive, or title) with graph linkage.
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        tier: int,
        skill_type: str,  # "active", "passive", "title"
        description: str = "",
        tags: Optional[List[str]] = None,
        links: Optional[List[str]] = None,  # Adjacent skill IDs in graph
        costs: Optional[SkillCost] = None,
        range_spec: Optional[SkillRange] = None,
        effects: Optional[List[SkillEffect]] = None,
        potential_breakpoints: Optional[List[PotentialBreakpoint]] = None
    ):
        self.id = id
        self.name = name
        self.tier = tier
        self.skill_type = skill_type
        self.description = description
        self.tags = tags if tags else []
        self.links = links if links else []
        self.costs = costs if costs else SkillCost()
        self.range_spec = range_spec if range_spec else SkillRange()
        self.effects = effects if effects else []
        self.potential_breakpoints = potential_breakpoints if potential_breakpoints else []
    
    def can_acquire(self, character, skill_graph: 'SkillGraph') -> tuple[bool, str]:
        """
        Check if character can acquire this skill.
        Returns (can_acquire, reason)
        """
        # Check tier requirement
        if character.get_effective_tier() < self.tier:
            return False, f"Character tier {character.tier} < required tier {self.tier}"
        
        # Check if already owned
        if character.has_skill(self.id):
            return False, "Skill already acquired"
        
        # Check for at least one linked skill owned (or is base skill)
        if self.id == "life":  # Base skill
            return True, "Base skill"
        
        has_prerequisite = False
        for link_id in self.links:
            if character.has_skill(link_id):
                has_prerequisite = True
                break
        
        if not has_prerequisite and len(self.links) > 0:
            return False, f"Missing prerequisite skill (need one of: {', '.join(self.links)})"
        
        return True, "Requirements met"
    
    def get_effects_with_potential(self, potential: int) -> List[SkillEffect]:
        """Get all effects including potential breakpoint bonuses."""
        active_effects = self.effects.copy()
        
        for breakpoint in self.potential_breakpoints:
            if potential >= breakpoint.pt_threshold:
                active_effects.append(breakpoint.bonus_effect)
        
        return active_effects
    
    def calculate_damage(self, caster, potential: int = 0) -> int:
        """Calculate damage output based on caster stats and potential."""
        total_damage = 0
        
        for effect in self.get_effects_with_potential(potential):
            if effect.kind == "damage":
                base = effect.params.get("amount", 0)
                scaling = effect.params.get("scaling", "")
                
                # Apply stat scaling
                if scaling == "STR":
                    total_damage += base + (caster.stats.get_effective("STR") // 5)
                elif scaling == "DEX":
                    total_damage += base + (caster.stats.get_effective("DEX") // 5)
                elif scaling == "INT":
                    total_damage += base + (caster.stats.get_effective("INT") // 5)
                elif scaling == "WIS":
                    total_damage += base + (caster.stats.get_effective("WIS") // 5)
                else:
                    total_damage += base
        
        return total_damage
    
    def calculate_heal(self, caster, potential: int = 0) -> int:
        """Calculate healing output."""
        total_heal = 0
        
        for effect in self.get_effects_with_potential(potential):
            if effect.kind == "heal":
                base = effect.params.get("amount", 0)
                scaling = effect.params.get("scaling", "")
                
                if scaling == "WIS":
                    total_heal += base + (caster.stats.get_effective("WIS") // 4)
                elif scaling == "INT":
                    total_heal += base + (caster.stats.get_effective("INT") // 4)
                else:
                    total_heal += base
        
        return total_heal
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize skill to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "tier": self.tier,
            "type": self.skill_type,
            "description": self.description,
            "tags": self.tags,
            "links": self.links,
            "costs": {
                "mp": self.costs.mp,
                "hp": self.costs.hp,
                "special": self.costs.special
            },
            "range": {
                "min": self.range_spec.min_range,
                "max": self.range_spec.max_range,
                "pattern": self.range_spec.pattern
            },
            "effects": [
                {
                    "kind": e.kind,
                    "params": e.params
                } for e in self.effects
            ],
            "potential_breakpoints": [
                {
                    "pt_threshold": bp.pt_threshold,
                    "bonus_effect": {
                        "kind": bp.bonus_effect.kind,
                        "params": bp.bonus_effect.params
                    }
                } for bp in self.potential_breakpoints
            ]
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Skill':
        """Deserialize skill from dictionary."""
        costs_data = data.get("costs", {})
        costs = SkillCost(
            mp=costs_data.get("mp", 0),
            hp=costs_data.get("hp", 0),
            special=costs_data.get("special")
        )
        
        range_data = data.get("range", {})
        range_spec = SkillRange(
            min_range=range_data.get("min", 0),
            max_range=range_data.get("max", 1),
            pattern=range_data.get("pattern", "single")
        )
        
        effects = [
            SkillEffect(kind=e["kind"], params=e.get("params", {}))
            for e in data.get("effects", [])
        ]
        
        breakpoints = []
        for bp in data.get("potential_breakpoints", []):
            bonus = bp.get("bonus_effect", {})
            breakpoints.append(
                PotentialBreakpoint(
                    pt_threshold=bp["pt_threshold"],
                    bonus_effect=SkillEffect(
                        kind=bonus["kind"],
                        params=bonus.get("params", {})
                    )
                )
            )
        
        return cls(
            id=data["id"],
            name=data["name"],
            tier=data["tier"],
            skill_type=data["type"],
            description=data.get("description", ""),
            tags=data.get("tags", []),
            links=data.get("links", []),
            costs=costs,
            range_spec=range_spec,
            effects=effects,
            potential_breakpoints=breakpoints
        )


class SkillGraph:
    """
    Manages the skill acquisition graph.
    """
    
    def __init__(self):
        self.skills: Dict[str, Skill] = {}
        self._initialize_base_skill()
    
    def _initialize_base_skill(self):
        """Create the base 'Life' skill that all normal characters start with."""
        life_skill = Skill(
            id="life",
            name="Life",
            tier=0,
            skill_type="passive",
            description="The fundamental spark of existence. All paths begin here.",
            tags=["base", "innate"],
            links=[],  # No prerequisites
            effects=[
                SkillEffect(
                    kind="stat_mod",
                    params={"HP": 10, "MP": 5}
                )
            ]
        )
        self.add_skill(life_skill)
    
    def add_skill(self, skill: Skill):
        """Add a skill to the graph."""
        self.skills[skill.id] = skill
    
    def get_skill(self, skill_id: str) -> Optional[Skill]:
        """Retrieve a skill by ID."""
        return self.skills.get(skill_id)
    
    def get_acquirable_skills(self, character) -> List[Skill]:
        """Get all skills the character can currently acquire."""
        acquirable = []
        for skill in self.skills.values():
            can_acquire, _ = skill.can_acquire(character, self)
            if can_acquire:
                acquirable.append(skill)
        return acquirable
    
    def acquire_skill(self, character, skill_id: str) -> tuple[bool, str]:
        """
        Attempt to acquire a skill for a character.
        Returns (success, message)
        """
        skill = self.get_skill(skill_id)
        if not skill:
            return False, f"Skill '{skill_id}' not found"
        
        can_acquire, reason = skill.can_acquire(character, self)
        if not can_acquire:
            return False, reason
        
        character.add_skill(skill_id)
        
        # Apply passive effects immediately
        if skill.skill_type == "passive" or skill.skill_type == "title":
            for effect in skill.effects:
                if effect.kind == "stat_mod":
                    for stat, value in effect.params.items():
                        character.stats.add_modifier(stat, value)
        
        return True, f"Acquired skill: {skill.name}"
    
    def get_skill_tree(self, start_skill_id: str, depth: int = 3) -> Dict[str, Any]:
        """Get a tree view of skills starting from a given skill."""
        def build_tree(skill_id: str, current_depth: int) -> Dict[str, Any]:
            if current_depth <= 0:
                return {}
            
            skill = self.get_skill(skill_id)
            if not skill:
                return {}
            
            children = {}
            # Find all skills that link TO this skill
            for other_id, other_skill in self.skills.items():
                if skill_id in other_skill.links:
                    children[other_id] = build_tree(other_id, current_depth - 1)
            
            return {
                "skill": skill.to_dict(),
                "children": children
            }
        
        return build_tree(start_skill_id, depth)
    
    def load_from_list(self, skill_data_list: List[Dict[str, Any]]):
        """Load multiple skills from a list of dictionaries."""
        for skill_data in skill_data_list:
            skill = Skill.from_dict(skill_data)
            self.add_skill(skill)
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize skill graph to dictionary."""
        return {
            "skills": [skill.to_dict() for skill in self.skills.values()]
        }
