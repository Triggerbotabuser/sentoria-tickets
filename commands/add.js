const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('إضافة عضو للتذكرة')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('العضو المطلوب إضافته')
                .setRequired(true)
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
                (config.roles.staff && member.roles.cache.has(config.roles.staff));

            if (!isStaff) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('ليس لديك صلاحية لإضافة أعضاء لهذه التذكرة.')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }

            const targetUser = interaction.options.getUser('user');
            const targetMember = await guild.members.fetch(targetUser.id);

            if (!targetMember) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('العضو غير موجود في السيرفر.')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }

            // Defer reply
            await interaction.deferReply({ ephemeral: true });

            // Add member
            const result = await TicketManager.addMember(guild, channel.id, targetMember, member);

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
                .setTitle('✅ تم إضافة العضو')
                .setDescription(`تم إضافة ${targetMember} إلى التذكرة.`)
                .setTimestamp();

            await interaction.editReply({
                embeds: [successEmbed],
            });

        } catch (error) {
            console.error('Add command error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ خطأ')
                .setDescription('حدث خطأ أثناء إضافة العضو.')
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
            });
        }
    },
};
