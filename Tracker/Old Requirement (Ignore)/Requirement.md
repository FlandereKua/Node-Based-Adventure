# Task Summary
Create a Turn-based RPG Game with hero management features

# Feature List
## Turn-based RPG
1. There should be a turn counter to keep track of turns/debuff/buff/effects durations
2. The turn order is determined by speed. Character turn order need to be updated dynamically (Example: Character A has 4 SPD and Character B has 3 SPD. Character B SPD get increased by 2 by character C, who go first with 9 SPD, then B would go before A)
3. Some character would have an effect to either repeat action or get additional turn.
4. The debuff/buff/effects duration start getting counted down once the character turn is over.
5. Some attack could target multiple targets, even allies (Healing for example).
6. Characters and Skills have traits, and some Skill (Active and Passive) would have additional effect depends on those traits.
7. Some battle would have special terrains that affect the characters (Global would affect every character, while Selective would affect the selected characters)
8. Damage formula:
Single Attack: (Character Stats)/2 + Skill Modifers - Endurance
Multiple Attacks: Similar but some Passive or Active would increase the Skill Modifers of Later attacks
Example: Triple Thrust
First attack would have a 1D3 Modifer (1 to 3 Damage)
Second attack would have a 2D4 Modifer (2 to 4 Damage)
Third attack would have a 3D6 Modifer (3 to 6 Damage)
or 
Multi-slash (Passive):
Increase 1 Stacking Damage for each subsequent attack
But some skill would increase Damage for ONLY 1 attacks
9. Range
Some ranged skill would have bonus depends on how far the enemy is to the character. These types of Skill would have either the
[Snipe] tags 
[Shotgun] tags
If a skill have either of these 2 tags, then before calculating damage, ask the user to input the distance between the 2.
9. Some skill would summon other creatures or call upon aids.
For summon skills and summon creatures, they would have the [Summon] tags
Aids creature will not have the [Summon] tags, but the skill will still will have it
10. The battle should allow for removal or adding of character mid-battle.
11. Some debuff would also affect the player stats like STR or max HP 
12. There need to a tab to keep track of loots

## Characters Stats
STR (Strength)
DEX (Dexterity)
INT (Intelligent)
WIS (Wisdom)
CHA (Charisma)
LCK (Luck)
END (Endurance)
SPD (Speed)
HP (Health Point)
MP (Mental Point)
PT (Potential)
Tier
Each character will have a random number of Passive and Active Skills Slot based on their Potentials (Potentials range from 0 to 100)
When a character increased their tier, they would acquire additional Active and Passive skill slots.
Potentials also affect character growth rates and (sometimes, the power of the acquired skills)
Potential could be raised

There are a total of 9 tiers 
Common - 1
Uncommon - 2
Rare - 3
Renowed - 4
Heroic - 5
Epic - 6
Legendary - 7
Mythical - 8
Transcendence - 9
And there are 2 sub tier
God - Negative Numbers
Eldritch - Complex Numbers

Character also need to have a loot drop table.


## Skill
There are 2 types of Skills
Passive
Active

SKills could only be acquired by possessing a skill adjacent aka a link to it:
Example: Thrust has potential a link with Slash (Linkable). So the character would be able to acquire it (Linked). The origin of each character is a tier 0 [Life] (God and Eldritch being have different origin skill).
Some skills has [Unique] tags, which only a specific character would have it.
A Character could only acquire a skill of the same tiers,

## Hero Management
The user would be able to view their character with the portrait and their stats sheet, their skills.
The user would also be able to edit the character skills and stats through a specific screen.
The Skills Screen would display the skill list, which would highlight which skill is linkable.
The Stat screen would allow the character to increase or decrease their stats (High potential sometimes increase the amount of gained stats more than the amount the player increase, like increase it by 1, but automatically increase by 2 (Should highlight when it happens). Low potential would have the reverse effect, decrease more stats than when decreasing). Increasing tier would subtract potential, the higher the tier, the higher the cost.

## Creation
All Skill, Characters, Buff, Debuff, Terrains or Effects need to be saved under an easily customizable formats
ALso there need to a screen to allow for easy creation, edit of new Skill, Characters, Buff, Debuff or Terrain.
Allow for easy import (For AI creations)




  