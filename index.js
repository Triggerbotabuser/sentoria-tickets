const { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const Ticket = require('./models/Ticket');
const TicketManager = require('./utils/ticketManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
client.cooldowns = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded: ${command.data.name}`);
    }
}

mongoose.connect(config.mongoUri)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(e => { console.error('❌ MongoDB error:', e); process.exit(1); });

client.once('ready', async (c) => {
    console.log(`✅ Bot online: ${c.user.tag}`);

    c.user.setPresence({ activities: [{ name: 'Sentoria Tickets', type: 3 }], status: 'online' });

    try {
        const guild = c.guilds.cache.get(config.guildId);
        if (guild) {
            const cmds = client.commands.map(c => c.data.toJSON());
            await guild.commands.set(cmds);
            console.log(`✅ Registered ${cmds.length} commands to ${guild.name}`);
        }
    } catch (e) {
        console.error('Command registration error:', e);
    }
});

client.on('interactionCreate', async (interaction) => {
    console.log(`[INTERACTION] ${interaction.type} | ${interaction.commandName || interaction.customId}`);

    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return console.log(`Command not found: ${interaction.commandName}`);
            await command.execute(interaction);
        }

        if (interaction.isButton()) {
            const { customId } = interaction;

            if (customId.startsWith('ticket_create_')) {
                const category = customId.replace('ticket_create_', '');
                const { guild, member } = interaction;
                const settings = await TicketManager.getSettings(guild.id);
                const check = await TicketManager.canCreateTicket(guild.id, member.id);
                if (!check.allowed) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription(check.reason)], ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const result = await TicketManager.createTicket(guild, member, category, settings);
                if (!result.success) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription(result.error)] });
                client.cooldowns.set(`${guild.id}-${member.id}`, Date.now() + config.tickets.cooldownTime);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('✅ تم إنشاء التذكرة').setDescription(`**رقم التذكرة:** ${result.ticketNumber}\n**القناة:** <#${result.channel.id}>`).setFooter({ text: config.botName }).setTimestamp()] });
            }

            if (customId.startsWith('ticket_close_')) {
                const { guild, member, channel } = interaction;
                const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id, status: 'open' });
                if (!ticket) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('هذه ليست تذكرة مفتوحة.')], ephemeral: true });
                if (ticket.creatorId !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('ليس لديك صلاحية.')], ephemeral: true });
                await interaction.deferReply();
                const result = await TicketManager.closeTicket(guild, channel.id, member.id);
                if (!result.success) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription(result.error)] });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('✅ تم إغلاق التذكرة').setDescription('سيتم حذف القناة خلال 10 ثوانٍ.').setTimestamp()] });
            }

            if (customId.startsWith('ticket_claim_')) {
                const { guild, member, channel } = interaction;
                const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id, status: 'open' });
                if (!ticket) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('هذه ليست تذكرة.')], ephemeral: true });
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('ليس لديك صلاحية.')], ephemeral: true });
                await interaction.deferReply();
                const result = await TicketManager.claimTicket(guild, channel.id, member.id);
                if (!result.success) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription(result.error)] });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('✅ تم استلام التذكرة').setTimestamp()] });
            }

            if (customId.startsWith('ticket_transcript_')) {
                const { guild, channel } = interaction;
                const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id });
                if (!ticket) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('هذه ليست تذكرة.')], ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const transcript = await TicketManager.generateTranscript(channel, ticket);
                if (!transcript) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('حدث خطأ.')] });
                ticket.transcript = transcript;
                await ticket.save();
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('✅ تم إنشاء النسخة').setTimestamp()], files: [{ attachment: Buffer.from(transcript, 'utf-8'), name: `transcript-${TicketManager.formatTicketNumber(ticket.ticketId)}.html` }] });
            }
        }
    } catch (error) {
        console.error('[ERROR]', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ حدث خطأ.', ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true }).catch(() => {});
        }
    }
});

process.on('unhandledRejection', e => console.error('Rejection:', e));

console.log('🎫 Starting Sentoria Tickets...');
client.login(config.token);
