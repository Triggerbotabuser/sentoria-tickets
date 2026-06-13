const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
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
            await interaction.deferReply({ ephemeral: true });

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
                'يرجى اختيار القسم المناسب من الأسفل للحصول على أفضل خدمة ممكنة.'
            ));
            components.push(V2.separator());

            components.push(V2.text(
                '**🔧 الدعم الفني** — للمشاكل التقنية والأعطال\n' +
                '**👮 تقديم بلاغ** — للإبلاغ عن لاعب أو مشكلة\n' +
                '**📋 تقديم للإدارة** — التواصل المباشر مع الإدارة\n' +
                '**🤝 الشراكات** — طلبات الشراكات والتعاون\n' +
                '**❓ الدعم العام** — الأسئلة والاستفسارات العامة'
            ));
            components.push(V2.separator());

            components.push(V2.text('> Sentoria Tickets v2.0 • Premium Support System'));
            components.push(V2.separator());

            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_create_technical').setLabel('🔧 الدعم الفني').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_create_player-report').setLabel('👮 تقديم بلاغ').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_create_management').setLabel('📋 تقديم للإدارة').setStyle(ButtonStyle.Success),
            ));
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_create_partnership').setLabel('🤝 الشراكات').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_create_general').setLabel('❓ الدعم العام').setStyle(ButtonStyle.Secondary),
            ));

            const payload = {
                components: [V2.buildContainer(config.colors.primary, components)],
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
            await interaction.editReply({
                components: [V2.buildContainer(config.colors.danger, [V2.text(`## ❌ خطأ\n${error.message}`)])],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
