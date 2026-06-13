const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const V2 = require('../utils/v2Builder');
const Ticket = require('../models/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('تغيير اسم التذكرة')
        .addStringOption(option =>
            option.setName('name').setDescription('الاسم الجديد للقناة').setRequired(true)
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
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ رفض\nليس لديك صلاحية لتغيير اسم التذكرة.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            const newName = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');
            if (newName.length < 1 || newName.length > 100) {
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ خطأ\nيجب أن يكون الاسم بين 1 و 100 حرف.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const result = await TicketManager.renameTicket(guild, channel.id, newName, member);

            if (!result.success) return V2.errorReply(interaction, result.error);

            await V2.replyV2(interaction, config.colors.success, [
                V2.text(`## ✅ تم تغيير الاسم\nتم تغيير اسم التذكرة إلى **${newName}**.`),
            ]);

        } catch (error) {
            console.error('Rename error:', error);
            V2.errorReply(interaction, 'حدث خطأ أثناء تغيير اسم التذكرة.');
        }
    },
};
