const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('حفظ نسخة من التذكرة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const { guild, channel, member } = interaction;

            // Check if this is a ticket channel
            const ticket = await require('../models/Ticket').findOne({
                channelId: channel.id,
                guildId: guild.id,
            });

            if (!ticket) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('هذا ليس قناة تذكرة.')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }

            // Defer reply
            await interaction.deferReply({ ephemeral: true });

            // Generate transcript
            const transcript = await TicketManager.generateTranscript(channel, ticket);

            if (!transcript) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('حدث خطأ أثناء إنشاء النسخة.')
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [errorEmbed],
                });
            }

            // Update ticket with transcript
            ticket.transcript = transcript;
            await ticket.save();

            // Send transcript
            const successEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ تم إنشاء النسخة')
                .setDescription('تم إنشاء نسخة من التذكرة بنجاح.')
                .setTimestamp();

            await interaction.editReply({
                embeds: [successEmbed],
                files: [{
                    attachment: Buffer.from(transcript, 'utf-8'),
                    name: `transcript-${TicketManager.formatTicketNumber(ticket.ticketId)}.html`,
                }],
            });

        } catch (error) {
            console.error('Transcript command error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ خطأ')
                .setDescription('حدث خطأ أثناء إنشاء النسخة.')
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
            });
        }
    },
};
