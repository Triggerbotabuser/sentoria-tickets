const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SeparatorStyle, PermissionFlagsBits } = require('discord.js');
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

            const hasBanner = (() => {
                try {
                    const bannerPath = require('path').join(__dirname, '..', 'assets', 'tickets-banner.png');
                    return require('fs').existsSync(bannerPath);
                } catch { return false; }
            })();

            const bannerPath = require('path').join(__dirname, '..', 'assets', 'tickets-banner.png');

            const components = [];

            // Banner image
            if (hasBanner) {
                components.push(
                    new MediaGalleryBuilder().addItems({
                        media: { url: 'attachment://tickets-banner.png' },
                    })
                );
            }

            // Main title section with server icon
            components.push(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# 🎫 إنشاء تذكرة`)
                    )
                    .setAccessory(
                        new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true, size: 256 }))
                    )
            );

            // Separator
            components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));

            // Welcome message
            components.push(
                new TextDisplayBuilder().setContent(
                    `مرحباً بك في الدعم الفني الخاص بـ **Sentoria**.\n` +
                    `يرجى اختيار القسم المناسب من الأسفل للحصول على أفضل خدمة ممكنة.`
                )
            );

            // Separator
            components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));

            // Categories
            components.push(
                new TextDisplayBuilder().setContent(
                    `**🔧 الدعم الفني** — للمشاكل التقنية والأعطال\n` +
                    `**👮 تقديم بلاغ** — للإبلاغ عن لاعب أو مشكلة\n` +
                    `**📋 تقديم للإدارة** — التواصل المباشر مع الإدارة\n` +
                    `**🤝 الشراكات** — طلبات الشراكات والتعاون\n` +
                    `**❓ الدعم العام** — الأسئلة والاستفسارات العامة`
                )
            );

            // Separator
            components.push(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorStyle.Gap));

            // Footer text
            components.push(
                new TextDisplayBuilder().setContent(
                    `> Sentoria Tickets • Premium Support System`
                )
            );

            // Buttons row 1
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_technical')
                    .setLabel('الدعم الفني')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔧'),
                new ButtonBuilder()
                    .setCustomId('ticket_create_player-report')
                    .setLabel('تقديم بلاغ')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👮'),
                new ButtonBuilder()
                    .setCustomId('ticket_create_management')
                    .setLabel('تقديم للإدارة')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📋'),
            );

            // Buttons row 2
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_partnership')
                    .setLabel('الشراكات')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🤝'),
                new ButtonBuilder()
                    .setCustomId('ticket_create_general')
                    .setLabel('الدعم العام')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓'),
            );

            // Container
            const container = new ContainerBuilder()
                .setAccentColor(config.colors.primary)
                .addComponents(...components);

            const payload = {
                components: [container, row1, row2],
            };

            if (hasBanner) {
                payload.files = [{
                    attachment: bannerPath,
                    name: 'tickets-banner.png',
                }];
            }

            const sentMessage = await channel.send(payload);

            settings.ticketPanelMessageId = sentMessage.id;
            await settings.save();

            await interaction.editReply({
                content: '✅ تم إعداد لوحة التذاكر بنجاح!',
            });

        } catch (error) {
            console.error('Setup command error:', error);

            await interaction.editReply({
                content: `❌ حدث خطأ: ${error.message}`,
            });
        }
    },
};
