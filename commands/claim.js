const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const V2 = require('../utils/v2Builder');
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
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ خطأ\nهذا ليس قناة تذكرة مفتوحة.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ رفض\nليس لديك صلاحية لاستلام التذكرة.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const result = await TicketManager.claimTicket(guild, channel.id, member.id);

            if (!result.success) return V2.errorReply(interaction, result.error);

            await V2.replyV2(interaction, config.colors.success, [
                V2.text(`## ✅ تم الاستلام\nتم استلام التذكرة بواسطة ${member}.\nأنت الآن مسؤول عن هذه التذكرة.`),
            ]);

        } catch (error) {
            console.error('Claim error:', error);
            V2.errorReply(interaction, 'حدث خطأ أثناء استلام التذكرة.');
        }
    },
};
