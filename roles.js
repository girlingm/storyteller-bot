
const util = require('./utility.js');
var {townsfolk, outsiders, minions} = require('./config.json');
const global = require('./index.js');

async function scarletwoman(player)
{
    var [deceased, metadata] = await (await global.getSequelize()).query(`SELECT role FROM \`${await global.getServer()}\` INNER JOIN \`games\` ON upForEx = name AND server = '${await global.getServer()}';`);    
    if (deceased.length === 0 || deceased[0].role != 'imp') return;
    await (await global.getSequelize()).query(`UPDATE \`${await global.getServer()}\` SET role = 'imp' WHERE id = '${player}';`);
    console.log(`${player} is the new imp.`);
}

async function ravenkeeper(player)
{
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT deathLastNight FROM \`games\` WHERE server = '${await global.getServer()}' AND deathLastNight IS NOT NULL;`);
    if (results.length === 0) return;
    var [name, metadata] = await (await global.getSequelize()).query(`SELECT name FROM \`${await global.getServer()}\` WHERE id = '${player}';`);
    if (results[0].deathLastNight === name[0].name)
    {
        console.log("Ravenkeeper pick player to check");
        await util.sendMessage(player, "You have been killed. Pick a player to check: use the command *!check <player_nickname>*");
        await util.waitForAction(player);
    }
}

async function undertaker(player)
{
    var [deceased, metadata] = await (await global.getSequelize()).query(`SELECT upForEx FROM \`games\` WHERE server = '${await global.getServer()}' AND upForEx IS NOT NULL;`);
    if (deceased.length === 0) return;
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT role, alignment FROM \`${await global.getServer()}\` WHERE name = '${deceased[0].upForEx}';`);
    console.log(deceased[0].upForEx);
    if (!(await util.isDrunk(player)))
    {
        await util.sendMessage(player, `${deceased[0].upForEx} was the ${results[0].role}.`);
    }
    else
    {
        if (results[0].alignment === 1)
        {
            await util.shuffleArray(townsfolk);
            await util.sendMessage(player, `${deceased[0].upForEx} was the ${townsfolk[0]}.`);
        }
        else (results[0].alignment === 0)
        {
            var r = Math.random() * 3;
            if (r != 1)
            {               
                await util.shuffleArray(minions)
                await sendMessage(player, `${deceased[0].upForEx} was the ${minions[0]}.`);
            }
            else
            {
                await sendMessage(player, `${deceased[0].upForEx} was the imp.`);
            }
        }
    }
}

async function imp(player)
{
    console.log("processing imp");
    await util.sendMessage(player, "Pick a player to kill using *!kill <player>*");
    await util.waitForAction(player);
}

async function monk(player)
{
    await util.sendMessage(player, "Pick a player to protect using *!protect <player>*");
    await util.waitForAction(player);
}

async function spy(player)
{
    const [results, metadata] = await (await global.getSequelize()).query(`SELECT name, role, poisoned, drunk FROM \`${await global.getServer()}\` ORDER BY position ASC;`);
    for (var r in results)
    {
        await util.sendMessage(player, `${results[r].name}: ${results[r].role} ${results[r].drunk === 1 ? '|DRUNK|' : ''}${results[r].poisoned === 1 ? '|POISONED|' : ''}`);
    }
}

async function librarian(player)
{
    const [results, metadata] = await (await global.getSequelize()).query(`SELECT role, drunk FROM \`${await global.getServer()}\`;`);
    var isOutsiders = false;
    for (var result in results)
    {
        if (outsiders.includes(results[result].role))
        {
            isOutsiders = true;
            break;
        }
        else if (results[result].drunk === 1)
        {
            isOutsiders = true;
            break;
        }
    }
    if (isOutsiders) {
        await util.chooseComparisonPairs(player, outsiders);
    }
    else
    {
        await util.sendMessage(player, "no outsiders in play");
    }
}

async function investigator(player)
{
    await util.chooseComparisonPairs(player, minions);
}

async function poisoner(player)
{
    await util.sendMessage(player, "Pick a player to poison: use the command *!poison <player_nickname>*");
    await util.waitForAction(player);   
}

async function butler(player)
{
    await util.sendMessage(player, "Pick a player to vote with: use the command *!butler <player_nickname>*");
    await util.waitForAction(player)
}

async function washerwoman(player)
{
    await util.chooseComparisonPairs(player, townsfolk);
}
 async function chef(player)
{
    var pairCount = 0;
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT alignment FROM \`${await global.getServer()}\` WHERE position = 0;`);
    var prev = results[0].alignment;
    var first = prev;
    var players = global.getPlayers();
    for (var i = 1; i < players.length; i++)
    {
        [results, metadata] = await (await global.getSequelize()).query(`SELECT alignment FROM \`${await global.getServer()}\` WHERE position = ${i};`);
        var role = results[0].alignment;
        if (role === prev && role === global.evil)
        {
            pairCount++;
        }
        prev = role;
    }
    if (prev === first && prev === global.evil)
    {
        pairCount++;
    }
     if (await util.isDrunk(player))
    {
         pairCount = Math.floor(Math.random() * 1);
    }
    await util.sendMessage(player, `There are ${pairCount} pairs of evil players sitting next to each other.`);
}

 async function empath(player)
{
    var count = 0;
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT position FROM \`${await global.getServer()}\` WHERE id = '${player}';`);
    var index = results[0].position;
    if (await util.isDrunk(player))
    {
        count = Math.floor(Math.random() * 1);
    }
    else
    {
        count = count + await util.nextAlignment(index, -1);
        count = count + await util.nextAlignment(index, 1);      
    }

    await util.sendMessage(player, `There are ${count} evil players sitting next to you.`);
}

 async function fortuneteller(player)
{
    
    await util.sendMessage(player, "Pick players to check: use command *!fortune <player_nickname_1> <player_nickname_2>*");
    await util.waitForAction(player);
}

 async function minionInfo(player)
{
    const [results, metadata] = await (await global.getSequelize()).query(`SELECT name FROM \`${await global.getServer()}\` WHERE role = 'imp';`);
    await util.sendMessage(player, `Your demon is ${results[0].name}.`);
    minions.push(player);
}

async function demonInfo(player)
{
    const [results, metadata] = await (await global.getSequelize()).query(`SELECT id, name, role FROM \`${await global.getServer()}\` WHERE alignment = 1;`);
    for (var result in results)
    { 
        if (results[result].id != player) {
           await util.sendMessage(player, `${results[result].name} is the ${results[result].role}`);
        }
    }
  
    await util.sendMessage(player, '3 roles which aren\'t in play:');
    for (var i = 0; i < 3; i++)
    {
        var count = 0;
        var r = Math.floor(Math.random() * 3);
        var type = townsfolk;
        if (r === 1)
        {
            type = outsiders;
        }
        util.shuffleArray(type);
        var selected = type[count];
        while (await util.roleInPlay(selected))
        {
            count++;
            selected = type[count];
        }
        await util.sendMessage(player, `${selected}`);
    }    

}

module.exports.imp = imp;
module.exports.scarletwoman = scarletwoman;
module.exports.ravenkeeper = ravenkeeper;
module.exports.undertaker = undertaker;
module.exports.monk = monk;
module.exports.spy = spy;
module.exports.librarian = librarian;
module.exports.investigator = investigator;
module.exports.poisoner = poisoner;
module.exports.butler = butler;
module.exports.washerwoman = washerwoman;
module.exports.chef = chef;
module.exports.empath = empath;
module.exports.fortuneteller = fortuneteller;
module.exports.minionInfo = minionInfo;
module.exports.demonInfo = demonInfo;
