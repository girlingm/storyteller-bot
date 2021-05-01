const Discord = require('discord.js');
const client = new Discord.Client();
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const { prefix, token, dbIP, dbName, dbUsername, dbPassword } = require('./config.json');
const good = 0;
const evil = 1;
const recluse = 2;
const goodException = 3;
const minion = 4;

var {townsfolk, outsiders, minions, firstnight, night } = require('./config.json');
var format = /[`#$%^&*()_+\-=\[\]{};':"\\|,.\/?~]/;
var players;
var playerRoles = {};
var playerStatus = {};
var numPlayers;
var numMinions;
var numOutsiders;
var numTownsfolk;
var game = false;
var guild;
var channel;
var nightNum = 0;
var currPlayer;
var demon;
var minions;
var fortuneFalsePositive;
var ServerGame;
var GameData;
var waitingForAction = false;

const sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
    host: dbIP,
    dialect: 'mysql',
    logging: false
});

async function connect() {
    console.log('connecting to database...');
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

client.once('ready', () => {
    
    console.log('Ready!');
   // console.log(prefix);
});

client.on('message', message => {
    receiveText(message);
});

async function receiveText(message) {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const sender = message.author.id;
    var argErr = false;
    channel = message.channel;
    args.forEach(element => {     
        if (format.test(element))
        {
            console.log(`FAILED TEST:${element}.`);
            argErr = true;
        }
    });
    if (argErr) return channel.send('Incorrect arguments. If initialising a game, ensure no player has a special character in their nickname.');
    console.log(message.content);
    console.log(command);
    if (command === 'init') {
        guild = message.guild;
        if (!args.length) {
            return channel.send('You need to give me the players\' IDs!');
        }
        else {
            players = message.mentions.users.map(user => {
                return user.id;
            });
            //console.log(players);
            initGame();


        }
    }
    else if (command === 'join') {
        server = message.guild.id;
        await createTable(server);
        await createGameData();
    }
    else if (game) {
        console.log(waitingForAction);
        // global commands
        if (!waitingForAction)
        {
            if (guild === null) return channel.send ("This ability must be performed publicly (not in a DM).");
            switch (command)
            {
                case 'night':
                    nightNum++;
                    nightPhase();
                    break;
                case 'open-nominations':
                    await nominationsOpen();
                    break;
                case 'nominate':
                    if (args.length < 1) return channel.send("Please enter a player to nominate");
                    var [results, metadata] = await sequelize.query(`SELECT * FROM \`games\` WHERE nominee is NULL AND server = '${server}';`);
                    console.log(results);
                    console.log(results.length);
                    if (results.length < 1) return channel.send("A nomination is already in progress. Please wait until voting has concluded before making a new nomination.");
                    await nominate(args[0], message.author.id);    
                    break;
                case 'start-vote':
                    await voteOnNominee();
                    break;
                case 'vote':
                    if (args.length < 1) return channel.send("Vote either 'Yes' or 'No'.");
                    var [results, metadata] = await sequelize.query(`SELECT currentVoter FROM \`games\` WHERE server = '${server}';`);
                    if (results.length === 1)
                    {
                       // if (results[0].currentVoter === message.author.id)
                        //{
                            [results, metadata] = await sequelize.query(`SELECT votes, currentVoter from \`games\`  WHERE server = '${server}';`);
                            //vote
                            if (args[0].toLowerCase() === "yes") {                        
                                var [results1, metadata] = await sequelize.query(`UPDATE \`games\` SET votes = ${results[0].votes + 1} WHERE server = '${server}';`); 
                                var [ghost, metadata] = await sequelize.query(`SELECT alive, ghostvote FROM \`${server}\` WHERE id = '${results[0].currentVoter}';`);
                                if (ghost[0].alive === 0)
                                {
                                    await sequelize.query(`UPDATE \`${server}\` SET ghostvote = 0 WHERE name = '${results[0].currentVoter}';`);
                                }
                            }
                            else if (args[0].toLowerCase() != "no")
                            {
                                return channel.send("Vote either 'Yes' or 'No'");
                            }
        
                            [results1, metadata] = await sequelize.query(`SELECT COUNT(id) AS alivePlayers FROM \`${server}\` WHERE alive = 1;`);
                            [max, metadata] = await sequelize.query(`SELECT maxVotes FROM \`games\` WHERE server = '${server}';`);
                            [results, metadata] = await sequelize.query(`SELECT votes from \`games\`  WHERE server = '${server}';`);
                            var nominalAmt = Math.ceil(results1[0].alivePlayers / 2);
                            channel.send(`${results[0].votes} votes for execution. ${nominalAmt > max[0].maxVotes ? nominalAmt : max[0].maxVotes} votes needed to execute.`);
                            [results, metadata] = await sequelize.query(`UPDATE \`games\` SET currentVoter = '' WHERE server = '${server}';`);
                       // }
                    }
                    break;
                case 'slay':
                    
                    if (args.length != 1) return channel.send("This ability takes a maximum of one argument.");
                    if (!(await checkIfValidPlayer(args[0]))) return channel.send("Please enter a valid player name.");
                    if (await isRole(sender, 'slayer'))
                    {                       
                        if (!(await isDrunk(sender)))
                        {
                            var [slain, metadata] = await sequelize.query(`SELECT role FROM \`${server}\` WHERE name = '${args[0]}';`);
                            if (slain[0].role === 'imp')
                            {
                                return channel.send(`${args[0]} was the imp! Good wins!`);
                            }
                        }
                        await sequelize.query(`UPDATE \`${server}\` SET drunk = 1 WHERE role = 'slayer';`)
                    }
                    return channel.send("Nothing happens...");
                    //get person sending message
                    //if slayer + !drunk or poisoned:
                    //      check argument
                    //      if demon: end game good wins
                    // else:
                    //     nothing happens
                    break;
                                           
            }
        }
        else       //individual commands
        {
            switch (command)
            {
                case 'poison':
                    if (args.length != 1) {
                        return channel.send("You need to mention a user to poison.");
                    }
                    else {
                        var [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET poisoned = 1 WHERE name = '${args[0]}';`);
                        if (results.length < 1) return chanel.send("Invalid player name. Try again.")
                        console.log(results);
                        [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET isTurn = 0 WHERE role = 'poisoner';`);
                        return channel.send(`${args[0]} has been poisoned.`);
                    }
                case 'fortune':
                    if (args.length != 2) {
                        return channel.send("You need to give me two players to check if either is a demon.");
                    }
        
                    else {
                        var [results, metadata] = await sequelize.query(`SELECT role, alignment FROM \`${server}\` WHERE name = '${args[0]}' OR name = '${args[1]}'`);
                        if (results.length < 2) return chanel.send("Invalid player names. Try again.")
                        if (results[0].role === "imp" || results[1].role === "imp" || results[0].alignment === goodException || results[1].alignment === goodException || results[0].alignment === recluse || results[1].alignment === recluse) {
                            channel.send("One or more of these players is a demon.");
                        }
                        else {
                            channel.send("Neither of these players are a demon.");
                        }
                        [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET isTurn = 0 WHERE role = 'fortune-teller';`);
                    }
                    break;
                case 'butler':
                    if (args.length != 1)
                    {
                        return channel.send("Please select one player to vote with.");
                    }
                    else
                    {
                        var [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET butlerTarget = 1 WHERE name = '${args[0]}';`);
                        if (results.length < 1) return channel.send("Invalid player name. Try again.");
                        channel.send(`You may only vote if/when ${args[0]} votes.`);
                        [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET isTurn = 0 WHERE role = 'butler';`);
                    }
                    break;
                case 'protect':
                    if (args.length === 1)
                    {
                        var [results, metadata] = await sequelize.query(`SELECT name FROM \`${server}\` WHERE name = '${args[0]}';`);
                        await sequelize.query(`UPDATE \`${server}\` SET protected = 1 WHERE name = '${args[0]}';`);
                        if (results.length === 1)
                        {
                            [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET isTurn = 0 WHERE role = 'monk';`);
                            return channel.send(`${args[0]} has been protected.`);
                        }
                        else
                        {
                            return channel.send("Invalid player name.");
                        }
                    }
                    else
                    {
                        return channel.send("Please enter a player to protect.");
                    }
                case 'kill':
                    if (args.length === 1)
                    {
                        var [results, metadata] = await sequelize.query(`SELECT protected, role FROM \`${server}\` WHERE name = '${args[0]}';`);
                        if (results.length != 1) return channel.send("Please enter a player to kill.");
                        if (results[0].protected !== 1 /*&& !(await isDrunk(sender))*/) await kill(args[0]);
                        await sequelize.query(`UPDATE \`${server}\` SET isTurn = 0 WHERE role = 'imp';`);
                        if (results[0].role === 'imp') await transferImp();
                        return channel.send(`${args[0]} has been attacked.`)
                    }
                    break;
                case 'check':
                    if (args.length === 1)
                    {
                        if (!await (checkIfValidPlayer(args[0]))) return channel.send("Please enter a valid player to check.");
                        var [results, metadata] = await sequelize.query(`SELECT role, alignment FROM \`${server}\` WHERE name = '${args[0]}';`);
                        if (results.length != 1) return channel.send("Please enter a player to check.");
                        await sequelize.query(`UPDATE \`${server}\` SET isTurn = 0 WHERE role = 'ravenkeeper';`);
                        if (await (isDrunk(sender)))
                        {
                            if (results[0].alignment === 0)
                            {
                                var r = Math.random() * 3;
                                if (r === 1)
                                {
                                    shuffleArray(minions);
                                    return channel.send(`${args[0]} is the ${minions[0]}.`);
                                }
                                else if (r === 2)
                                {
                                    return channel.send(`${args[0]} is the imp.`);
                                }
                                else 
                                {
                                    shuffleArray(townsfolk);
                                    return channel.send(`${args[0]} is the ${townsfolk[0]}.`);
                                }
                            }
                            else 
                            {
                                shuffleArray(townsfolk);
                                return channel.send(`${args[0]} is the ${townsfolk[0]}.`)
                            }
                        }
                        else 
                        {
                            channel.send(`${args[0]} is the ${results[0].role}.`);
                        }
                    }
                    break;
            }
        }


       
        }
    else {
        return channel.send('No game in progress.');
    }
}

async function isRole(player, role)
{
    console.log(`PLAYER: ${player}`);
    var [results, metadata] = await sequelize.query(`SELECT role FROM \`${server}\` WHERE id = '${player}';`);
    console.log(results[0].role);
    if (results[0].role === role) return true;
    return false;
}

async function checkIfValidPlayer(name)
{
    var [results, metadata] = await sequelize.query(`SELECT * FROM \`${server}\` WHERE name = '${name}';`);
    if (results.length === 0) return false;
    return true;
}

async function kill(playername)
{
    console.log("Attempted kill");
    var [results, metadata] = await sequelize.query(`SELECT alive FROM \`${server}\` WHERE name = '${playername}';`);
    if (results[0].alive === 1)
    {
        await sequelize.query(`UPDATE \`games\` SET deathLastNight = '${playername}' WHERE server = '${server}';`)
    }
    else
    {
        await sequelize.query(`UPDATE \`games\` SET deathLastNight = NULL WHERE server = '${server}';`)
    }
    await sequelize.query(`UPDATE \`${server}\` SET alive = 0 WHERE name = '${playername}';`);
    if (results.length < 1) return false;
    [results, metadata] = await sequelize.query(`SELECT id FROM \`${server}\` WHERE name = '${playername}';`);
    let nickname = guild.member(results[0].id).displayName;
    if (!guild.member(results[0].id).hasPermission("ADMINISTRATOR")) {
          guild.member(results[0].id).setNickname(`${nickname} [DEAD]`);
    }
    else {
        channel.send(`${nickname} please change your nickname to '${nickname} [DEAD]' as I don't have the permissions to do it for you :(`);
    }
    return true;
}

async function transferImp()
{
    var [results, metadata] = await sequelize.query(`SELECT id, name FROM \`${server}\` WHERE alignment = 1 AND role <> 'imp' ORDER BY RAND() LIMIT 1;`);
    if (results.length > 0)
    {
        var [scarletwoman, metadata] = await sequelize.query(`SELECT id, name FROM \`${server}\` WHERE role = 'scarlet-woman';`);
        var chosen;
        if (scarletwoman.length > 0) {
            chosen = scarletwoman[0];
        }
        else
        {
            chosen = results[0];
        }
        console.log(`${chosen.name} is the new imp.`);
        //send message to new imp
        await sequelize.query(`UPDATE \`${server}\` SET role = 'imp' WHERE id = '${chosen.id}';`);
    }
}


async function playerVote(player)
{
    var [results, metadata] = await sequelize.query(`SELECT currentVoter FROM \`games\` WHERE server = '${server}';`);
    while (results[0].currentVoter === player) {
        [results, metadata] = await sequelize.query(`SELECT currentVoter FROM \`games\` WHERE server = '${server}';`);
        setTimeout(function () { }, 3000);
    }
}


async function voteOnNominee()
{
    var [results, metadata] = await sequelize.query(`SELECT nominee FROM \`games\` WHERE nominee IS NOT NULL AND server = '${server}';`);
    if (results.length === 1)
    {
        [results1, metadata] = await sequelize.query(`SELECT name, id FROM \`${server}\` ORDER BY position ASC;`);
        shuffleArray(results1);
        var butler = null;
        var butlerTargetVoted = false;
        var count = 1;
        for (var result in results1)
        {
            [ghost, metadata] = await sequelize.query(`SELECT alive, ghostvote FROM \`${server}\` WHERE id = '${results1[result].id}';`);
            if (ghost[0].alive !== 1 && ghost[0].ghostvote !== 1) {
                channel.send(`${results1[result].name} you have already used up your ghost vote so cannot vote.`);
            }
            else {
                if (!butlerTargetVoted) {
                    [current, metadata] = await sequelize.query(`SELECT role, butlerTarget FROM \`${server}\` WHERE id = '${results1[result].id}';`);
                    if (current[0].role === 'butler') {
                        butler = result;
                        continue;
                    }
                    else if (current[0].butlerTarget === 1) {
                        butlerTargetVoted = true;
                    }
                }
                await sequelize.query(`UPDATE \`games\` SET currentVoter = '${results1[result].id}' WHERE server = '${server}';`);

                channel.send(`(${count}/${players.length}) ${results1[result].name} would you like to vote for ${results[0].nominee}'s execution? (*!vote yes/no*)`);
                if (ghost[0].alive === 0) channel.send("**NOTE:** If you vote yes then you will have used up your ghost vote and may not vote again for the remainder of the game.");
                await playerVote(results1[result].id);
            }
            count++;
        }
        if (butler !== null)
        {
            await sequelize.query(`UPDATE \`games\` SET currentVoter = '${results1[butler].id}' WHERE server = '${server}';`);
            channel.send(`(${count}/${players.length}) ${results1[butler].name} would you like to vote for ${results[0].nominee}'s execution? (*!vote yes/no*)`);
            await playerVote(results1[butler].id);
        }
        [results1, metadata] = await sequelize.query(`SELECT votes, maxVotes FROM \`games\` WHERE server = '${server}';`);
        var [r, metadata] = await sequelize.query(`SELECT COUNT(id) AS alivePlayers FROM \`${server}\` WHERE alive = 1;`);
        var nominalAmt = Math.ceil(r[0].alivePlayers / 2);
        if (results1[0].votes >= (nominalAmt > results1[0].maxVotes ? nominalAmt : results1[0].maxVotes))
        {
            channel.send(`${results[0].nominee} is up for execution.`);
            await sequelize.query(`UPDATE \`games\` SET upForEx = '${results[0].nominee}' WHERE server = '${server}';`);
            await sequelize.query(`UPDATE \`games\` SET maxVotes = ${results1[0].votes + 1} WHERE server = '${server}';`);
            //return await kill(results[0].nominee);
        }
        await sequelize.query(`UPDATE \`games\` SET nominee = NULL WHERE server = '${server}';`);
        
    }
}

async function nominate(name, player)
{
    //check if virgin
    var [results, metadata] = await sequelize.query(`SELECT drunk, poisoned FROM \`${server}\` WHERE name = '${name}' AND role = 'virgin';`);
    if (results.length === 1)
    {
        //check if drunk
        if (results[0].drunk === 0 && results[0].poisoned === 0)
        {
            //check if accuser townsfolk
            [results, metadata] = await sequelize.query(`SELECT role, drunk, id, name FROM \`${server}\` WHERE id = '${player}';`);
            if (townsfolk.includes(results[0].role) && results[0].drunk != 1)
            {
                channel.send(`${name} is the virgin! ${results[0].name} takes their virginity and is immediately executed.`);
                return kill(results[0].name);
            }
        }       
    }
    else
    {
        [results, metadata] = await sequelize.query(`SELECT name FROM \`${server}\` where name = '${name}';`);
        if (results.length != 1) return channel.send("Invalid player to nominate. Try again.");

    }
    await sequelize.query(`UPDATE \`games\` SET nominee = '${name}' WHERE server = '${server}';`);
    await sequelize.query(`UPDATE \`games\` SET votes = 0 WHERE server = '${server}';`);
    channel.send(`${name} has been nominated. Please make your case for their execution and allow them to defend themselves before using *!start-vote* to decide their fate.`)
   
}

async function nominationsOpen()
{
    channel.send("Nominations are now open. Everybody please return to the Town Square. Use the command *!nominate <player>* to make a nomination.");
    const [results, metadata] = await sequelize.query(`UPDATE \`games\` SET nominations = 1 WHERE server = '${server}';`);
}

async function checkGameOver()
{
    var [imp, metadata] = await sequelize.query(`SELECT name FROM \`${server}\` WHERE role = 'imp' AND alive = 1;`);
    var [town, metadata] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${server}\` WHERE alive = 1;`);

    if (imp.length === 0)
    {
        var [scarletW, metadata] = await sequelize.query(`SELECT name FROM \`${server}\` WHERE role = 'scarlet-woman';`);
        if (!(scarletW.length === 1 && town[0].count >= 4))
        {
            channel.send("**GAME OVER** Good wins.");
            return true;
        }        
    }
    if (town[0].count <= 2) {
        channel.send("**GAME OVER ** Evil wins.");
        return true;
    }
    //channel.send("The game continues...");
    return false;
}

async function mayor()
{
    var [mayor, metadata] = await sequelize.query(`SELECT id FROM \`${server}\` WHERE role = 'mayor' AND alive = 1;`);
    var [town, metadata] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${server}\` WHERE alive = 1;`);
    if (town[0].count === 3 && !(await isDrunk(mayor[0].id)))
    {
        channel.send("**GAME OVER** Good wins.");
        return true;
    }
    return false;
}

async function nightPhase()
{
    console.log("night phase...");
    var [results, metadata] = await sequelize.query(`SELECT upForEx, role, drunk, poisoned FROM \`${server}\` INNER JOIN  \`games\` ON server = '${server}' AND name = upForEx;`);
    var gameOver;
    if (results.length === 1)
    {
        channel.send(`${results[0].upForEx} has been executed.`);
        await kill(results[0].upForEx);
        if (results[0].role === 'saint' && !(results[0].drunk === 1 || results[0].poisoned === 1))
        {
            channel.send("**GAME OVER** Evil wins.");
            gameOver = true;
        }
        gameOver = await checkGameOver();
    }
    else 
    {
       gameOver = await mayor();
    }
    //var gameOver = await checkGameOver();
    if (gameOver) return;
    channel.send("The game continues... everybody go to sleep.");
    await sequelize.query(`UPDATE \`games\` SET maxVotes = 0 WHERE server = '${server}';`);
    await sequelize.query(`UPDATE \`${server}\` SET poisoned = 0 WHERE poisoned = 1;`);
    [results, metadata] = await sequelize.query(`SELECT id, role FROM \`${server}\` WHERE alive = 1 OR role = 'ravenkeeper';`);
    await sequelize.query( `UPDATE \`${server}\` SET protected = 0 WHERE protected = 1 AND role <> 'soldier'`);
    if (nightNum === 1)
    {
        for (var p in firstnight) {
            console.log(`looking for ${firstnight[p]}`)
            for (var player in results) {
                let value = results[player].role;
                if (value === firstnight[p]) {
                    const [results1, metadata1] = await sequelize.query(`UPDATE \`${server}\` SET isTurn = 1 WHERE id = '${results[player].id}';`);
                    console.log("starting...");
                    await firstNightAction(results[player].id, value);
                    console.log("completed");
                }
            }
        }
        channel.send("Night sequence complete. Everybody wake up.");
        nightNum++
    }
    else 
    {
        for (var p in night)
        {
            console.log(`looking for ${night[p]}`)
            for (var player in results) {
                let value = results[player].role;
                if (value === night[p]) {
                    const [results1, metadata1] = await sequelize.query(`UPDATE \`${server}\` SET isTurn = 1 WHERE id = '${results[player].id}';`);
                    console.log(`starting... ${results[player].id}`);
                    await nightAction(results[player].id, value);
                    console.log("completed");
                }
            }
        }
        await sequelize.query(`UPDATE \`games\` SET upForEx = NULL, deathLastNight = NULL WHERE server = '${server}';`);    
        gameOver = await checkGameOver();
        channel.send("Night sequence complete. Everybody wake up.");
        if (gameOver) return;
    }
}

async function firstNightAction(player, role)
{
   // if (currPlayer === player) return;
   // currPlayer = player;
    if (minions.includes(role))
    {
        await minionInfo(player);
        if (role === 'poisoner')
        {
           await poisoner(player);
        }
        else if (role === 'spy')
        {
            await spy(player);
        }
    }
    else if (role === 'imp')
    {
        await demonInfo(player);
    }
    else if (role === 'washerwoman')
    {
        await washerwoman(player);
    }
    else if (role ==='librarian')
    {
        await librarian(player);
    }
    else if (role === 'investigator')
    {
        await investigator(player);
    }
    else if (role === 'chef') {
       await chef(player);
    }
    else if (role === 'empath')
    {
        await empath(player);
    }
    else if (role === 'fortune-teller')
    {
       await fortuneteller(player);
    }
    else if (role === 'butler')
    {
        await butler(player);
    }
}

async function nightAction(player, role)
{
  //  if (currPlayer === player) return;
   // currPlayer = player;
    if (role === "poisoner")
    {
        await poisoner(player);
    }
    else if (role === 'monk')
    {
        await monk(player);
    }
    else if (role === 'scarlet-woman')
    {
        await scarletwoman(player);
    }
    else if (role === 'spy')
    {
        await spy(player);
    }
    else if (role === 'imp')
    {
        await imp(player);
    }
    else if (role === 'ravenkeeper')
    {
        await ravenkeeper(player);
    }
    else if (role === 'empath')
    {
        await empath(player);
    }
    else if (role === 'fortune-teller')
    {
        await fortuneteller(player);
    }
    else if (role === 'undertaker')
    {
       await undertaker(player);
    }
    else if (role === 'butler')
    {
        await butler(player);
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
    //check if drunk
    var [results, metadata] = await sequelize.query(`SELECT drunk, poisoned, role FROM \`${server}\` WHERE id = '${player}';`);
    if (results[0].drunk === 1 || results[0].poisoned === 1)
    {
        drunk = true;
        playerRole = results[0].role;
    }
    console.log(`Is drunk ? ${drunk}`);
    do {
        index = Math.floor(Math.random() * (numPlayers));
        [results, metadata] = await sequelize.query(`SELECT role, drunk FROM \`${server}\` WHERE position = ${index};`);        
    } while (players[index] === player || !(drunk || type.includes(results[0].role) || (type === outsiders && results[0].drunk === 1)));
    console.log(`first comparison selected`);
    role = (type === outsiders && results[0].drunk === 1) ? "drunk" : results[0].role;
    console.log(role);
    console.log(`Set of townsfolk: ${type}`);
    do {
        index2 = Math.floor(Math.random() * (numPlayers));
    } while (players[index2] === player || index === index2);
    console.log(`second comparison selected`);
    r = Math.floor(Math.random() * 1);
    if (drunk)
    {
        do {
            var temp = Math.floor(Math.random() * (type.length))
            role = type[temp];
            console.log(role);
        } while (role === playerRole);
        
    }
    console.log(`print results:`);
    if (r === 1) {
         console.log(`Either ${guild.member(players[index]).displayName} or ${guild.member(players[index2]).displayName} is ${role}`);
    }
    else {
        console.log(`Either ${guild.member(players[index2]).displayName} or ${guild.member(players[index]).displayName} is ${role}`);
    }  
}

async function waitForAction(player)
{
    console.log("WAITING FOR ACTION");
    waitingForAction = true;
    var [results, metadata] = await sequelize.query(`SELECT isTurn FROM \`${server}\` WHERE id = '${player}\';`);
    while (results[0].isTurn != 0) {
        [results, metadata] = await sequelize.query(`SELECT isTurn FROM \`${server}\` WHERE id = '${player}';`);
        setTimeout(function () { }, 3000);
    }
    waitingForAction = false;
}



async function scarletwoman(player)
{
    var [deceased, metadata] = await sequelize.query(`SELECT role FROM \`${server}\` INNER JOIN \`games\` ON upForEx = name AND server = '${server}';`);    
    if (deceased.length === 0 || deceased[0].role != 'imp') return;
    await sequelize.query(`UPDATE \`${server}\` SET role = 'imp' WHERE id = '${player}';`);
    console.log(`${player} is the new imp.`);
}

async function ravenkeeper(player)
{
    var [results, metadata] = await sequelize.query(`SELECT deathLastNight FROM \`games\` WHERE server = '${server}\' AND deathLastNight IS NOT NULL;`);
    console.log("HERE");
    if (results.length === 0) return;
    var [name, metadata] = await sequelize.query(`SELECT name FROM \`${server}\` WHERE id = '${player}';`);
    if (results[0].deathLastNight === name[0].name)
    {
        console.log("Ravenkeeper pick player to check");
        await waitForAction(player);
    }
}


async function undertaker(player)
{
    var [deceased, metadata] = await sequelize.query(`SELECT upForEx FROM \`games\` WHERE server = '${server}' AND upForEx IS NOT NULL;`);
    if (deceased.length === 0) return;
    var [results, metadata] = await sequelize.query(`SELECT role, alignment FROM \`${server}\` WHERE name = '${deceased[0].upForEx}';`);
    console.log(deceased[0].upForEx);
    if (!(await isDrunk(player)))
    {
        return console.log(`${deceased[0].upForEx} was the ${results[0].role}.`);
    }
    else
    {
        if (results[0].alignment === 1)
        {
            shuffleArray(townsfolk);
           return console.log(`${deceased[0].upForEx} was the ${townsfolk[0]}.`);
        }
        else (results[0].alignment === 0)
        {
            var r = Math.random() * 3;
            if (r != 1)
            {
                shuffleArray(minions)
                return console.log(`${deceased[0].upForEx} was the ${minions[0]}.`);
            }
            else
            {
                return console.log(`${deceased[0].upForEx} was the imp.`);
            }
        }
    }
}

async function imp(player)
{
    console.log("processing imp");
    //guild.members.cache.get(player).send("Pick a player to kill using *!kill <player>*");
   await waitForAction(player);
}

async function monk(player)
{
    //guild.members.cache.get(player).send("Pick a player to protect using *!protect <player>*");
    await waitForAction(player);
}

async function spy(player)
{
    console.log("spy info: ");
    const [results, metadata] = await sequelize.query(`SELECT name, role, poisoned, drunk FROM \`${server}\` ORDER BY position ASC;`);
    for (var r in results)
    {
        console.log(`${results[r].name}: ${results[r].role} ${results[r].drunk === 1 ? '|DRUNK|' : ''}${results[r].poisoned === 1 ? '|POISONED|' : ''}`);
    }
}

async function librarian(player)
{
    const [results, metadata] = await sequelize.query(`SELECT role, drunk FROM \`${server}\`;`);
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
        await chooseComparisonPairs(player, outsiders);
    }
    else
    {
        console.log("no outsiders in play");
    }
}

async function investigator(player)
{
    await chooseComparisonPairs(player, minions);
}

async function poisoner(player)
{
    //guild.members.cache.get(player).send("Pick a player to poison: use the command **!poison <@player>");
    console.log("POISON ACTION:");
    await waitForAction(player);
    console.log("poison action");
    
}

async function butler(player)
{
    await waitForAction(player)
    console.log("butler action");
}

async function washerwoman(player)
{
    console.log("washerwoman");
    await chooseComparisonPairs(player, townsfolk);
}

async function isDrunk(player)
{
    const [results, metada] = await sequelize.query(`SELECT drunk, poisoned FROM \`${server}\` WHERE id = '${player}';`);
    return (results[0].drunk === 1 || results[0].poisoned === 1? true : false);
}

async function chef(player)
{
    var pairCount = 0;
    var [results, metadata] = await sequelize.query(`SELECT alignment FROM \`${server}\` WHERE position = 0;`);
    var prev = results[0].alignment;
    var first = prev;
    for (var i = 1; i < players.length; i++)
    {
        [results, metadata] = await sequelize.query(`SELECT alignment FROM \`${server}\` WHERE position = ${i};`);
        var role = results[0].alignment;
        if (role === prev && role === evil)
        {
            pairCount++;
        }
        prev = role;
    }
    if (prev === first && prev === evil)
    {
        pairCount++;
    }
     if (await isDrunk(player))
    {
         pairCount = Math.floor(Math.random() * 1);
    }
    console.log(`There are ${pairCount} pairs of evil players sitting next to each other.`);
    //guild.members.cache.get(player).send(`There are ${pairCount} pairs of evil players sitting next to each other.`);
}

async function nextAlignment(index, increment, count)
{
    [results, metadata] = await sequelize.query(`SELECT alive, alignment FROM \`${server}\` WHERE position = ${increment === -1 ? (index === 0 ? players.length - 1 : index - 1) : (index === players.length - 1 ? 0 : index + 1)};`);
    if (results[0].alive === 0)
    {
        return nextAlignment(index + increment, increment);
    }
    else if (results[0].alignment === evil) {
        return 1;
    }
    else if (results[0].alignment === recluse)
    {
        return Math.floor(Math.random() * 1);
    }
    else
    {
        return 0;
    }
}

async function empath(player)
{
    var count = 0;
    var [results, metadata] = await sequelize.query(`SELECT position FROM \`${server}\` WHERE id = '${player}';`);
    var index = results[0].position;
    if (await isDrunk(player))
    {
        count = Math.floor(Math.random() * 1);
    }
    else
    {
        count = count + await nextAlignment(index, -1);
        count = count + await nextAlignment(index, 1);      
    }

    console.log(`There are ${count} evil players sitting next to you.`);
    //guild.members.cache.get(player).send(`There are ${count} evil players sitting next to you.`);
}

async function fortuneteller(player)
{
    
    console.log("fortune teller action");
    await waitForAction(player);
    //guild.members.cache.get(player).send("Pick players to check: use command *!fortune <@player1> <@player2>*");
}

async function minionInfo(player)
{
    console.log(demon);
    const [results, metadata] = await sequelize.query(`SELECT name FROM \`${server}\` WHERE role = 'imp';`);
    console.log(`Your demon is ${results[0].name}.`);
    //guild.members.cache.get(player).send(`Your demon is ${results[0].name}.`);
    minions.push(player);
}

async function demonInfo(player)
{
   // guild.members.cache.get(player).send("Your minions are:");
    const [results, metadata] = await sequelize.query(`SELECT id, name, role FROM \`${server}\` WHERE alignment = 1;`);
    console.log(results);
    for (var result in results)
    {
        
        if (results[result].id != player) {
           // guild.members.cache.get(player).send(`${results[result].name}`);
            console.log(results[result].name);
        }
    }
}

async function initGame()
{
    console.log("initialising...");
    await loadGame(server);
    game = true;
    shuffleArray(players);
    shuffleArray(townsfolk);
    shuffleArray(outsiders);
    shuffleArray(minions);
    let count = 0;
    numPlayers = players.length;
    fortuneFalsePositive = players[Math.floor(Math.random() * players.length)];
    if (numPlayers < 10)
    {
        numMinions = 1;
    }
    else if (numPlayers < 13)
    {
        numMinions = 2;
    }
    if (numPlayers < 7)
    {
        numOutsiders = numPlayers === 5 ? 0 : 1;
    }
    else
    {
        numOutsiders = (2 - (numPlayers % 3));
    }
    if (numPlayers > 1) {
        for (; count < numMinions; count++) {
            let m = minions[count];
            if (m === 'baron') {
                numOutsiders += 2;
            }
            console.log(m);
            await assignRole(players[count], m);
        }
        for (; count < numMinions + numOutsiders; count++) {
            console.log(count);
            console.log(numMinions);
            let o = outsiders[count - numMinions];
            let drunk = false;
            if (o === 'drunk')
            {
                o = townsfolk[townsfolk.length - 1];
                drunk = true;
            }
            console.log(o);
            await assignRole(players[count], o);
            if (drunk)
            {
                playerStatus[players[count]] = 'Dr';
                const [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET drunk = 1 WHERE id = '${players[count]}';`);
            }
        }
        for (; count < numPlayers - 1; count++) {
            let t = townsfolk[count - numMinions - numOutsiders];
            console.log(t);
            await assignRole(players[count], t);
        }
    }
    console.log("imp");
    await assignRole(players[count], "imp");
    await createSeatingPlan();
    console.log(playerRoles);
    channel.send('**Game Initialisation Complete**\nUse the command *!night* when you\'re ready to enter the first night phase.');
}

async function assignRole(player, role) {
    playerRoles[player] = role;
    //guild.members.cache.get(player).send(`${role} is your role.`);
    playerStatus[player] = 'A';
    console.log("CREATING PLAYER");
    const newPlayer = await ServerGame.create(
        {
            id: player, name: guild.members.cache.get(player).displayName, role: role, alive: 1, drunk: 0, poisoned: 0,
            alignment: (minions.includes(role) || role === 'imp' ? evil : good), protected: (role === 'soldier' ? 1 : 0)
        });
    await newPlayer.save();
}

async function loadGame(server) {
    const newGame = await GameData.create(
        {
            server: server
        });
    await newGame.save();
}

async function createSeatingPlan()
{
    shuffleArray(players);
    for (var i = 0; i < players.length; i++)
    {
        
        console.log(players[i]);
        let nickname = guild.member(players[i]).displayName;
        if (!guild.member(players[i]).hasPermission("ADMINISTRATOR")) {            
            //guild.member(players[i]).setNickname(`${i} ${nickname}`);
        }
        else
        {
            channel.send(`${nickname} please prefix your name with the number ${i} as I don't have the permissions to do it for you :(`);
        }
        const [results, metadata] = await sequelize.query(`UPDATE \`${server}\` SET position = ${i} WHERE id = '${players[i]}';`);
    }

    var [r, m] = await sequelize.query(`SELECT id FROM \`${server}\` WHERE alignment = ${good} AND role != 'fortune-teller';`);
    var e = Math.floor(Math.random() * r.length);
    var tag = r[e].id;
    [r, m] = await sequelize.query(`UPDATE \`${server}\` SET alignment = ${goodException} WHERE id = ${tag};`);

}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function createGameData()
{
    GameData = await sequelize.define('GameData', {
        server: {
            type: DataTypes.STRING,
            allowNull: false,
            primarykey: true
        },
        night: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0
        },
        nominations: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0
        },
        nominee: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        votes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        upForEx: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        maxVotes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        currentVoter: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        deathLastNight: {
            type: DataTypes.STRING,
            defaultValue: null
        }
    },
        {
            tableName: `games`
        }
    );
    await GameData.sync({ force: true });
}

async function createTable(server)
{
    ServerGame = await sequelize.define('ServerGame', {
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        position: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false
        },
        alive: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        drunk: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        poisoned: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        alignment: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        isTurn: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0
        },
        butlerTarget: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        nominated: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        protected: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        ghostvote: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
        {
            tableName: `${server}`
        }
    );
    await ServerGame.sync({ force: true });
    console.log(`The table ${server} was just (re)created!`);
}

connect();
client.login(token);
