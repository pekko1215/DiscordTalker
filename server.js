const Eris = require("eris");
const { VoiceText } = require('voice-text');
const { writeFileSync } = require('fs');
const Tokens = require('./tokens.js');
const fs = require('fs');
const streamifier = require('streamifier');

const voiceText = new VoiceText(Tokens.voiceText);
const bot = new Eris(Tokens.discord);

var connection = null;
var textBuffer = [];
const ChannelName = 'texttovoice'
var userVoice = {};
const VoiceTable = ['hikari', 'haruka', 'takeru', 'santa', 'bear', 'show']
var options = require('./options')

bot.on("ready", () => { // When the bot is ready
    bot.guilds.forEach(guild => {
        var flag = true;
        guild.channels.forEach((channel) => {
            if (channel.name === ChannelName) {
                flag = false;
            }
        })
        if (flag) {
            var parent = guild.channels.find((channel) => {
                return channel.name === 'Text Channels'
            })
            guild.createChannel(ChannelName, 0, '', parent.id);
        }
    })
    if (options.currentChannel) {
        bot.leaveVoiceChannel(options.currentChannel);
        setTimeout(()=>{
            joinVoiceChannelById(options.currentChannel)
        },3000)
    }
    console.log("Ready!"); // Log "Ready!"
});

bot.on("messageCreate", (msg) => { // When a message is created
    if (msg.mentions.some((user) => {
            return user.id === bot.user.id
        })) {
        var text = msg.content;
        var arr = text.split(' ')
        var commands = [];
        commands.push({
            alias: 'join',
            fn: (name) => {
                return joinVoiceChannelByName(name);
            }
        })
        commands.push({
            alias: 'stop',
            fn: () => {
                if (connection) {
                    bot.leaveVoiceChannel(connection.id)
                    textBuffer = []
                    options.currentChannel = null;
                    updateOptionFile();
                    return true;
                }
                return false;
            }
        })
        commands.push({
            alias: 'voice',
            fn: (num) => {
                if (!(num in VoiceTable)) { return false; }
                userVoice[msg.author.id] = VoiceTable[num]
                return true;
            }
        })
        arr.shift();
        if (!arr.some((word, i) => {
                var com = commands.find((command) => {
                    return word === command.alias
                })
                if (!com) {
                    msg.addReaction('😥');
                    return
                }
                if (!com.fn(...arr.splice(i + 1))) {
                    msg.addReaction('😥');
                }
                return true;
            })) {} else {
            return
        }
    }
    if (msg.channel.name !== ChannelName) { return; }
    if (!connection) { return }
    if (connection.playing) {
        var voice = getVoiceByUser(msg.author.id)
        textBuffer.push({
            voice: voice,
            msg: msg.content
        })
    } else {
        var voice = getVoiceByUser(msg.author.id)
        var error = getYomiageStream({
            voice: voice,
            msg: msg.content
        })
        if(error){
            msg.addReaction('😥');
        }
    }
})

function getVoiceByUser(id) {
    if (id in userVoice) {
        return userVoice[id];
    }
    var voice = VoiceTable[Math.floor(Math.random() * VoiceTable.length)];
    userVoice[id] = voice;
    return voice;
}

function getYomiageStream(obj) {
    var ranges = [
        '\ud83c[\udf00-\udfff]',
        '\ud83d[\udc00-\ude4f]',
        '\ud83d[\ude80-\udeff]',
        '\ud7c9[\ude00-\udeff]',
        '[\u2600-\u27BF]'
    ];
    var ex = new RegExp(ranges.join('|'), 'g');
    obj.msg = obj.msg.replace(ex, ''); //ここで削除

    if(!obj.msg){return true}
    var url = voiceText.fetchBuffer(obj.msg,{
        speaker: obj.voice
    }).then(buffer=>{
        try {
            JSON.parse(buffer.toString('utf-8'));
        }catch(e){
            var stream = require('buffer-to-stream')(buffer);
            connection.play(stream);
        }
    })

}

function joinVoiceChannelByName(name) {
    for (var guild of bot.guilds.values()) {
        for (var channel of guild.channels.values()) {
            if (channel.name != name || channel.type != 2) { continue; }
            return joinVoiceChannelById(channel.id)
        }
    }
}

function joinVoiceChannelById(id) {
    bot.joinVoiceChannel(id)
        .then((con) => {
            connection = con;
            options.currentChannel = id;
            updateOptionFile();
            connection.on('end', () => {
                if (textBuffer.length) {
                    connection.play(getYomiageStream(textBuffer.shift()))
                }
            })
        });
    return true;
}

function updateOptionFile() {
    fs.writeFile('./options.json', JSON.stringify(options, null, 4), 'utf8', () => {});
}

bot.connect(); // Get the bot to connect to Discord
