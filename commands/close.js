const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('إغلاق التذكرة الحالية')
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('سبب الإغلاق')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const { guild, channel, member } = interaction;

            // Check if this is a ticket channel
            const ticket = await require('../models/Ticket').findOne({
                channelId: channel.id,
                guildId: guild.id,
                status: 'open',
            });

            if (!ticket) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('هذا ليس قناة تذكرة مفتوحة.')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }

            // Check permissions
            const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) ||
                (config.roles.staff && member.roles.cache.has(config.roles.staff)) ||
                ticket.creatorId === member.id;

            if (!isStaff) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('ليس لديك صلاحية لإغلاق هذه التذكرة.')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }

            // Defer reply
            await interaction.deferReply();

            const reason = interaction.options.getString('reason') || 'لا يوجد سبب';

            // Close ticket
            const result = await TicketManager.closeTicket(guild, channel.id, member.id, reason);

            if (!result.success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription(result.error)
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [errorEmbed],
                });
            }

            const successEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ تم إغلاق التذكرة')
                .setDescription(`تم إغلاق التذكرة بواسطة ${member}.\nسيتم حذف القناة خلال 10 ثوانٍ.`)
                .setTimestamp();

            await interaction.editReply({
                embeds: [successEmbed],
            });

        } catch (error) {
            console.error('Close command error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ خطأ')
                .setDescription('حدث خطأ أثناء إغلاق التذكرة.')
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
            });
        }
    },
};
