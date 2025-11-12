"""
Main game entry point with Pygame UI.
"""
import pygame
import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.models.character import Character
from src.models.skill import SkillGraph, Skill
from src.models.map import GameMap
from src.models.event import Event, Training, EventManager
from src.models.item import Item, Inventory, LootTable
from src.combat.engine import CombatEngine, CombatAction
from src.data.data_manager import DataManager


# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GRAY = (128, 128, 128)
LIGHT_GRAY = (200, 200, 200)
DARK_GRAY = (64, 64, 64)
GREEN = (0, 200, 0)
DARK_GREEN = (0, 100, 0)
RED = (200, 0, 0)
DARK_RED = (100, 0, 0)
BLUE = (0, 0, 200)
LIGHT_BLUE = (100, 150, 255)
YELLOW = (255, 255, 0)
ORANGE = (255, 165, 0)

# Terrain colors
TERRAIN_COLORS = {
    "normal": (180, 180, 150),
    "forest": (34, 139, 34),
    "mountain": (105, 105, 105),
    "water": (65, 105, 225),
    "desert": (244, 164, 96),
    "snow": (255, 250, 250),
    "lava": (178, 34, 34),
    "void": (0, 0, 0)
}


class GameUI:
    """Main game UI using Pygame."""
    
    def __init__(self):
        pygame.init()
        
        # Window settings
        self.screen_width = 1280
        self.screen_height = 720
        self.screen = pygame.display.set_mode((self.screen_width, self.screen_height))
        pygame.display.set_caption("Douluo - Turn-Based Grid RPG")
        
        # Fonts
        self.font_small = pygame.font.Font(None, 20)
        self.font_medium = pygame.font.Font(None, 28)
        self.font_large = pygame.font.Font(None, 36)
        
        # Game state
        self.clock = pygame.time.Clock()
        self.running = True
        self.fps = 60
        
        # Data managers
        self.data_manager = DataManager()
        self.skill_graph = SkillGraph()
        self.event_manager = EventManager()
        
        # Load config
        with open("config/game_config.json", 'r') as f:
            self.config = json.load(f)
        
        # Game objects
        self.characters = {}
        self.game_map = None
        self.combat_engine = None
        
        # Item system
        self.item_database: Dict[str, Item] = {}
        self.loot_tables: Dict[str, LootTable] = {}
        self.party_inventory = Inventory(max_slots=100)
        
        # UI state
        self.selected_character = None
        self.hovered_tile = None
        self.camera_offset = [0, 0]
        self.tile_size = 32
        
        # UI panels
        self.status_panel_rect = pygame.Rect(920, 10, 350, 300)
        self.action_panel_rect = pygame.Rect(920, 320, 350, 200)
        self.turn_order_rect = pygame.Rect(10, 10, 200, 700)
        self.log_panel_rect = pygame.Rect(220, 550, 690, 160)
        
        # Initialize game
        self.initialize_game()
    
    def initialize_game(self):
        """Load game data and set up initial state."""
        print("Initializing game...")
        
        # Load skills
        skills_data = self.data_manager.load_skills()
        self.skill_graph.load_from_list(skills_data)
        print(f"Loaded {len(skills_data)} skills")
        
        # Load characters
        chars_data = self.data_manager.load_characters()
        for char_data in chars_data:
            char = Character.from_dict(char_data)
            self.characters[char.id] = char
        print(f"Loaded {len(chars_data)} characters")
        
        # Load events and trainings
        events_data = self.data_manager.load_events()
        self.event_manager.load_events(events_data)
        trainings_data = self.data_manager.load_trainings()
        self.event_manager.load_trainings(trainings_data)
        print(f"Loaded {len(events_data)} events, {len(trainings_data)} trainings")
        
        # Load items
        items_data = self.data_manager.load_items()
        for item_data in items_data:
            item = Item.from_dict(item_data)
            self.item_database[item.id] = item
        print(f"Loaded {len(items_data)} items")
        
        # Load loot tables
        loot_data = self.data_manager.load_loot_tables()
        for table_data in loot_data:
            table = LootTable.from_dict(table_data)
            self.loot_tables[table.id] = table
        print(f"Loaded {len(loot_data)} loot tables")
        
        # Give party some starting items
        self.party_inventory.add_item(self.item_database.get("health_potion"), 5)
        self.party_inventory.add_item(self.item_database.get("mana_potion"), 3)
        
        # Load map
        maps_data = self.data_manager.load_maps()
        if maps_data:
            self.game_map = GameMap.from_dict(maps_data[0])
            print(f"Loaded map: {self.game_map.name}")
        
        # Initialize combat
        if self.game_map:
            self.setup_combat()
    
    def setup_combat(self):
        """Set up a combat scenario."""
        self.combat_engine = CombatEngine(self.game_map, self.config)
        self.combat_engine.skill_graph = self.skill_graph
        
        # Deploy allies
        allies = [c for c in self.characters.values() if c.is_ally]
        for i, char in enumerate(allies[:2]):
            if i < len(self.game_map.ally_deployment):
                pos = self.game_map.ally_deployment[i]
                self.combat_engine.add_character(char, pos)
        
        # Deploy enemies
        enemies = [c for c in self.characters.values() if not c.is_ally]
        for i, char in enumerate(enemies[:2]):
            if i < len(self.game_map.enemy_deployment):
                pos = self.game_map.enemy_deployment[i]
                self.combat_engine.add_character(char, pos)
        
        # Start combat
        self.combat_engine.start_combat()
        print("Combat started!")
    
    def handle_events(self):
        """Handle pygame events."""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left click
                    self.handle_left_click(event.pos)
                elif event.button == 3:  # Right click
                    self.handle_right_click(event.pos)
            
            elif event.type == pygame.KEYDOWN:
                self.handle_keypress(event.key)
    
    def handle_left_click(self, pos):
        """Handle left mouse click."""
        # Check if clicking on map
        tile_x, tile_y = self.screen_to_tile(pos)
        if 0 <= tile_x < self.game_map.width and 0 <= tile_y < self.game_map.height:
            # Select character at tile
            chars_at_pos = self.combat_engine.get_characters_at_position(tile_x, tile_y)
            if chars_at_pos:
                self.selected_character = chars_at_pos[0]
                print(f"Selected: {self.selected_character.name}")
    
    def handle_right_click(self, pos):
        """Handle right mouse click - show action menu."""
        if self.selected_character:
            print(f"Action menu for {self.selected_character.name}")
            # Simple action: wait/end turn
            if self.combat_engine.get_current_character() == self.selected_character:
                self.combat_engine.next_turn()
    
    def handle_keypress(self, key):
        """Handle keyboard input."""
        if key == pygame.K_SPACE:
            # Next turn
            if self.combat_engine and self.combat_engine.combat_active:
                old_active = self.combat_engine.combat_active
                self.combat_engine.next_turn()
                # Check if combat just ended
                if old_active and not self.combat_engine.combat_active:
                    self.handle_combat_end()
        
        elif key == pygame.K_ESCAPE:
            self.running = False
        
        elif key == pygame.K_i:
            # Show inventory (toggle)
            self.show_inventory_panel()
        
        elif key == pygame.K_h:
            # Use health potion on selected character
            if self.selected_character and self.selected_character.is_ally:
                self.use_item_on_character("health_potion", self.selected_character)
        
        # Camera controls
        elif key == pygame.K_LEFT:
            self.camera_offset[0] += 32
        elif key == pygame.K_RIGHT:
            self.camera_offset[0] -= 32
        elif key == pygame.K_UP:
            self.camera_offset[1] += 32
        elif key == pygame.K_DOWN:
            self.camera_offset[1] -= 32
    
    def handle_combat_end(self):
        """Handle end of combat - award loot."""
        if not self.combat_engine:
            return
        
        print("\n=== Combat Ended - Rolling for Loot ===")
        
        # Calculate average party luck
        allies = [c for c in self.combat_engine.characters.values() if c.is_ally and c.is_alive()]
        avg_luck = sum(c.stats.get_effective("LCK") for c in allies) // max(1, len(allies))
        
        # Roll loot from defeated enemies
        defeated = self.combat_engine.get_defeated_enemies()
        for enemy in defeated:
            # Determine loot table based on enemy tags
            loot_table_id = None
            if "goblin" in enemy.tags:
                loot_table_id = "goblin_loot"
            elif "orc" in enemy.tags:
                loot_table_id = "orc_loot"
            elif "boss" in enemy.tags:
                loot_table_id = "boss_loot"
            
            if loot_table_id and loot_table_id in self.loot_tables:
                table = self.loot_tables[loot_table_id]
                drops = table.roll_loot(avg_luck, self.item_database)
                
                for item, quantity in drops:
                    success, msg = self.party_inventory.add_item(item, quantity)
                    print(f"  Looted: {msg}")
        
        print("=== Loot Collection Complete ===\n")
    
    def use_item_on_character(self, item_id: str, character):
        """Use an item from inventory on a character."""
        if not self.party_inventory.has_item(item_id):
            print(f"No {item_id} in inventory")
            return
        
        item = self.party_inventory.get_item(item_id)
        if not item:
            return
        
        can_use, reason = item.can_use(character, in_combat=self.combat_engine.combat_active)
        if not can_use:
            print(f"Cannot use {item.name}: {reason}")
            return
        
        # Use the item
        result = item.use(character, self.config, in_combat=self.combat_engine.combat_active)
        print(result)
        
        # Remove from inventory
        self.party_inventory.remove_item(item_id, 1)
    
    def show_inventory_panel(self):
        """Display inventory contents (console for now)."""
        print("\n=== PARTY INVENTORY ===")
        items = self.party_inventory.get_all_items()
        
        if not items:
            print("  Empty")
        else:
            for item, quantity in items:
                print(f"  {item.name} x{quantity} ({item.rarity})")
        
        print("========================\n")
    
    def screen_to_tile(self, screen_pos):
        """Convert screen coordinates to tile coordinates."""
        map_start_x = 220
        map_start_y = 10
        
        tile_x = (screen_pos[0] - map_start_x - self.camera_offset[0]) // self.tile_size
        tile_y = (screen_pos[1] - map_start_y - self.camera_offset[1]) // self.tile_size
        return int(tile_x), int(tile_y)
    
    def tile_to_screen(self, tile_x, tile_y):
        """Convert tile coordinates to screen coordinates."""
        map_start_x = 220
        map_start_y = 10
        
        screen_x = map_start_x + tile_x * self.tile_size + self.camera_offset[0]
        screen_y = map_start_y + tile_y * self.tile_size + self.camera_offset[1]
        return screen_x, screen_y
    
    def render(self):
        """Render the game state."""
        self.screen.fill(BLACK)
        
        if self.game_map:
            self.render_map()
            self.render_characters()
        
        self.render_turn_order()
        self.render_status_panel()
        self.render_action_panel()
        self.render_log_panel()
        
        pygame.display.flip()
    
    def render_map(self):
        """Render the game map."""
        map_start_x = 220
        map_start_y = 10
        
        for y in range(self.game_map.height):
            for x in range(self.game_map.width):
                tile = self.game_map.get_tile(x, y)
                screen_x, screen_y = self.tile_to_screen(x, y)
                
                # Get terrain color
                color = TERRAIN_COLORS.get(tile.terrain, GRAY)
                
                # Draw tile
                rect = pygame.Rect(screen_x, screen_y, self.tile_size, self.tile_size)
                pygame.draw.rect(self.screen, color, rect)
                pygame.draw.rect(self.screen, DARK_GRAY, rect, 1)
                
                # Highlight deployment zones
                if tile.is_deployment_zone:
                    border_color = GREEN if tile.deployment_team == "ally" else RED
                    pygame.draw.rect(self.screen, border_color, rect, 2)
    
    def render_characters(self):
        """Render character tokens on the map."""
        if not self.combat_engine:
            return
        
        for character in self.combat_engine.characters.values():
            if character.position:
                x, y = character.position
                screen_x, screen_y = self.tile_to_screen(x, y)
                
                # Token circle
                center = (screen_x + self.tile_size // 2, screen_y + self.tile_size // 2)
                radius = self.tile_size // 3
                
                color = LIGHT_BLUE if character.is_ally else ORANGE
                pygame.draw.circle(self.screen, color, center, radius)
                pygame.draw.circle(self.screen, BLACK, center, radius, 2)
                
                # HP bar
                hp_ratio = character.current_hp / character.stats.HP
                bar_width = self.tile_size - 4
                bar_height = 4
                bar_x = screen_x + 2
                bar_y = screen_y + self.tile_size - 6
                
                pygame.draw.rect(self.screen, DARK_RED, 
                               (bar_x, bar_y, bar_width, bar_height))
                pygame.draw.rect(self.screen, GREEN, 
                               (bar_x, bar_y, int(bar_width * hp_ratio), bar_height))
                
                # Highlight selected
                if character == self.selected_character:
                    rect = pygame.Rect(screen_x, screen_y, self.tile_size, self.tile_size)
                    pygame.draw.rect(self.screen, YELLOW, rect, 3)
                
                # Highlight current turn
                if self.combat_engine.get_current_character() == character:
                    rect = pygame.Rect(screen_x - 2, screen_y - 2, 
                                     self.tile_size + 4, self.tile_size + 4)
                    pygame.draw.rect(self.screen, WHITE, rect, 2)
    
    def render_turn_order(self):
        """Render turn order list."""
        pygame.draw.rect(self.screen, DARK_GRAY, self.turn_order_rect)
        pygame.draw.rect(self.screen, WHITE, self.turn_order_rect, 2)
        
        title = self.font_medium.render("Turn Order", True, WHITE)
        self.screen.blit(title, (self.turn_order_rect.x + 10, self.turn_order_rect.y + 10))
        
        if not self.combat_engine:
            return
        
        y_offset = 50
        for i, char_id in enumerate(self.combat_engine.turn_order):
            char = self.combat_engine.characters.get(char_id)
            if not char:
                continue
            
            # Highlight current turn
            color = YELLOW if i == self.combat_engine.current_turn_index else WHITE
            
            name_text = self.font_small.render(f"{i+1}. {char.name}", True, color)
            spd_text = self.font_small.render(f"SPD:{char.stats.get_effective('SPD')}", True, color)
            
            self.screen.blit(name_text, (self.turn_order_rect.x + 10, 
                                        self.turn_order_rect.y + y_offset))
            self.screen.blit(spd_text, (self.turn_order_rect.x + 140, 
                                       self.turn_order_rect.y + y_offset))
            
            y_offset += 25
    
    def render_status_panel(self):
        """Render character status panel."""
        pygame.draw.rect(self.screen, DARK_GRAY, self.status_panel_rect)
        pygame.draw.rect(self.screen, WHITE, self.status_panel_rect, 2)
        
        if not self.selected_character:
            text = self.font_medium.render("No character selected", True, WHITE)
            self.screen.blit(text, (self.status_panel_rect.x + 10, 
                                   self.status_panel_rect.y + 10))
            return
        
        char = self.selected_character
        y_offset = 10
        
        # Name and tier
        name = self.font_large.render(char.name, True, YELLOW)
        self.screen.blit(name, (self.status_panel_rect.x + 10, 
                               self.status_panel_rect.y + y_offset))
        y_offset += 40
        
        tier_name = self.config["tier_names"].get(str(char.tier), f"Tier {char.tier}")
        tier_text = self.font_small.render(f"{tier_name} (PT: {char.potential})", True, WHITE)
        self.screen.blit(tier_text, (self.status_panel_rect.x + 10, 
                                    self.status_panel_rect.y + y_offset))
        y_offset += 25
        
        # HP/MP
        hp_text = self.font_small.render(
            f"HP: {char.current_hp}/{char.stats.HP}", True, GREEN)
        mp_text = self.font_small.render(
            f"MP: {char.current_mp}/{char.stats.MP}", True, BLUE)
        
        self.screen.blit(hp_text, (self.status_panel_rect.x + 10, 
                                  self.status_panel_rect.y + y_offset))
        self.screen.blit(mp_text, (self.status_panel_rect.x + 180, 
                                  self.status_panel_rect.y + y_offset))
        y_offset += 25
        
        # Stats
        stats = ["STR", "DEX", "INT", "WIS", "END", "SPD"]
        for i, stat in enumerate(stats):
            value = char.stats.get_effective(stat)
            stat_text = self.font_small.render(f"{stat}: {value}", True, WHITE)
            
            x_pos = self.status_panel_rect.x + 10 + (i % 3) * 110
            y_pos = self.status_panel_rect.y + y_offset + (i // 3) * 20
            
            self.screen.blit(stat_text, (x_pos, y_pos))
        
        y_offset += 50
        
        # Skills
        skills_text = self.font_small.render("Skills:", True, WHITE)
        self.screen.blit(skills_text, (self.status_panel_rect.x + 10, 
                                      self.status_panel_rect.y + y_offset))
        y_offset += 20
        
        for skill_id in char.skills[:5]:  # Show first 5
            skill = self.skill_graph.get_skill(skill_id)
            if skill:
                skill_text = self.font_small.render(f"• {skill.name}", True, LIGHT_GRAY)
                self.screen.blit(skill_text, (self.status_panel_rect.x + 20, 
                                             self.status_panel_rect.y + y_offset))
                y_offset += 18
    
    def render_action_panel(self):
        """Render action panel."""
        pygame.draw.rect(self.screen, DARK_GRAY, self.action_panel_rect)
        pygame.draw.rect(self.screen, WHITE, self.action_panel_rect, 2)
        
        title = self.font_medium.render("Actions", True, WHITE)
        self.screen.blit(title, (self.action_panel_rect.x + 10, 
                                self.action_panel_rect.y + 10))
        
        # Instructions
        instructions = [
            "SPACE - Next Turn",
            "H - Use Health Potion",
            "I - Show Inventory",
            "Left Click - Select",
            "Right Click - Action",
            "Arrows - Camera",
            "ESC - Quit"
        ]
        
        y_offset = 50
        for instruction in instructions:
            text = self.font_small.render(instruction, True, WHITE)
            self.screen.blit(text, (self.action_panel_rect.x + 10, 
                                   self.action_panel_rect.y + y_offset))
            y_offset += 22
    
    def render_log_panel(self):
        """Render combat log."""
        pygame.draw.rect(self.screen, DARK_GRAY, self.log_panel_rect)
        pygame.draw.rect(self.screen, WHITE, self.log_panel_rect, 2)
        
        title = self.font_medium.render("Combat Log", True, WHITE)
        self.screen.blit(title, (self.log_panel_rect.x + 10, 
                                self.log_panel_rect.y + 10))
        
        if not self.combat_engine:
            return
        
        # Show recent log entries
        recent_logs = self.combat_engine.log.get_recent(6)
        y_offset = 40
        
        for log_entry in recent_logs:
            # Truncate if too long
            if len(log_entry) > 80:
                log_entry = log_entry[:77] + "..."
            
            text = self.font_small.render(log_entry, True, LIGHT_GRAY)
            self.screen.blit(text, (self.log_panel_rect.x + 10, 
                                   self.log_panel_rect.y + y_offset))
            y_offset += 18
    
    def run(self):
        """Main game loop."""
        while self.running:
            self.handle_events()
            self.render()
            self.clock.tick(self.fps)
        
        pygame.quit()
        sys.exit()


def main():
    """Entry point."""
    print("=" * 50)
    print("Douluo - Turn-Based Grid RPG")
    print("=" * 50)
    
    game = GameUI()
    game.run()


if __name__ == "__main__":
    main()
