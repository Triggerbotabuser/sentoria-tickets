const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const V2 = require('../utils/v2Builder');
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
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ خطأ\nهذا ليس قناة تذكرة مفتوحة.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || ticket.creatorId === member.id;
            if (!isStaff) {
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ رفض\nليس لديك صلاحية لإغلاق هذه التذكرة.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            await interaction.deferReply();
            const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
            const result = await TicketManager.closeTicket(guild, channel.id, member.id, reason);

            if (!result.success) return V2.errorReply(interaction, result.error);

            await V2.replyV2(interaction, config.colors.success, [
                V2.text('## 🔒 تم إغلاق التذكرة\nتم الإغلاق بواسطة ' + member + '.\nسيتم حذف القناة خلال 10 ثوانٍ.'),
            ]);

        } catch (error) {
            console.error('Close error:', error);
            V2.errorReply(interaction, 'حدث خطأ أثناء إغلاق التذكرة.');
        }
    },
};
