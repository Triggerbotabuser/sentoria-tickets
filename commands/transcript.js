const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const Ticket = require('../models/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('حفظ نسخة من التذكرة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const { guild, channel } = interaction;

            const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id });
            if (!ticket) {
                const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nهذا ليس قناة تذكرة.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const transcript = await TicketManager.generateTranscript(channel, ticket);

            if (!transcript) {
                const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nحدث خطأ أثناء إنشاء النسخة.')];
                return interaction.editReply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            ticket.transcript = transcript;
            await ticket.save();

            const components = [new TextDisplayBuilder().setContent('## ✅ تم إنشاء النسخة\nملف النسخة جاهز.')];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.success).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
                files: [{
                    attachment: Buffer.from(transcript, 'utf-8'),
                    name: `transcript-${TicketManager.formatTicketNumber(ticket.ticketId)}.html`,
                }],
            });

        } catch (error) {
            console.error('Transcript error:', error);
            const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nحدث خطأ أثناء إنشاء النسخة.')];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
