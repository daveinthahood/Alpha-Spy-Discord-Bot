// Fiverr: https://www.fiverr.com/amirdev_78

const axios = require('axios').default;
const { REST, Routes, Client, GatewayIntentBits, SlashCommandBuilder, parseWebhookURL, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const { botOwners } = require('./config.json');

const dotenv = require('dotenv');
dotenv.config();

const botToken = process.env.BOT_TOKEN;
const botId = process.env.BOT_ID;

const { isTokenWorking, encrypt, decrypt } = require('./functions');
const Self = require('./Classes/Self');
const Users = require('./Schema/Users');

const mongoose = require('mongoose');

mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected!!');
}).catch(err => {
    console.log('Failed to connect to MongoDB', err);
});

const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .setDMPermission(true),
    new SlashCommandBuilder()
        .setName('addmirror')
        .setDescription('To add a mirror')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('The Server Id')
                .setMinLength(18)
                .setMaxLength(19)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channel_id')
                .setDescription('The Channel Id')
                .setMinLength(18)
                .setMaxLength(19)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('webhook_url')
                .setDescription('The Webhook URL to recieve messages on it')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('user_token')
                .setDescription('The User Token that have access to the channel!')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('allow_bots')
                .setDescription('Allow sending bots messages')
                .setRequired(true))
        .setDMPermission(true),
    new SlashCommandBuilder()
        .setName('deletemirror')
        .setDescription('To delete a mirror')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('The Server Id')
                .setMinLength(18)
                .setMaxLength(19)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channel_id')
                .setDescription('The Channel Id')
                .setMinLength(18)
                .setMaxLength(19)
                .setRequired(true))
        .setDMPermission(false),
    new SlashCommandBuilder()
        .setName('mirrorlist')
        .setDescription('To show list of mirrors')
        .setDMPermission(false)
];

const rest = new REST({ version: '10' }).setToken(botToken);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(botId), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (interaction.commandName === 'addmirror') {
        await interaction.deferReply({ ephemeral: true });
        const server_id = interaction.options.getString('server_id');
        const channel_id = interaction.options.getString('channel_id');
        const webhook_url = interaction.options.getString('webhook_url');
        const user_token = interaction.options.getString('user_token');
        const allow_bots = interaction.options.getBoolean('allow_bots');
        if (isNaN(server_id)) return interaction.editReply(':x: Server Id is incorrect!');
        if (isNaN(channel_id)) return interaction.editReply(':x: Channel Id is incorrect!');
        const webhookData = parseWebhookURL(webhook_url);
        if (!webhookData || !webhookData.id || !webhookData.token) return interaction.editReply(':x: Webhook URL is incorrect!');
        const isWorking = await isTokenWorking(user_token);
        if (!isWorking) return interaction.editReply(':x: User Token is incorrect!');
        const userDB = await Users.findOne({ guildId: server_id, channelId: channel_id });
        if (userDB) return interaction.editReply(':x: This channel already used!');
        const newUserDB = new Users({
            created_by: interaction.user.id,
            tokenCrypted: encrypt(user_token),
            guildId: server_id,
            channelId: channel_id,
            webhookURL: webhook_url,
            allowBots: allow_bots
        });
        newUserDB.save().then(async () => {
            await interaction.editReply(':white_check_mark: Started Mirroring!');
            const selfBot = new Self({ token: user_token, guildId: server_id, channelId: channel_id, allowBots: allow_bots, webhook: webhook_url });
            selfBot.start();
        });
    } else if (interaction.commandName === 'deletemirror') {
        await interaction.deferReply({ ephemeral: true });
        const server_id = interaction.options.getString('server_id');
        const channel_id = interaction.options.getString('channel_id');
        const userDB = await Users.findOne({ guildId: server_id, channelId: channel_id });
        if (!userDB) return interaction.editReply(':x: Mirror not found!');
        if (!botOwners.includes(interaction.user.id) && userDB.created_by != interaction.user.id) return interaction.editReply(':x: Only the user who created this mirror can delete it (and the bot owners)!');
        const response = await axios.get(`http://localhost:3001/delete-${server_id}-${channel_id}`);
        if (response.status === 200) {
            await Users.deleteOne({ guildId: server_id, channelId: channel_id });
            await interaction.editReply(':white_check_mark: Deleted successfully!');
        } else {
            await interaction.editReply(':x: Failed to delete the mirror!');
        }
    }else if(interaction.commandName === 'mirrorlist'){
        await interaction.deferReply({ ephemeral: true });
        const usersDB = await Users.find({});
        var description = '**Server Id** - **Channel Id**';
        for(const userData of usersDB){
            description += `\n${userData.guildId} **-** ${userData.channelId}`
        };
        const embed = new EmbedBuilder()
        .setAuthor({name: client.user.username, iconURL: client.user.displayAvatarURL()})
        .setColor('Blurple')
        .setDescription(description)
        .setTimestamp(Date.now())
        await interaction.editReply({embeds: [embed]});
    };
});

Users.find({}).then(async (usersDB) => {
    usersDB.forEach(async (userDB) => {
        const isWorking = await isTokenWorking(decrypt(userDB.tokenCrypted));
        if (!isWorking) return await Users.deleteOne({ guildId: userDB.guildId, tokenCrypted: userDB.tokenCrypted, channelId: userDB.channelId });
        const selfBot = new Self({ token: decrypt(userDB.tokenCrypted), guildId: userDB.guildId, channelId: userDB.channelId, allowBots: userDB.allowBots, webhook: userDB.webhookURL });
        selfBot.start();
    });
});

process.on("rejectionHandled", (promise) => {
    console.error(promise)
    console.log("Rejection Handled In " + promise);
});

process.on("unhandledRejection", (promise) => {
    console.error(promise)
    console.log("Unhadled Rejection In" + promise);
});

process.on("uncaughtException", (promise) => {
    console.error(promise)
    console.log("UncaughException In " + promise);
});


client.login(botToken);

