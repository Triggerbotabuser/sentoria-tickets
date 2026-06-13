const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorStyle
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const Ticket = require('../models/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('إغلاق التذكرة الحالية')
        .addStringOption(option =>
            option.setName('reason').setDescription('سبب الإغلاق').setRequired(false)
        ),

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

            const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || ticket.creatorId === member.id;
            if (!isStaff) {
                const components = [new TextDisplayBuilder().setContent('## ❌ رفض\nليس لديك صلاحية لإغلاق هذه التذكرة.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply();
            const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
            const result = await TicketManager.closeTicket(guild, channel.id, member.id, reason);

            if (!result.success) {
                const components = [new TextDisplayBuilder().setContent(`## ❌ خطأ\n${result.error}`)];
                return interaction.editReply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const components = [
                new TextDisplayBuilder().setContent('## 🔒 تم إغلاق التذكرة\nتم الإغلاق بواسطة ' + member + '.\nسيتم حذف القناة خلال 10 ثوانٍ.'),
            ];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.success).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error('Close error:', error);
            const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nحدث خطأ أثناء إغلاق التذكرة.')];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
