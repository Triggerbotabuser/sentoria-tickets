const {
    SlashCommandBuilder, PermissionFlagsBits,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, SeparatorStyle, MessageFlags
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');

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
                components.push(
                    new MediaGalleryBuilder().addItems({ media: { url: 'attachment://tickets-banner.png' } })
                );
                components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));
            }

            const titleSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# 🎫 إنشاء تذكرة — Sentoria')
                );
            if (guildIcon) {
                titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(guildIcon));
            }
            components.push(titleSection);

            components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));

            components.push(new TextDisplayBuilder().setContent(
                'مرحباً بك في الدعم الفني الخاص بـ **Sentoria**.\n' +
                'يرجى اختيار القسم المناسب من الأسفل للحصول على أفضل خدمة ممكنة.'
            ));

            components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));

            components.push(new TextDisplayBuilder().setContent(
                '**🔧 الدعم الفني** — للمشاكل التقنية والأعطال\n' +
                '**👮 تقديم بلاغ** — للإبلاغ عن لاعب أو مشكلة\n' +
                '**📋 تقديم للإدارة** — التواصل المباشر مع الإدارة\n' +
                '**🤝 الشراكات** — طلبات الشراكات والتعاون\n' +
                '**❓ الدعم العام** — الأسئلة والاستفسارات العامة'
            ));

            components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));

            components.push(new TextDisplayBuilder().setContent('> Sentoria Tickets v2.0 • Premium Support System'));

            components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));

            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_create_technical').setLabel('🔧 الدعم الفني').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_create_player-report').setLabel('👮 تقديم بلاغ').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_create_management').setLabel('📋 تقديم للإدارة').setStyle(ButtonStyle.Success),
            ));

            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_create_partnership').setLabel('🤝 الشراكات').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_create_general').setLabel('❓ الدعم العام').setStyle(ButtonStyle.Secondary),
            ));

            const container = new ContainerBuilder()
                .setAccentColor(config.colors.primary)
                .addComponents(...components);

            const payload = {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            };

            if (hasBanner) {
                payload.files = [{ attachment: bannerPath, name: 'tickets-banner.png' }];
            }

            const sentMessage = await channel.send(payload);

            settings.ticketPanelMessageId = sentMessage.id;
            await settings.save();

            const replyComponents = [
                new TextDisplayBuilder().setContent('## ✅ تم الإعداد\nتم إعداد لوحة التذاكر بنجاح!'),
            ];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.success).addComponents(...replyComponents)],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error('Setup error:', error);
            const components = [new TextDisplayBuilder().setContent(`## ❌ خطأ\n${error.message}`)];
            await interaction.editReply({
                components: [new ContainerBuilder().setAccentColor(config.colors.danger).addComponents(...components)],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
