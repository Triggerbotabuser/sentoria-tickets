const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const Ticket = require('../models/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('إضافة عضو للتذكرة')
        .addUserOption(option =>
            option.setName('user').setDescription('العضو المطلوب إضافته').setRequired(true)
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
                const components = [new TextDisplayBuilder().setContent('## ❌ رفض\nليس لديك صلاحية لإضافة أعضاء.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            const targetUser = interaction.options.getUser('user');
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nالعضو غير موجود في السيرفر.')];
                return interaction.reply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const result = await TicketManager.addMember(guild, channel.id, targetMember, member);

            if (!result.success) {
                const components = [new TextDisplayBuilder().setContent(`## ❌ خطأ\n${result.error}`)];
                return interaction.editReply({
                    components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const components = [new TextDisplayBuilder().setContent(`## ✅ تم الإضافة\nتم إضافة ${targetMember} إلى التذكرة.`)];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.success).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error('Add error:', error);
            const components = [new TextDisplayBuilder().setContent('## ❌ خطأ\nحدث خطأ أثناء إضافة العضو.')];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
