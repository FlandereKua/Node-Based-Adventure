# Node-Based Adventure Tracker - Enhanced Skill System Usage Manual

## 📚 Table of Contents
1. [Getting Started](#getting-started)
2. [Skill System Overview](#skill-system-overview)  
3. [Using Skills in Combat](#using-skills-in-combat)
4. [Advanced Skill Mechanics](#advanced-skill-mechanics)
5. [Skill Management](#skill-management)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Starting the Server
```bash
cd tracker
npm install  # First time only
node server.js
```
The server will start on `http://localhost:3000` by default, or use `PORT=3001 node server.js` for a different port.

### Basic Workflow
1. **Create a Session** - Start a new tracking session
2. **Add Characters** - Load character sheets with skills
3. **Start Combat** - Add monsters and begin turn tracking
4. **Use Skills** - Click "Use Skill" buttons to execute abilities
5. **Roll Dice** - Use the integrated dice system for damage/effects

---

## ⚔️ Skill System Overview

The tracker supports two skill formats that work seamlessly together:

### **Basic Skills (Legacy)**
- Simple skill definitions
- Basic MP cost parsing from descriptions
- Manual dice rolling required

### **Enhanced Skills (New)**
- Advanced dice mechanics with automatic rolling
- Resource cost enforcement (MP/HP)
- Conditional effects and triggers
- Stat modifiers and buffs/debuffs
- Enhanced targeting system

---

## 🎯 Using Skills in Combat

### Step 1: Select Character Context
1. Open the **Skills Panel** for a character
2. The skill overlay shows available skills
3. Skills are categorized as **Active** or **Passive**

### Step 2: Execute Active Skills
1. Click **"Use Skill"** button next to an active skill
2. **Resource Check**: System validates MP/HP costs
3. **Targeting**: Select valid targets (allies/enemies)
4. **Dice Rolling**: Automatic for enhanced skills
5. **Effect Application**: Damage, healing, buffs applied automatically

### Step 3: Monitor Results
- **Toast Notifications**: Show skill usage and results
- **Resource Updates**: MP/HP automatically deducted
- **Effect Tracking**: Stat changes applied to character sheets

---

## 🎲 Advanced Skill Mechanics

### **Dice Expressions**
Enhanced skills support various dice formats:
- `1D3` - Roll 1 three-sided die
- `2D6` - Roll 2 six-sided dice
- `1D12+3` - Roll 1 twelve-sided die plus 3

### **Critical Hit System**
- **Custom Crit Ranges**: Skills can define when crits occur
- **Crit Effects**: Special bonuses on critical hits
- **Min/Max Roll Effects**: Unique outcomes for extreme rolls

### **Effect Types**
1. **Stat Modifiers**: `+1 STR`, `-2 DEX`, etc.
2. **Damage Effects**: Direct HP damage
3. **Healing Effects**: HP restoration  
4. **Special Effects**: Custom mechanics and conditions

### **Effect Triggers**
- `onUse` - When skill is activated
- `onHit` - When attack connects
- `onCrit` - On critical hits
- `onKill` - When enemy is defeated
- `onMinRoll` - On minimum dice value
- `onMaxRoll` - On maximum dice value
- `passive` - Always active
- `conditional` - Context-dependent

---

## 🛠️ Skill Management

### **Adding New Skills**
1. Create `.md` file in `Node Graph/` directory
2. Use the enhanced skill format (see examples)
3. Server automatically parses new skills
4. Refresh skills in the tracker

### **Skill Format Example**
```markdown
# Flame Slash

A blazing hot red slash, using magic, not oils.

## Quick Info
| **Tier** | 2 #Uncommon |
| **Type** | #Active #Fire #Burn #Slash |

### Effect Details:
- **Attack**: 1D5 damage
- **Cost**: 3 MP
- **Max Roll**: Applies burn effect to target

### Prerequisites
- [[Slash]]
- [[Ember]]
```

### **Skill Properties**
- **Tier**: Skill level (1-7)
- **Rarity**: Common, Uncommon, Rare, Epic, Legendary
- **Type Tags**: Active/Passive, element, mechanics
- **Dice Expression**: Damage formula
- **Resource Costs**: MP/HP requirements
- **Effects**: What the skill does
- **Prerequisites**: Required skills

---

## 📊 Character Integration

### **Passive Skills**
- Automatically applied when learned
- Provide permanent stat bonuses
- Examples: `Basic Footwork` (+1 DEX, +1 SPD)

### **Active Skills** 
- Must be manually activated
- Consume resources (MP/HP)
- Examples: `Slash` (1D3 damage, 1 MP)

### **Resource Management**
- **MP (Mana Points)**: Primary resource for most skills
- **HP (Health Points)**: Some skills require health sacrifice
- **Validation**: System prevents usage without sufficient resources

---

## 🎮 Combat Examples

### Example 1: Basic Attack
1. Character has `Slash` skill learned
2. Click "Use Skill" → targeting opens
3. Select enemy target → confirm
4. System rolls 1D3, deducts 1 MP
5. Damage applied to target

### Example 2: Advanced Skill
1. Character uses `Focused Cleave` (1D12, 3 MP)
2. System checks: Has 3+ MP? ✓
3. Auto-rolls 1D12 → result: 8
4. Applies 8 damage to target
5. Deducts 3 MP from caster

### Example 3: Special Effects
1. Character uses skill with `Red Dices` passive
2. Rolls maximum value → triggers double strike
3. Rolls minimum value → suffers -3 STR penalty
4. Effects automatically applied

---

## 🔧 Troubleshooting

### **"Use Skill" Button Not Working**
✅ **Fixed**: Server response format corrected
- Check browser console for errors
- Verify skills are loading (`Loaded enhanced skills: X skills`)
- Ensure character context is selected

### **Skills Not Loading**
- Restart server after adding new skill files
- Check `.md` file format in `Node Graph/`
- Verify server endpoint: `/api/skills-enhanced`

### **Resource Costs Not Working**
- Enhanced skills: Automatic validation
- Basic skills: Manual MP parsing from description
- Check skill format includes cost information

### **Targeting Issues**
- Ensure valid targets exist (allies/enemies)
- Check skill targeting configuration
- Verify session is active

---

## 🆘 Console Debugging

Open browser Developer Tools (F12) to see detailed logging:
```
Use skill clicked: Slash
Enhanced skills available: 75
Found skill: Slash
Opening targeting overlay for skill: Slash enhanced: true
```

---

## 📈 Performance Tips

1. **Session Management**: Save/load sessions for persistent tracking
2. **Skill Organization**: Use skill tags for easy filtering
3. **Resource Monitoring**: Watch MP/HP bars during combat
4. **Effect Tracking**: Use toast notifications to monitor skill results

---

## 🔗 API Endpoints

For advanced users and developers:
- `GET /api/skills` - Basic skill data
- `GET /api/skills-enhanced` - Enhanced skill format
- `GET /api/skills-raw` - Raw markdown content
- `GET /api/sheets` - Character sheet data

---

*Last updated: October 7, 2025*
*Enhanced Skill System v2.0*