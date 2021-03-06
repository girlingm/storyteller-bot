# storyteller-bot
Discord bot which sets up and runs the social deduction game [Blood on the Clocktower](https://bloodontheclocktower.com).

Games can be played with 5-15 players in a discord server. No need for a dedicated storyteller :)

All drunk/poisoned information is random.
All townsfolk, outsiders and minions in play are random.

Author: [Miranda Girling](https://www.github.com/girlingm)

main Node.js modules used:
* Sequelize.js
* Discord.js

**UPDATE** (16/05/21): The bot now contacts users via DM for night actions, all roles in Trouble Brewing have been implemented and I have begun to test the bot out with the help of a few friends. All known bugs and user suggestions are posted on the [trello board](https://trello.com/b/MWD4DnbQ/storyteller-bot).

## Commands

### Global (for use in server)
 * _!init <@player1> <@player2> ... <@playern>_ creates a game with mentioned players 
 * _!night_ trigger next night sequence
 * _!open-nominations_ opens nominations
 * _!nominate <player_nickname>_ nominates a player for execution
 * _!start-vote_ starts voting on the player who is currently up for execution
 * _!vote <yes/no>_ votes on currently nominated played 
 * _!slay <player_nickname>_ (slayer) attempts to slay a player

### Private (in DMs with bot)
  * _!kill <player_nickname>_ (demon) attacks player
  * _!poison <player_nickname>_ (poisoner) poisons player
  * _!protect <player_nickname>_ (monk) protects player
  * _!fortune <player_nickname> <player_nickname>_ (fortune teller) checks to see if either player is demon
  * _!butler <player_nickname>_ (butler) select player to vote with on the next day (**note**: all this does is ensure that you are placed after them in the voting queue, it is your responsibility to ensure you vote the same way as them - this is to stop players from 'proving' butler claims by deliberately not voting with their chosen player and triggering a response from the bot)
  * _!check <player_nickname>_ (ravenkeeper) checks the identity of a player
  
 

## Progress

### Scripts
| Script            | Status      |
|-------------------|-------------|
| Trouble Brewing   | Testing...  |
| Bad Moon Rising   | Not Started |
| Sects and Violets | Not Started |

### Trouble Brewing

| Role           | Sober | Drunk/Posioned |
|----------------|-------|-------|
| Chef           | [x]   | [x]   |
| Empath         | [x]   | [x]   |
| Fortune Teller | [x]   | [x]   |
| Washerwoman    | [x]   | [x]   |
| Virgin         | [x]   | [x]   |
| Undertaker     | [x]   | [x]   |
| Soldier        | [x]   | [x]   |
| Slayer         | [x]   | [x]   |
| Ravenkeeper    | [x]   | [x]   |
| Monk           | [x]   | [x]   |
| Mayor          | [x]   | [x]   |
| Investigator   | [x]   | [x]   |
| Librarian      | [x]   | [x]   |
| Saint          | [x]   | [x]   |
| Recluse        | [x]   | [X]   |
| Butler         | [x]   | [x]   |
| Spy            | [x]   | [X]   |
| Scarlet Woman  | [x]   | [X]   |
| Poisoner       | [x]   | [X]   |
| Baron          | [x]   | [x]   |
| Imp            | [x]   | [X]   |
