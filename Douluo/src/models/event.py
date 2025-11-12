"""
Event and Training system for character progression.
"""
from typing import List, Dict, Optional, Any, Callable


class Event:
    """
    Represents a progression event that can modify character attributes.
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str = "",
        trigger_tags: Optional[List[str]] = None,
        trigger_conditions: Optional[Dict[str, Any]] = None,
        potential_gain: int = 0,
        stat_adjustments: Optional[Dict[str, int]] = None,
        tier_advancement: Optional[int] = None,
        unlocks_skills: Optional[List[str]] = None,
        adds_tags: Optional[List[str]] = None,
        notes: str = ""
    ):
        self.id = id
        self.name = name
        self.description = description
        self.trigger_tags = trigger_tags if trigger_tags else []
        self.trigger_conditions = trigger_conditions if trigger_conditions else {}
        self.potential_gain = potential_gain
        self.stat_adjustments = stat_adjustments if stat_adjustments else {}
        self.tier_advancement = tier_advancement
        self.unlocks_skills = unlocks_skills if unlocks_skills else []
        self.adds_tags = adds_tags if adds_tags else []
        self.notes = notes
    
    def can_trigger(self, character) -> tuple[bool, str]:
        """
        Check if this event can trigger for a character.
        Returns (can_trigger, reason)
        """
        # Check if character has required tags
        if self.trigger_tags:
            has_all_tags = all(tag in character.tags for tag in self.trigger_tags)
            if not has_all_tags:
                missing = [t for t in self.trigger_tags if t not in character.tags]
                return False, f"Missing required tags: {', '.join(missing)}"
        
        # Check additional conditions
        for condition, value in self.trigger_conditions.items():
            if condition == "min_tier":
                if character.tier < value:
                    return False, f"Tier {character.tier} < required {value}"
            
            elif condition == "min_potential":
                if character.potential < value:
                    return False, f"Potential {character.potential} < required {value}"
            
            elif condition == "min_stat":
                stat_name, min_value = value["stat"], value["min"]
                if character.stats.get_effective(stat_name) < min_value:
                    return False, f"{stat_name} {character.stats.get_effective(stat_name)} < required {min_value}"
            
            elif condition == "has_skill":
                if not character.has_skill(value):
                    return False, f"Missing required skill: {value}"
        
        return True, "Conditions met"
    
    def apply(self, character, config: Dict) -> str:
        """
        Apply event effects to character.
        Returns a message describing what happened.
        """
        messages = []
        
        # Apply potential gain
        if self.potential_gain > 0:
            old_pt = character.potential
            character.potential += self.potential_gain
            messages.append(f"Potential: {old_pt} → {character.potential} (+{self.potential_gain})")
        
        # Apply stat adjustments
        for stat, adjustment in self.stat_adjustments.items():
            old_value = getattr(character.stats, stat, 0)
            setattr(character.stats, stat, old_value + adjustment)
            messages.append(f"{stat}: {old_value} → {old_value + adjustment}")
        
        # Add tags
        for tag in self.adds_tags:
            if tag not in character.tags:
                character.tags.append(tag)
                messages.append(f"Gained tag: {tag}")
        
        # Tier advancement
        if self.tier_advancement is not None:
            pt_thresholds = config.get("potential_thresholds", {})
            if character.can_advance_tier(self.tier_advancement, pt_thresholds, events_met=True):
                old_tier = character.tier
                character.advance_tier(self.tier_advancement)
                tier_names = config.get("tier_names", {})
                old_name = tier_names.get(str(old_tier), f"Tier {old_tier}")
                new_name = tier_names.get(str(self.tier_advancement), f"Tier {self.tier_advancement}")
                messages.append(f"TIER UP: {old_name} → {new_name}!")
            else:
                messages.append(f"Cannot advance to tier {self.tier_advancement} (insufficient potential or requirements)")
        
        result = f"Event '{self.name}' triggered:\n" + "\n".join(f"  • {msg}" for msg in messages)
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize event to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "trigger_tags": self.trigger_tags,
            "trigger_conditions": self.trigger_conditions,
            "potential_gain": self.potential_gain,
            "stat_adjustments": self.stat_adjustments,
            "tier_advancement": self.tier_advancement,
            "unlocks_skills": self.unlocks_skills,
            "adds_tags": self.adds_tags,
            "notes": self.notes
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Deserialize event from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            trigger_tags=data.get("trigger_tags", []),
            trigger_conditions=data.get("trigger_conditions", {}),
            potential_gain=data.get("potential_gain", 0),
            stat_adjustments=data.get("stat_adjustments", {}),
            tier_advancement=data.get("tier_advancement"),
            unlocks_skills=data.get("unlocks_skills", []),
            adds_tags=data.get("adds_tags", []),
            notes=data.get("notes", "")
        )


class Training:
    """
    Represents a training session that improves character stats.
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str = "",
        stat_gains: Optional[Dict[str, int]] = None,
        potential_multiplier: float = 1.0,
        requirements: Optional[Dict[str, Any]] = None,
        cost: int = 0
    ):
        self.id = id
        self.name = name
        self.description = description
        self.stat_gains = stat_gains if stat_gains else {}
        self.potential_multiplier = potential_multiplier
        self.requirements = requirements if requirements else {}
        self.cost = cost
    
    def can_train(self, character) -> tuple[bool, str]:
        """Check if character meets training requirements."""
        for req, value in self.requirements.items():
            if req == "min_tier":
                if character.tier < value:
                    return False, f"Requires tier {value}"
            elif req == "has_tag":
                if value not in character.tags:
                    return False, f"Requires tag: {value}"
        
        return True, "Requirements met"
    
    def apply(self, character) -> str:
        """
        Apply training effects to character.
        Stat gains are scaled by potential.
        """
        messages = []
        
        # Calculate potential-based multiplier
        pt_bonus = 1.0
        if character.potential >= 100:
            pt_bonus = 2.0
        elif character.potential >= 50:
            pt_bonus = 1.5
        
        total_multiplier = self.potential_multiplier * pt_bonus
        
        # Apply stat gains
        for stat, base_gain in self.stat_gains.items():
            actual_gain = int(base_gain * total_multiplier)
            old_value = getattr(character.stats, stat, 0)
            setattr(character.stats, stat, old_value + actual_gain)
            messages.append(f"{stat}: {old_value} → {old_value + actual_gain} (+{actual_gain})")
        
        if total_multiplier > 1.0:
            messages.append(f"(Training enhanced {total_multiplier:.1f}x by potential!)")
        
        result = f"Training '{self.name}' completed:\n" + "\n".join(f"  • {msg}" for msg in messages)
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize training to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "stat_gains": self.stat_gains,
            "potential_multiplier": self.potential_multiplier,
            "requirements": self.requirements,
            "cost": self.cost
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Training':
        """Deserialize training from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            stat_gains=data.get("stat_gains", {}),
            potential_multiplier=data.get("potential_multiplier", 1.0),
            requirements=data.get("requirements", {}),
            cost=data.get("cost", 0)
        )


class EventManager:
    """Manages events and training sessions."""
    
    def __init__(self):
        self.events: Dict[str, Event] = {}
        self.trainings: Dict[str, Training] = {}
    
    def add_event(self, event: Event):
        """Add an event to the manager."""
        self.events[event.id] = event
    
    def add_training(self, training: Training):
        """Add a training to the manager."""
        self.trainings[training.id] = training
    
    def get_available_events(self, character) -> List[Event]:
        """Get all events that can trigger for a character."""
        available = []
        for event in self.events.values():
            can_trigger, _ = event.can_trigger(character)
            if can_trigger:
                available.append(event)
        return available
    
    def get_available_trainings(self, character) -> List[Training]:
        """Get all trainings available to a character."""
        available = []
        for training in self.trainings.values():
            can_train, _ = training.can_train(character)
            if can_train:
                available.append(training)
        return available
    
    def trigger_event(self, event_id: str, character, config: Dict) -> tuple[bool, str]:
        """Trigger an event for a character."""
        event = self.events.get(event_id)
        if not event:
            return False, f"Event '{event_id}' not found"
        
        can_trigger, reason = event.can_trigger(character)
        if not can_trigger:
            return False, reason
        
        result = event.apply(character, config)
        return True, result
    
    def perform_training(self, training_id: str, character) -> tuple[bool, str]:
        """Perform a training session for a character."""
        training = self.trainings.get(training_id)
        if not training:
            return False, f"Training '{training_id}' not found"
        
        can_train, reason = training.can_train(character)
        if not can_train:
            return False, reason
        
        result = training.apply(character)
        return True, result
    
    def load_events(self, events_data: List[Dict[str, Any]]):
        """Load events from list of dictionaries."""
        for event_data in events_data:
            event = Event.from_dict(event_data)
            self.add_event(event)
    
    def load_trainings(self, trainings_data: List[Dict[str, Any]]):
        """Load trainings from list of dictionaries."""
        for training_data in trainings_data:
            training = Training.from_dict(training_data)
            self.add_training(training)
