"""
Map and grid system for battles and exploration.
"""
from typing import List, Dict, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass


class TerrainType(Enum):
    """Types of terrain."""
    NORMAL = "normal"
    FOREST = "forest"
    MOUNTAIN = "mountain"
    WATER = "water"
    DESERT = "desert"
    SNOW = "snow"
    LAVA = "lava"
    VOID = "void"


class MapType(Enum):
    """Types of maps."""
    BATTLE = "battle"
    TOWN = "town"


@dataclass
class FieldEffect:
    """Field effects that modify tile properties."""
    name: str
    stat_modifiers: Dict[str, int]
    damage_per_turn: int = 0
    movement_cost_modifier: float = 1.0
    duration: int = -1  # -1 = permanent


@dataclass
class Tile:
    """Represents a single tile on the map."""
    x: int
    y: int
    terrain: str = "normal"
    hazard: Optional[str] = None  # Fire, poison cloud, ice, etc.
    field_effect: Optional[FieldEffect] = None
    movement_cost: float = 1.0
    is_passable: bool = True
    is_deployment_zone: bool = False  # For initial placement
    deployment_team: Optional[str] = None  # "ally" or "enemy"


class GameMap:
    """
    Represents a battle or town map with grid-based tiles.
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        width: int,
        height: int,
        map_type: str = "battle",
        description: str = ""
    ):
        self.id = id
        self.name = name
        self.width = width
        self.height = height
        self.map_type = map_type
        self.description = description
        
        # Initialize grid
        self.tiles: List[List[Tile]] = []
        for y in range(height):
            row = []
            for x in range(width):
                row.append(Tile(x=x, y=y))
            self.tiles.append(row)
        
        # Deployment zones
        self.ally_deployment: List[Tuple[int, int]] = []
        self.enemy_deployment: List[Tuple[int, int]] = []
    
    def get_tile(self, x: int, y: int) -> Optional[Tile]:
        """Get tile at position."""
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.tiles[y][x]
        return None
    
    def set_terrain(self, x: int, y: int, terrain: str):
        """Set terrain type for a tile."""
        tile = self.get_tile(x, y)
        if tile:
            tile.terrain = terrain
            # Update movement cost based on terrain
            terrain_costs = {
                "normal": 1.0,
                "forest": 1.5,
                "mountain": 2.0,
                "water": 2.5,
                "desert": 1.2,
                "snow": 1.5,
                "lava": 3.0,
                "void": float('inf')  # Impassable
            }
            tile.movement_cost = terrain_costs.get(terrain, 1.0)
            tile.is_passable = (terrain != "void" and tile.movement_cost < float('inf'))
    
    def set_hazard(self, x: int, y: int, hazard: str):
        """Set hazard on a tile."""
        tile = self.get_tile(x, y)
        if tile:
            tile.hazard = hazard
    
    def set_field_effect(self, x: int, y: int, effect: FieldEffect):
        """Apply a field effect to a tile."""
        tile = self.get_tile(x, y)
        if tile:
            tile.field_effect = effect
    
    def add_deployment_zone(self, x: int, y: int, team: str):
        """Mark a tile as a deployment zone."""
        tile = self.get_tile(x, y)
        if tile:
            tile.is_deployment_zone = True
            tile.deployment_team = team
            
            if team == "ally":
                self.ally_deployment.append((x, y))
            elif team == "enemy":
                self.enemy_deployment.append((x, y))
    
    def is_valid_position(self, x: int, y: int) -> bool:
        """Check if position is valid and passable."""
        tile = self.get_tile(x, y)
        return tile is not None and tile.is_passable
    
    def manhattan_distance(self, x1: int, y1: int, x2: int, y2: int) -> int:
        """Calculate Manhattan distance between two points."""
        return abs(x2 - x1) + abs(y2 - y1)
    
    def diagonal_distance(self, x1: int, y1: int, x2: int, y2: int) -> int:
        """Calculate diagonal distance (Chebyshev distance)."""
        return max(abs(x2 - x1), abs(y2 - y1))
    
    def get_tiles_in_range(
        self,
        center_x: int,
        center_y: int,
        min_range: int,
        max_range: int,
        pattern: str = "radial"
    ) -> List[Tuple[int, int]]:
        """
        Get all tiles within range based on pattern.
        Pattern types: radial, line, cone, single
        """
        tiles = []
        
        if pattern == "single":
            if self.is_valid_position(center_x, center_y):
                return [(center_x, center_y)]
            return []
        
        elif pattern == "radial":
            for y in range(self.height):
                for x in range(self.width):
                    dist = self.diagonal_distance(center_x, center_y, x, y)
                    if min_range <= dist <= max_range:
                        tiles.append((x, y))
        
        elif pattern == "line":
            # Simple implementation: all tiles in straight lines from center
            for d in range(min_range, max_range + 1):
                # Cardinal directions
                for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                    x, y = center_x + dx * d, center_y + dy * d
                    if self.is_valid_position(x, y):
                        tiles.append((x, y))
        
        elif pattern == "cone":
            # Simplified cone: 90-degree arc in one direction
            # Would need direction parameter for full implementation
            for y in range(center_y - max_range, center_y + max_range + 1):
                for x in range(center_x, center_x + max_range + 1):
                    dist = self.diagonal_distance(center_x, center_y, x, y)
                    if min_range <= dist <= max_range:
                        tiles.append((x, y))
        
        return tiles
    
    def get_neighbors(self, x: int, y: int, include_diagonal: bool = True) -> List[Tuple[int, int]]:
        """Get neighboring tiles."""
        neighbors = []
        directions = [
            (0, 1), (0, -1), (1, 0), (-1, 0)  # Orthogonal
        ]
        
        if include_diagonal:
            directions += [
                (1, 1), (1, -1), (-1, 1), (-1, -1)  # Diagonal
            ]
        
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if self.is_valid_position(nx, ny):
                neighbors.append((nx, ny))
        
        return neighbors
    
    def find_path(self, start: Tuple[int, int], end: Tuple[int, int]) -> Optional[List[Tuple[int, int]]]:
        """
        Simple A* pathfinding.
        Returns list of (x, y) positions from start to end, or None if no path.
        """
        from heapq import heappush, heappop
        
        start_x, start_y = start
        end_x, end_y = end
        
        if not self.is_valid_position(end_x, end_y):
            return None
        
        open_set = []
        heappush(open_set, (0, start))
        
        came_from = {}
        g_score = {start: 0}
        f_score = {start: self.diagonal_distance(start_x, start_y, end_x, end_y)}
        
        while open_set:
            _, current = heappop(open_set)
            
            if current == end:
                # Reconstruct path
                path = []
                while current in came_from:
                    path.append(current)
                    current = came_from[current]
                path.append(start)
                path.reverse()
                return path
            
            cx, cy = current
            for neighbor in self.get_neighbors(cx, cy):
                nx, ny = neighbor
                tile = self.get_tile(nx, ny)
                tentative_g = g_score[current] + tile.movement_cost
                
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f = tentative_g + self.diagonal_distance(nx, ny, end_x, end_y)
                    f_score[neighbor] = f
                    heappush(open_set, (f, neighbor))
        
        return None  # No path found
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize map to dictionary."""
        tiles_data = []
        for y in range(self.height):
            for x in range(self.width):
                tile = self.tiles[y][x]
                tile_data = {
                    "x": tile.x,
                    "y": tile.y,
                    "terrain": tile.terrain
                }
                
                if tile.hazard:
                    tile_data["hazard"] = tile.hazard
                
                if tile.field_effect:
                    tile_data["field_effect"] = {
                        "name": tile.field_effect.name,
                        "stat_modifiers": tile.field_effect.stat_modifiers,
                        "damage_per_turn": tile.field_effect.damage_per_turn,
                        "movement_cost_modifier": tile.field_effect.movement_cost_modifier,
                        "duration": tile.field_effect.duration
                    }
                
                if tile.is_deployment_zone:
                    tile_data["deployment_team"] = tile.deployment_team
                
                # Only include non-default tiles
                if len(tile_data) > 3:
                    tiles_data.append(tile_data)
        
        return {
            "id": self.id,
            "name": self.name,
            "width": self.width,
            "height": self.height,
            "type": self.map_type,
            "description": self.description,
            "tiles": tiles_data
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GameMap':
        """Deserialize map from dictionary."""
        game_map = cls(
            id=data["id"],
            name=data["name"],
            width=data["width"],
            height=data["height"],
            map_type=data.get("type", "battle"),
            description=data.get("description", "")
        )
        
        # Load tile data
        for tile_data in data.get("tiles", []):
            x = tile_data["x"]
            y = tile_data["y"]
            
            if "terrain" in tile_data:
                game_map.set_terrain(x, y, tile_data["terrain"])
            
            if "hazard" in tile_data:
                game_map.set_hazard(x, y, tile_data["hazard"])
            
            if "field_effect" in tile_data:
                fe = tile_data["field_effect"]
                effect = FieldEffect(
                    name=fe["name"],
                    stat_modifiers=fe.get("stat_modifiers", {}),
                    damage_per_turn=fe.get("damage_per_turn", 0),
                    movement_cost_modifier=fe.get("movement_cost_modifier", 1.0),
                    duration=fe.get("duration", -1)
                )
                game_map.set_field_effect(x, y, effect)
            
            if "deployment_team" in tile_data:
                game_map.add_deployment_zone(x, y, tile_data["deployment_team"])
        
        return game_map
