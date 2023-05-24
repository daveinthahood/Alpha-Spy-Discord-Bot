

const mongoose = require('mongoose');

const Users = mongoose.Schema({
    created_by: { type: String, required: true },
    tokenCrypted: { type: String, required: true },
    guildId:{ type: String, required: true },
    channelId:{ type: String, required: true },
    webhookURL:{ type: String, required: true },
    allowBots:{ type: Boolean, required: true }   
})

module.exports = mongoose.model("user", Users);

