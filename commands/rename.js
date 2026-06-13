const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('تغيير اسم التذكرة')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('الاسم الجديد للقناة')
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
                    .setDescription('ليس لديك صلاحية لتغيير اسم هذه التذكرة.')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }

            const newName = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');

            // Validate channel name
            if (newName.length < 1 || newName.length > 100) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('يجب أن يكون الاسم بين 1 و 100 حرف.')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }

            // Defer reply
            await interaction.deferReply({ ephemeral: true });

            // Rename ticket
            const result = await TicketManager.renameTicket(guild, channel.id, newName, member);

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
                .setTitle('✅ تم تغيير الاسم')
                .setDescription(`تم تغيير اسم التذكرة إلى **${newName}**.`)
                .setTimestamp();

            await interaction.editReply({
                embeds: [successEmbed],
            });

        } catch (error) {
            console.error('Rename command error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ خطأ')
                .setDescription('حدث خطأ أثناء تغيير اسم التذكرة.')
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
            });
        }
    },
};
