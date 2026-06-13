const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const Ticket = require('../models/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('استلام التذكرة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const { guild, channel, member } = interaction;

            const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id, status: 'open' });
            if (!ticket) {
                const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nهذا ليس قناة تذكرة مفتوحة.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            const isStaff = member.permissions.has(PermissionFlagsBits.Administrator);
            if (!isStaff) {
                const components = [new TextDisplayBuilder().setContent('## ❌ رفض\nليس لديك صلاحية لاستلام التذكرة.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const result = await TicketManager.claimTicket(guild, channel.id, member.id);

            if (!result.success) {
                const components = [new TextDisplayBuilder().setContent(`## ❌ خطأ\n${result.error}`)];
                return interaction.editReply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const components = [new TextDisplayBuilder().setContent(`## ✅ تم الاستلام\nتم استلام التذكرة بواسطة ${member}.\nأنت الآن مسؤول عن هذه التذكرة.`)];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.success).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error('Claim error:', error);
            const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nحدث خطأ أثناء استلام التذكرة.')];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
