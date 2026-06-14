const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder,
    ActionRowBuilder, StringSelectMenuBuilder
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const V2 = require('../utils/v2Builder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('إعداد لوحة التذاكر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const { guild, channel } = interaction;
            await interaction.deferReply({ ephemeral: true }).catch(() => {
                throw new Error('INTERACTION_EXPIRED');
            });

            const settings = await TicketManager.getSettings(guild.id);
            settings.ticketPanelChannelId = channel.id;
            await settings.save();

            const bannerPath = path.join(__dirname, '..', 'assets', 'tickets-banner.png');
            const hasBanner = fs.existsSync(bannerPath);
            const guildIcon = guild.iconURL({ dynamic: true, size: 256 });

            const components = [];

            if (hasBanner) {
                components.push(new MediaGalleryBuilder().addItems({ media: { url: 'attachment://tickets-banner.png' } }));
                components.push(V2.separator());
            }

            const titleSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎫 إنشاء تذكرة — Sentoria'));
            if (guildIcon) {
                titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(guildIcon));
            }
            components.push(titleSection);
            components.push(V2.separator());

            components.push(V2.text(
                'مرحباً بك في الدعم الفني الخاص بـ **Sentoria**.\n' +
                'يرجى اختيار القسم المناسب من القائمة أدناه للحصول على أفضل خدمة ممكنة.'
            ));
            components.push(V2.separator());

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_create_menu')
                .setPlaceholder('اختر القسم...')
                .addOptions(
                    Object.values(config.categories).map(cat => ({
                        label: cat.name,
                        value: cat.id,
                        emoji: cat.emoji,
                        description: cat.description,
                    }))
                );

            components.push(new ActionRowBuilder().addComponents(selectMenu));

            const payload = {
                components: [V2.buildContainer(null, components)],
                flags: MessageFlags.IsComponentsV2,
            };
            if (hasBanner) {
                payload.files = [{ attachment: bannerPath, name: 'tickets-banner.png' }];
            }

            const sentMessage = await channel.send(payload);
            settings.ticketPanelMessageId = sentMessage.id;
            await settings.save();

            await interaction.editReply({
                components: [V2.buildContainer(config.colors.success, [V2.text('## ✅ تم الإعداد\nتم إعداد لوحة التذاكر بنجاح!')])],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error('Setup error:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text(`## ❌ خطأ\n${error.message}`)])],
                    flags: MessageFlags.IsComponentsV2,
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ حدث خطأ: ${error.message}`,
                    ephemeral: true,
                }).catch(() => {});
            }
        }
    },
};
