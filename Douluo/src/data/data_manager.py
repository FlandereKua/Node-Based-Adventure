"""
Data management for importing/exporting game entities.
"""
import json
import os
from typing import Dict, Any, List, Optional
from pathlib import Path


class DataManager:
    """
    Handles loading and saving game data (characters, skills, maps, events).
    """
    
    def __init__(self, assets_dir: str = "assets"):
        self.assets_dir = Path(assets_dir)
        self.assets_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.assets_dir / "characters").mkdir(exist_ok=True)
        (self.assets_dir / "skills").mkdir(exist_ok=True)
        (self.assets_dir / "maps").mkdir(exist_ok=True)
        (self.assets_dir / "events").mkdir(exist_ok=True)
        (self.assets_dir / "trainings").mkdir(exist_ok=True)
        (self.assets_dir / "items").mkdir(exist_ok=True)
    
    def load_json(self, filepath: str) -> Optional[Dict[str, Any]]:
        """Load JSON data from file."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"File not found: {filepath}")
            return None
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from {filepath}: {e}")
            return None
    
    def save_json(self, data: Dict[str, Any], filepath: str):
        """Save data to JSON file."""
        try:
            # Create parent directory if it doesn't exist
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Saved data to: {filepath}")
        except Exception as e:
            print(f"Error saving to {filepath}: {e}")
    
    def load_characters(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load characters from assets directory."""
        if filename:
            filepath = self.assets_dir / "characters" / filename
            data = self.load_json(filepath)
            return data.get("characters", []) if data else []
        
        # Load all character files
        characters = []
        char_dir = self.assets_dir / "characters"
        for file in char_dir.glob("*.json"):
            data = self.load_json(file)
            if data and "characters" in data:
                characters.extend(data["characters"])
        
        return characters
    
    def save_characters(self, characters: List[Dict[str, Any]], filename: str = "characters.json"):
        """Save characters to assets directory."""
        filepath = self.assets_dir / "characters" / filename
        data = {"characters": characters}
        self.save_json(data, filepath)
    
    def load_skills(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load skills from assets directory."""
        if filename:
            filepath = self.assets_dir / "skills" / filename
            data = self.load_json(filepath)
            return data.get("skills", []) if data else []
        
        # Load all skill files
        skills = []
        skills_dir = self.assets_dir / "skills"
        for file in skills_dir.glob("*.json"):
            data = self.load_json(file)
            if data and "skills" in data:
                skills.extend(data["skills"])
        
        return skills
    
    def save_skills(self, skills: List[Dict[str, Any]], filename: str = "skills.json"):
        """Save skills to assets directory."""
        filepath = self.assets_dir / "skills" / filename
        data = {"skills": skills}
        self.save_json(data, filepath)
    
    def load_maps(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load maps from assets directory."""
        if filename:
            filepath = self.assets_dir / "maps" / filename
            data = self.load_json(filepath)
            return [data] if data else []
        
        # Load all map files
        maps = []
        maps_dir = self.assets_dir / "maps"
        for file in maps_dir.glob("*.json"):
            data = self.load_json(file)
            if data:
                maps.append(data)
        
        return maps
    
    def save_map(self, map_data: Dict[str, Any], filename: Optional[str] = None):
        """Save a map to assets directory."""
        if not filename:
            filename = f"{map_data.get('id', 'map')}.json"
        filepath = self.assets_dir / "maps" / filename
        self.save_json(map_data, filepath)
    
    def load_events(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load events from assets directory."""
        if filename:
            filepath = self.assets_dir / "events" / filename
            data = self.load_json(filepath)
            return data.get("events", []) if data else []
        
        # Load all event files
        events = []
        events_dir = self.assets_dir / "events"
        for file in events_dir.glob("*.json"):
            data = self.load_json(file)
            if data and "events" in data:
                events.extend(data["events"])
        
        return events
    
    def save_events(self, events: List[Dict[str, Any]], filename: str = "events.json"):
        """Save events to assets directory."""
        filepath = self.assets_dir / "events" / filename
        data = {"events": events}
        self.save_json(data, filepath)
    
    def load_trainings(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load trainings from assets directory."""
        if filename:
            filepath = self.assets_dir / "trainings" / filename
            data = self.load_json(filepath)
            return data.get("trainings", []) if data else []
        
        # Load all training files
        trainings = []
        trainings_dir = self.assets_dir / "trainings"
        for file in trainings_dir.glob("*.json"):
            data = self.load_json(file)
            if data and "trainings" in data:
                trainings.extend(data["trainings"])
        
        return trainings
    
    def save_trainings(self, trainings: List[Dict[str, Any]], filename: str = "trainings.json"):
        """Save trainings to assets directory."""
        filepath = self.assets_dir / "trainings" / filename
        data = {"trainings": trainings}
        self.save_json(data, filepath)
    
    def load_items(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load items from assets directory."""
        if filename:
            filepath = self.assets_dir / "items" / filename
            data = self.load_json(filepath)
            return data.get("items", []) if data else []
        
        # Load all item files
        items = []
        items_dir = self.assets_dir / "items"
        if items_dir.exists():
            for file in items_dir.glob("*.json"):
                if "loot" not in file.stem:  # Skip loot table files
                    data = self.load_json(file)
                    if data and "items" in data:
                        items.extend(data["items"])
        
        return items
    
    def save_items(self, items: List[Dict[str, Any]], filename: str = "items.json"):
        """Save items to assets directory."""
        filepath = self.assets_dir / "items" / filename
        data = {"items": items}
        self.save_json(data, filepath)
    
    def load_loot_tables(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load loot tables from assets directory."""
        if filename:
            filepath = self.assets_dir / "items" / filename
            data = self.load_json(filepath)
            return data.get("loot_tables", []) if data else []
        
        # Load all loot table files
        tables = []
        items_dir = self.assets_dir / "items"
        if items_dir.exists():
            for file in items_dir.glob("*loot*.json"):
                data = self.load_json(file)
                if data and "loot_tables" in data:
                    tables.extend(data["loot_tables"])
        
        return tables
    
    def save_loot_tables(self, tables: List[Dict[str, Any]], filename: str = "loot_tables.json"):
        """Save loot tables to assets directory."""
        filepath = self.assets_dir / "items" / filename
        data = {"loot_tables": tables}
        self.save_json(data, filepath)
    
    def create_sample_character(self) -> Dict[str, Any]:
        """Create a sample character template."""
        return {
            "id": "hero_001",
            "name": "Sample Hero",
            "tier": 1,
            "potential": 10,
            "stats": {
                "STR": 12,
                "DEX": 10,
                "INT": 8,
                "WIS": 10,
                "CHA": 12,
                "LCK": 10,
                "END": 11,
                "SPD": 9,
                "HP": 120,
                "MP": 50
            },
            "tags": ["warrior", "human", "melee"],
            "skills": ["life"],
            "is_ally": True
        }
    
    def create_sample_skill(self) -> Dict[str, Any]:
        """Create a sample skill template."""
        return {
            "id": "skill_001",
            "name": "Sample Attack",
            "tier": 1,
            "type": "active",
            "description": "A basic attack",
            "tags": ["physical", "melee"],
            "links": ["life"],
            "costs": {
                "mp": 5
            },
            "range": {
                "min": 0,
                "max": 1,
                "pattern": "single"
            },
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
    
    def create_sample_map(self) -> Dict[str, Any]:
        """Create a sample map template."""
        return {
            "id": "map_001",
            "name": "Sample Arena",
            "width": 20,
            "height": 15,
            "type": "battle",
            "description": "A simple battle arena",
            "tiles": [
                {"x": 2, "y": 7, "terrain": "normal", "deployment_team": "ally"},
                {"x": 3, "y": 7, "terrain": "normal", "deployment_team": "ally"},
                {"x": 17, "y": 7, "terrain": "normal", "deployment_team": "enemy"},
                {"x": 18, "y": 7, "terrain": "normal", "deployment_team": "enemy"}
            ]
        }
    
    def validate_schema(self, data: Dict[str, Any], schema_type: str) -> tuple[bool, str]:
        """
        Basic schema validation for imported data.
        Returns (is_valid, error_message)
        """
        required_fields = {
            "character": ["id", "name", "tier", "potential", "stats"],
            "skill": ["id", "name", "tier", "type"],
            "map": ["id", "name", "width", "height"],
            "event": ["id", "name"]
        }
        
        if schema_type not in required_fields:
            return False, f"Unknown schema type: {schema_type}"
        
        for field in required_fields[schema_type]:
            if field not in data:
                return False, f"Missing required field: {field}"
        
        return True, "Valid"
