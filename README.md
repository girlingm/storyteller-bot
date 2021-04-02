# storyteller-bot
Discord bot which sets up and runs the social deduction game [Blood on the Clocktower](https://bloodontheclocktower.com).

Games can be played with 5-15 players in a discord server. No need for a dedicated storyteller :)

All drunk/poisoned information is random.
All townsfolk, outsiders and minions in play are random.

Author: [Miranda Girling](https://www.github.com/girlingm)


Node.js modules used:
* Sequelize.js
* Discord.js

**NOTE** (02/04/21): currently the bot prints all output and takes all input from the main channel in the server (for debugging purposes the identify of the user calling commands for specific roles is not checked).
Once I have implemented all roles (and drunkeness for each role) I will change this and start beta testing :) in the meantime I've removed that feature so as not too annoy my friends too much.

## Progress

### Scripts
| Script            | Status      |
|-------------------|-------------|
| Trouble Brewing   | In Progress |
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
| Undertaker     | []    | []    |
| Soldier        | [x]   | [x]   |
| Slayer         | []    | []    |
| Ravenkeeper    | [x]   | []    |
| Monk           | [x]   | [x]   |
| Mayor          | []    | []    |
| Investigator   | [x]   | [x]   |
| Librarian      | [x]   | [x]   |
| Saint          | []    | []    |
| Recluse        | [x]   | []    |
| Butler         | [x]   | [x]   |
| Spy            | []    | []    |
| Scarlet Woman  | []    | []    |
| Poisoner       | [x]   | []    |
| Baron          | [x]   | [x]   |
| Imp            | [x]   | []    |
