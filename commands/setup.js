const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
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

            // Defer reply
            await interaction.deferReply({ ephemeral: true });

            // Get or create settings
            const settings = await TicketManager.getSettings(guild.id);

            // Update settings with current channel
            settings.ticketPanelChannelId = channel.id;
            await settings.save();

            // Create the main ticket panel embed
            const panelEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setAuthor({
                    name: 'Sentoria Tickets',
                    iconURL: guild.iconURL({ dynamic: true, size: 256 }),
                })
                .setTitle('🎫 إنشاء تذكرة')
                .setDescription(
                    'مرحباً بك في الدعم الفني الخاص بـ **Sentoria**.\n' +
                    'يرجى اختيار القسم المناسب من الأسفل للحصول على أفضل خدمة ممكنة.\n\n' +
                    '─────────────────────────────\n\n' +
                    '**🔧 الدعم الفني**\n' +
                    'للمشاكل التقنية والأعطال\n\n' +
                    '**👮 تقديم بلاغ**\n' +
                    'للإبلاغ عن لاعب أو مشكلة\n\n' +
                    '**📋 تقديم للإدارة**\n' +
                    'التواصل المباشر مع الإدارة\n\n' +
                    '**🤝 الشراكات**\n' +
                    'طلبات الشراكات والتعاون\n\n' +
                    '**❓ الدعم العام**\n' +
                    'الأسئلة والاستفسارات العامة\n\n' +
                    '─────────────────────────────'
                )
                .setFooter({
                    text: `${config.botName} • ${config.botTagline}`,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            // Try to set banner if available
            try {
                const bannerPath = require('path').join(__dirname, '..', 'assets', 'tickets-banner.png');
                if (require('fs').existsSync(bannerPath)) {
                    panelEmbed.setImage('attachment://tickets-banner.png');
                }
            } catch (e) {
                // Continue without banner
            }

            // Create buttons row 1
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

            // Create buttons row 2
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

            // Try to send with banner image
            let sentMessage;
            try {
                const bannerPath = require('path').join(__dirname, '..', 'assets', 'tickets-banner.png');
                if (require('fs').existsSync(bannerPath)) {
                    sentMessage = await channel.send({
                        embeds: [panelEmbed],
                        components: [row1, row2],
                        files: [{
                            attachment: bannerPath,
                            name: 'tickets-banner.png',
                        }],
                    });
                } else {
                    sentMessage = await channel.send({
                        embeds: [panelEmbed],
                        components: [row1, row2],
                    });
                }
            } catch (e) {
                sentMessage = await channel.send({
                    embeds: [panelEmbed],
                    components: [row1, row2],
                });
            }

            // Save message ID
            settings.ticketPanelMessageId = sentMessage.id;
            await settings.save();

            // Reply to user
            const successEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ تم إعداد لوحة التذاكر')
                .setDescription('تم إرسال لوحة التذاكر بنجاح في هذا القناة!')
                .setFooter({
                    text: config.botName,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [successEmbed],
            });

        } catch (error) {
            console.error('Setup command error:', error);
            console.error('Error stack:', error.stack);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ خطأ')
                .setDescription(`حدث خطأ أثناء إعداد لوحة التذاكر.\n\`\`\`${error.message}\`\`\``)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
            });
        }
    },
};
