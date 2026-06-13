const { Events, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        console.log(`👥 Watching ${client.users.cache.size} users`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━');

        // Set bot status
        client.user.setPresence({
            activities: [
                {
                    name: 'Sentoria Tickets',
                    type: ActivityType.Watching,
                },
            ],
            status: 'online',
        });

        console.log(`✅ Bot is ready! Type /setup in your server to create the ticket panel.`);
    },
};
