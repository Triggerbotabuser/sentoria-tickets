const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
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
                const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nهذا ليس قناة تذكرة مفتوحة.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            const isStaff = member.permissions.has(PermissionFlagsBits.Administrator);
            if (!isStaff) {
                const components = [new TextDisplayBuilder().setContent('## ❌ رفض\nليس لديك صلاحية لتغيير اسم التذكرة.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            const newName = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');
            if (newName.length < 1 || newName.length > 100) {
                const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nيجب أن يكون الاسم بين 1 و 100 حرف.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const result = await TicketManager.renameTicket(guild, channel.id, newName, member);

            if (!result.success) {
                const components = [new TextDisplayBuilder().setContent(`## ❌ خطأ\n${result.error}`)];
                return interaction.editReply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const components = [new TextDisplayBuilder().setContent(`## ✅ تم تغيير الاسم\nتم تغيير اسم التذكرة إلى **${newName}**.`)];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.success).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error('Rename error:', error);
            const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nحدث خطأ أثناء تغيير اسم التذكرة.')];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
