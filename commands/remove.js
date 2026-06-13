const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const V2 = require('../utils/v2Builder');
const Ticket = require('../models/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('إزالة عضو من التذكرة')
        .addUserOption(option =>
            option.setName('user').setDescription('العضو المطلوب إزالته').setRequired(true)
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

            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ رفض\nليس لديك صلاحية لإزالة أعضاء.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            const targetUser = interaction.options.getUser('user');
            if (targetUser.id === ticket.creatorId) {
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ خطأ\nلا يمكن إزالة منشئ التذكرة.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ خطأ\nالعضو غير موجود في السيرفر.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const result = await TicketManager.removeMember(guild, channel.id, targetMember, member);

            if (!result.success) return V2.errorReply(interaction, result.error);

            await V2.replyV2(interaction, config.colors.success, [
                V2.text(`## ✅ تم الإزالة\nتم إزالة ${targetMember.user.tag} من التذكرة.`),
            ]);

        } catch (error) {
            console.error('Remove error:', error);
            V2.errorReply(interaction, 'حدث خطأ أثناء إزالة العضو.');
        }
    },
};
