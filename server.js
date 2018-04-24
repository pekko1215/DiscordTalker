const Eris = require("eris");
const { VoiceText } = require('voice-text');
const { writeFileSync } = require('fs');
const Tokens = require('./tokens.js');

const voiceText = new VoiceText(Tokens.voiceText);
const bot = new Eris(Tokens.discord);
// console.log(Tokens)
var connection = null;
var textBuffer = [];
const ChannelName = 'text_to_voice'
var userVoice = {};
const VoiceTable = ['hikari', 'haruka', 'takeru', 'santa', 'bear', 'show']

bot.on("ready", () => { // When the bot is ready
    bot.guilds.forEach((guild) => {
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
                var channel = msg.channel.guild.channels.find((channel) => {
                    return channel.name === name && channel.type === 2
                })
                if (!channel) {
                    return false;
                }
                bot.joinVoiceChannel(channel.id).then((con) => {
                    connection = con;
                    connection.on('end', () => {
                        if (textBuffer.length) {
                            connection.play(getYomiageStream(textBuffer.shift()))
                        }
                    })
                });
                return true
            }
        })
        commands.push({
            alias: 'stop',
            fn: () => {
                if (connection) {
                    bot.leaveVoiceChannel(connection.id)
                    textBuffer = []
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
        var command;
        if (!arr.some((word, i) => {
                var com = commands.find((command) => {
                    return word === command.alias
                })
                if (!com) {
                    return
                }
                if (!com.fn(...arr.splice(i + 1)))
                    msg.addReaction('😥');
                return true;
            })) {
            msg.addReaction('😥')
        } else {
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
        var stream = getYomiageStream({
            voice: voice,
            msg: msg.content
        })
        connection.play(stream)
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
    return voiceText.stream(obj.msg, {
        speaker: obj.voice
    })
}
bot.connect(); // Get the bot to connect to Discord