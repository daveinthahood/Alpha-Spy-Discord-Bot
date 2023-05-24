

const express = require('express')
const app = express()

class Self {
    constructor({ token, webhook, guildId, channelId, allowBots }) {
        this.token = token;
        this.webhook = webhook;
        this.guildId = guildId;
        this.channelId = channelId;
        this.allowBots = allowBots;
    };

    start() {
        const { WebhookClient, parseWebhookURL, AttachmentBuilder } = require('discord.js');
        const { Client } = require('discord.js-selfbot-v13');
        const client = new Client({
            checkUpdate: false
        });
        client.on('ready', async () => {
            console.log(`Started mirroring on: ${this.guildId} - ${this.channelId} Using: ${client.user.username}!`);
        });
        client.on('messageCreate', async (message) => {
            if (message.guildId != this.guildId) return;
            if (message.channelId != this.channelId) return;
            if (message.author.bot && !this.allowBots) return;
            const webhookData = parseWebhookURL(this.webhook);
            const webhookClient = new WebhookClient({ id: webhookData.id, token: webhookData.token });
            const attachments = message.attachments.map(attachment => attachment);
            if(message.content.length === 0 && message.attachments.size === 0 && message.embeds.length === 0)return;
            const files = [];
            for (var i = 0; i < attachments.length; i++) {
                const attachment = new AttachmentBuilder(attachments[i].url, { name: attachments[i].name, description: attachments[i].description });
                files.push(attachment);
            };
            webhookClient.send({
                username: message.author.username,
                avatarURL: message.author.displayAvatarURL({ dynamic: true }),
                content: message.content,
                embeds: message.embeds,
                components: message.components,
                files
            });
        });
        client.login(this.token);

        app.get(`/delete-${this.guildId}-${this.channelId}`, async (req, res) => {
            res.sendStatus(200);
            client.destroy();
        });
    };
};

app.listen(3001);

module.exports = Self;

