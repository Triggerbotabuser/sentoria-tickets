const {
    Client, GatewayIntentBits, Collection, Partials,
    ButtonStyle, PermissionFlagsBits, ChannelType,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder,
    ActionRowBuilder, ButtonBuilder, SeparatorStyle, MessageFlags
} = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const Ticket = require('./models/Ticket');
const TicketManager = require('./utils/ticketManager');
const V2 = require('./utils/v2Builder');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Sentoria Tickets v2.0 is online!'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
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
    console.log(`✅ Bot online: ${c.user.tag} | v${config.botVersion}`);
    c.user.setPresence({
        activities: [{ name: 'Sentoria Tickets V2', type: 3 }],
        status: 'online',
    });

    try {
        const guild = c.guilds.cache.get(config.guildId);
        if (guild) {
            const cmds = client.commands.map(c => c.data.toJSON());
            await guild.commands.set(cmds);
            console.log(`✅ Registered ${cmds.length} commands to ${guild.name}`);
        }
    } catch (e) {
        console.error('❌ Command registration error:', e);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction, client);
        }

        if (interaction.isButton()) {
            const { customId } = interaction;

            if (customId.startsWith('ticket_create_')) {
                const category = customId.replace('ticket_create_', '');
                const { guild, member } = interaction;
                const settings = await TicketManager.getSettings(guild.id);

                const check = await TicketManager.canCreateTicket(guild.id, member.id);
                if (!check.allowed) {
                    const components = [
                        V2.text(`## ❌ رفض\n${check.reason}`),
                    ];
                    return interaction.reply({
                        components: [V2.createContainer(config.colors.danger, components)],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true,
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                const result = await TicketManager.createTicket(guild, member, category, settings);
                if (!result.success) {
                    return V2.errorReply(interaction, result.error);
                }

                client.cooldowns.set(`${guild.id}-${member.id}`, Date.now() + config.tickets.cooldownTime);

                const components = [
                    V2.text(`## ✅ تم إنشاء التذكرة\n**رقم التذكرة:** ${result.ticketNumber}\n**القناة:** <#${result.channel.id}>`),
                ];
                await V2.replyV2(interaction, components);
            }

            if (customId.startsWith('ticket_close_')) {
                const { guild, member, channel } = interaction;
                const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id, status: 'open' });

                if (!ticket) {
                    const components = [V2.text('## ❌ خطأ\nهذه ليست تذكرة مفتوحة.')];
                    return interaction.reply({
                        components: [V2.createContainer(config.colors.danger, components)],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true,
                    });
                }

                if (ticket.creatorId !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const components = [V2.text('## ❌ رفض\nليس لديك صلاحية لإغلاق هذه التذكرة.')];
                    return interaction.reply({
                        components: [V2.createContainer(config.colors.danger, components)],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true,
                    });
                }

                await interaction.deferReply();
                const result = await TicketManager.closeTicket(guild, channel.id, member.id);
                if (!result.success) return V2.errorReply(interaction, result.error);

                const components = [
                    V2.text('## 🔒 تم إغلاق التذكرة\nسيتم حذف القناة خلال 10 ثوانٍ.'),
                ];
                await V2.replyV2(interaction, components);
            }

            if (customId.startsWith('ticket_claim_')) {
                const { guild, member, channel } = interaction;
                const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id, status: 'open' });

                if (!ticket) {
                    const components = [V2.text('## ❌ خطأ\nهذه ليست تذكرة.')];
                    return interaction.reply({
                        components: [V2.createContainer(config.colors.danger, components)],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true,
                    });
                }

                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const components = [V2.text('## ❌ رفض\nليس لديك صلاحية.')];
                    return interaction.reply({
                        components: [V2.createContainer(config.colors.danger, components)],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true,
                    });
                }

                await interaction.deferReply();
                const result = await TicketManager.claimTicket(guild, channel.id, member.id);
                if (!result.success) return V2.errorReply(interaction, result.error);

                const components = [V2.text('## ✅ تم استلام التذكرة\nالآن أنت مسؤول عن هذه التذكرة.')];
                await V2.replyV2(interaction, components);
            }

            if (customId.startsWith('ticket_transcript_')) {
                const { guild, channel } = interaction;
                const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id });

                if (!ticket) {
                    const components = [V2.text('## ❌ خطأ\nهذه ليست تذكرة.')];
                    return interaction.reply({
                        components: [V2.createContainer(config.colors.danger, components)],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true,
                    });
                }

                await interaction.deferReply({ ephemeral: true });
                const transcript = await TicketManager.generateTranscript(channel, ticket);
                if (!transcript) return V2.errorReply(interaction, 'حدث خطأ أثناء إنشاء النسخة.');

                ticket.transcript = transcript;
                await ticket.save();

                const components = [V2.text('## ✅ تم إنشاء النسخة\nملف النسخة جاهز.')];
                await interaction.editReply({
                    components: [V2.createContainer(config.colors.success, components)],
                    flags: MessageFlags.IsComponentsV2,
                    files: [{
                        attachment: Buffer.from(transcript, 'utf-8'),
                        name: `transcript-${TicketManager.formatTicketNumber(ticket.ticketId)}.html`,
                    }],
                });
            }
        }
    } catch (error) {
        console.error('[ERROR]', error);
        const msg = '❌ حدث خطأ غير متوقع.';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
        }
    }
});

process.on('unhandledRejection', e => console.error('Rejection:', e));
console.log('🎫 Starting Sentoria Tickets v2.0...');
client.login(config.token);
