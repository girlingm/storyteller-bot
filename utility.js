 
 const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
 var {townsfolk, outsiders, minions, firstnight, night } = require('./config.json');
 const global = require('./index.js');
 async function sendMessage(player, message)
{
    //global.getGuild().members.cache.get(player).send(message);
    await global.getGuild(player, message);
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT name FROM \`${await global.getServer()}\` WHERE id = '${player}';`);
    console.log(`->${results[0].name}: ${message}`);
}

async function isDrunk(player)
{
    const [results, metada] = await (await global.getSequelize()).query(`SELECT drunk, poisoned FROM \`${await global.getServer()}\` WHERE id = '${player}';`);
    return (results[0].drunk === 1 || results[0].poisoned === 1? true : false);
}

async function nextAlignment(index, increment)
{
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT alive, alignment FROM \`${await global.getServer()}\` WHERE position = ${increment === -1 ? (index === 0 ? (await global.getNumPlayers()) - 1 : index - 1) : (index === (await global.getNumPlayers()) - 1 ? 0 : index + 1)};`);
    if (results[0].alive === 0)
    {
        return nextAlignment(index + increment, increment);
    }
    else if (results[0].alignment === global.evil)
    {
        return 1;
    }
    else if (results[0].alignment === global.recluse)
    {
        return Math.floor(Math.random() * 1);
    }
    else
    {
        return 0;
    }
}

async function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function waitForAction(player)
{
    console.log("WAITING FOR ACTION");
    var [results, metadata] = await global.sequelize.query(`SELECT isTurn FROM \`${await global.getServer()}\` WHERE id = '${player}';`);
    console.log(results);
    
    while (results[0].isTurn != 0) {
        [results, metadata] = await global.sequelize.query(`SELECT isTurn FROM \`${await global.getServer()}\` WHERE id = '${player}';`);  
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function chooseComparisonPairs(player, type)
{
    var index;
    var index2;
    var r;
    var drunk = false;
    var playerRole;
    var role;
    var players = await global.getPlayers();
    //var guild = await global.getGuild();
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT drunk, poisoned, role FROM \`${await global.getServer()}\` WHERE id = '${player}';`);
    if (results[0].drunk === 1 || results[0].poisoned === 1)
    {
        drunk = true;
        playerRole = results[0].role;
    }
    do {
        index = Math.floor(Math.random() * (await global.getNumPlayers()));
        [results, metadata] = await (await global.getSequelize()).query(`SELECT role, drunk FROM \`${await global.getServer()}\` WHERE position = ${index};`);        
    } while (players[index] === player || !(drunk || type.includes(results[0].role) || (type === outsiders && results[0].drunk === 1)));
    role = (type === outsiders && results[0].drunk === 1) ? "drunk" : results[0].role;
    do {
        index2 = Math.floor(Math.random() * (await global.getNumPlayers()));
    } while (players[index2] === player || index === index2);
    r = Math.floor(Math.random() * 1);
    if (drunk)
    {
        do {
            var temp = Math.floor(Math.random() * (type.length))
            role = type[temp];
        } while (role === playerRole);
        
    }
    console.log(`${player}: Either ${await global.getDisplayName(players[index])} or ${await global.getDisplayName(players[index2])} is ${role}`);
    if (r === 1) {
        
         await sendMessage(player, `Either ${await global.getDisplayName(players[index])} or ${await global.getDisplayName(players[index2])} is ${role}`);
    }
    else {
        await sendMessage(player, `Either ${await global.getDisplayName(players[index2])} or ${await global.getDisplayName(players[index])} is ${role}`);
    }  
}

async function isRole(player, role)
{
    console.log(`PLAYER: ${player}`);
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT role FROM \`${await global.getServer()}\` WHERE id = '${player}';`);
    if (results[0].role === role) return true;
    return false;
}

async function checkIfValidPlayer(name)
{
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT * FROM \`${await global.getServer()}\` WHERE name = '${name}';`);
    if (results.length === 0) return false;
    return true;
}

async function roleInPlay(role)
{
    var [results, metadata] = await (await global.getSequelize()).query(`SELECT * FROM \`${await global.getServer()}\` WHERE role = '${role}';`);
    if (results.length === 0) return false;
    return true;
}

module.exports.sendMessage = sendMessage;
module.exports.isDrunk = isDrunk;
module.exports.nextAlignment = nextAlignment;
module.exports.shuffleArray = shuffleArray;
module.exports.waitForAction = waitForAction;
module.exports.chooseComparisonPairs = chooseComparisonPairs;
module.exports.isRole = isRole;
module.exports.checkIfValidPlayer = checkIfValidPlayer;
module.exports.roleInPlay = roleInPlay;