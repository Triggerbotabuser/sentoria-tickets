const {
    PermissionFlagsBits, ChannelType, MessageFlags,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const Ticket = require('../models/Ticket');
const Settings = require('../models/Settings');
const config = require('../config');

class TicketManager {

    static buildContainer(color, components) {
        const container = new ContainerBuilder();
        if (color) container.setAccentColor(color);
        for (const comp of components) {
            if (comp instanceof TextDisplayBuilder) {
                container.addTextDisplayComponents(comp);
            } else if (comp instanceof SeparatorBuilder) {
                container.addSeparatorComponents(comp);
            } else if (comp instanceof MediaGalleryBuilder) {
                container.addMediaGalleryComponents(comp);
            } else if (comp instanceof SectionBuilder) {
                container.addSectionComponents(comp);
            } else if (comp instanceof ActionRowBuilder) {
                container.addActionRowComponents(comp);
            }
        }
        return container;
    }

    static text(content) {
        return new TextDisplayBuilder().setContent(content);
    }

    static separator(gap = true) {
        return new SeparatorBuilder().setDivider(true).setSpacing(gap ? 1 : 0);
    }

    static async getSettings(guildId) {
        let settings = await Settings.findOne({ guildId });
        if (!settings) settings = await Settings.create({ guildId });
        return settings;
    }

    static async incrementCounter(guildId) {
        const settings = await this.getSettings(guildId);
        settings.ticketCounter += 1;
        await settings.save();
        return settings.ticketCounter;
    }

    static formatTicketNumber(number) {
        return `#${String(number).padStart(4, '0')}`;
    }

    static async canCreateTicket(guildId, userId) {
        const settings = await this.getSettings(guildId);

        const recentTicket = await Ticket.findOne({
            guildId,
            creatorId: userId,
            createdAt: { $gte: new Date(Date.now() - config.tickets.cooldownTime) },
        });
        if (recentTicket) {
            return { allowed: false, reason: 'يرجى الانتظار قليلاً قبل إنشاء تذكرة أخرى.' };
        }

        const openTickets = await Ticket.countDocuments({ guildId, creatorId: userId, status: 'open' });
        if (openTickets >= settings.maxOpenTickets) {
            return { allowed: false, reason: `لديك بالفعل ${openTickets} تذاكر مفتوحة. الحد الأقصى هو ${settings.maxOpenTickets}.` };
        }

        return { allowed: true };
    }

    static async createTicket(guild, member, category, settings) {
        try {
            const ticketNumber = await this.incrementCounter(guild.id);
            const formattedNumber = this.formatTicketNumber(ticketNumber);
            const categoryConfig = config.categories[category];
            if (!categoryConfig) return { success: false, error: 'فئة التذكرة غير صالحة.' };

            const channelName = `ticket-${String(ticketNumber).padStart(4, '0')}`;
            const ticketCategory = guild.channels.cache.get(settings.ticketCategoryId);

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: ticketCategory || null,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks,
                        ],
                    },
                    {
                        id: guild.members.me.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages,
                        ],
                    },
                ],
            });

            if (settings.staffRoleId) {
                await ticketChannel.permissionOverwrites.edit(settings.staffRoleId, {
                    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
                });
            }

            const ticket = await Ticket.create({
                ticketId: ticketNumber,
                guildId: guild.id,
                channelId: ticketChannel.id,
                category,
                creatorId: member.id,
                creatorTag: member.user.tag,
                status: 'open',
            });

            const guildIcon = guild.iconURL({ dynamic: true, size: 256 });
            const components = [];

            const titleSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${categoryConfig.emoji} ${categoryConfig.name} — ${formattedNumber}`));
            if (guildIcon) titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(guildIcon));
            components.push(titleSection);
            components.push(this.separator());

            components.push(this.text(
                `**مرحباً ${member},**\n\n` +
                `تم إنشاء تذكرتك بنجاح في قسم **${categoryConfig.name}**.\n\n` +
                `**رقم التذكرة:** ${formattedNumber}\n` +
                `**النوع:** ${categoryConfig.name}\n` +
                `**الحالة:** 🟢 مفتوحة\n\n` +
                `يرجى شرح مشكلتك بالتفصيل وسيقوم فريق الدعم بمساعدتك في أقرب وقت ممكن.\n\n` +
                `> ⚠️ يرجى عدم إرسال رسائل غير ضرورية لتسريع عملية المساعدة.`
            ));
            components.push(this.separator());

            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ticket_close_${ticketChannel.id}`).setLabel('🔒 إغلاق').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`ticket_claim_${ticketChannel.id}`).setLabel('✋ استلام').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`ticket_transcript_${ticketChannel.id}`).setLabel('📄 نسخة').setStyle(ButtonStyle.Secondary),
            ));

            await ticketChannel.send({
                components: [this.buildContainer(categoryConfig.color, components)],
                flags: MessageFlags.IsComponentsV2,
            });

            await this.sendLog(guild, 'create', { ticket, member, category: categoryConfig, channel: ticketChannel });

            return { success: true, channel: ticketChannel, ticket, ticketNumber: formattedNumber };
        } catch (error) {
            console.error('Error creating ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء إنشاء التذكرة.' };
        }
    }

    static async closeTicket(guild, channelId, closedBy, reason = 'لا يوجد سبب') {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) return { success: false, error: 'التذكرة غير موجودة أو مغلقة بالفعل.' };

            const channel = guild.channels.cache.get(channelId);
            const closedByMember = guild.members.cache.get(closedBy);

            ticket.status = 'closed';
            ticket.closedAt = new Date();
            ticket.closedBy = closedBy;
            ticket.closedByTag = closedByMember?.user?.tag || 'Unknown';
            await ticket.save();

            if (channel) {
                const components = [
                    this.text('## 🔒 تم إغلاق التذكرة'),
                    this.separator(),
                    this.text(
                        `**تم الإغلاق بواسطة:** ${closedByMember || 'System'}\n` +
                        `**سبب الإغلاق:** ${reason}\n` +
                        `**وقت الإغلاق:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                        `> سيتم حذف هذا القناة خلال 10 ثوانٍ.`
                    ),
                ];

                await channel.send({
                    components: [this.buildContainer(config.colors.danger, components)],
                    flags: MessageFlags.IsComponentsV2,
                });

                const transcript = await this.generateTranscript(channel, ticket);

                const settings = await this.getSettings(guild.id);
                if (settings.transcriptLogsChannelId) {
                    const logsChannel = guild.channels.cache.get(settings.transcriptLogsChannelId);
                    if (logsChannel && transcript) {
                        const logComponents = [
                            this.text(`## 📄 نسخة التذكرة — ${this.formatTicketNumber(ticket.ticketId)}`),
                            this.separator(),
                            this.text(
                                `**التذكرة:** ${this.formatTicketNumber(ticket.ticketId)}\n` +
                                `**المنشئ:** ${ticket.creatorTag}\n` +
                                `**الفئة:** ${config.categories[ticket.category]?.name || ticket.category}\n` +
                                `**الحالة:** مغلقة\n` +
                                `**أغلقها:** ${closedByMember?.user?.tag || 'System'}\n` +
                                `**الرسائل:** ${ticket.messageCount}`
                            ),
                        ];

                        await logsChannel.send({
                            components: [this.buildContainer(config.colors.primary, logComponents)],
                            flags: MessageFlags.IsComponentsV2,
                            files: [{
                                attachment: Buffer.from(transcript, 'utf-8'),
                                name: `transcript-${ticket.ticketId}.html`,
                            }],
                        });
                    }
                }

                await this.sendLog(guild, 'close', { ticket, member: closedByMember, reason });

                setTimeout(async () => {
                    try { await channel.delete(); } catch (e) { console.error('Error deleting channel:', e); }
                }, 10000);
            }

            return { success: true, ticket };
        } catch (error) {
            console.error('Error closing ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء إغلاق التذكرة.' };
        }
    }

    static async claimTicket(guild, channelId, claimedBy) {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) return { success: false, error: 'التذكرة غير موجودة أو مغلقة.' };
            if (ticket.claimedBy) return { success: false, error: `التذكرة مستلمة بالفعل بواسطة ${ticket.claimedByTag}.` };

            const member = guild.members.cache.get(claimedBy);
            ticket.claimedBy = claimedBy;
            ticket.claimedByTag = member?.user?.tag || 'Unknown';
            ticket.claimedAt = new Date();
            await ticket.save();

            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                const components = [
                    this.text('## ✋ تم استلام التذكرة'),
                    this.separator(),
                    this.text(
                        `**تم الاستلام بواسطة:** ${member}\n` +
                        `**وقت الاستلام:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                        `> الآن ${member} مسؤول عن هذه التذكرة.`
                    ),
                ];

                await channel.send({
                    components: [this.buildContainer(config.colors.success, components)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            await this.sendLog(guild, 'claim', { ticket, member });
            return { success: true, ticket };
        } catch (error) {
            console.error('Error claiming ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء استلام التذكرة.' };
        }
    }

    static async addMember(guild, channelId, targetMember, addedBy) {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) return { success: false, error: 'التذكرة غير موجودة أو مغلقة.' };

            const channel = guild.channels.cache.get(channelId);
            if (!channel) return { success: false, error: 'قناة التذكرة غير موجودة.' };

            await channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
            });

            const alreadyAdded = ticket.participants.some(p => p.userId === targetMember.id);
            if (!alreadyAdded) {
                ticket.participants.push({ userId: targetMember.id, userTag: targetMember.user.tag });
                await ticket.save();
            }

            const components = [
                this.text('## ✅ تم إضافة عضو'),
                this.separator(),
                this.text(`**تم إضافة:** ${targetMember}\n**بواسطة:** ${addedBy}`),
            ];

            await channel.send({
                components: [this.buildContainer(config.colors.success, components)],
                flags: MessageFlags.IsComponentsV2,
            });

            return { success: true };
        } catch (error) {
            console.error('Error adding member:', error);
            return { success: false, error: 'حدث خطأ أثناء إضافة العضو.' };
        }
    }

    static async removeMember(guild, channelId, targetMember, removedBy) {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) return { success: false, error: 'التذكرة غير موجودة أو مغلقة.' };

            const channel = guild.channels.cache.get(channelId);
            if (!channel) return { success: false, error: 'قناة التذكرة غير موجودة.' };

            await channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: false, SendMessages: false, ReadMessageHistory: false,
            });

            ticket.participants = ticket.participants.filter(p => p.userId !== targetMember.id);
            await ticket.save();

            const components = [
                this.text('## ❌ تم إزالة عضو'),
                this.separator(),
                this.text(`**تم إزالة:** ${targetMember.user.tag}\n**بواسطة:** ${removedBy}`),
            ];

            await channel.send({
                components: [this.buildContainer(config.colors.danger, components)],
                flags: MessageFlags.IsComponentsV2,
            });

            return { success: true };
        } catch (error) {
            console.error('Error removing member:', error);
            return { success: false, error: 'حدث خطأ أثناء إزالة العضو.' };
        }
    }

    static async renameTicket(guild, channelId, newName, renamedBy) {
        try {
            const channel = guild.channels.cache.get(channelId);
            if (!channel) return { success: false, error: 'قناة التذكرة غير موجودة.' };

            const oldName = channel.name;
            await channel.setName(newName);

            const components = [
                this.text('## 📝 تم تغيير اسم التذكرة'),
                this.separator(),
                this.text(
                    `**الاسم القديم:** ${oldName}\n` +
                    `**الاسم الجديد:** ${newName}\n` +
                    `**بواسطة:** ${renamedBy}`
                ),
            ];

            await channel.send({
                components: [this.buildContainer(config.colors.primary, components)],
                flags: MessageFlags.IsComponentsV2,
            });

            return { success: true };
        } catch (error) {
            console.error('Error renaming ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء تغيير اسم التذكرة.' };
        }
    }

    static async generateTranscript(channel, ticket) {
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            let html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - ${this.formatTicketNumber(ticket.ticketId)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0000 0%, #1a0000 50%, #0a0000 100%);
            color: #ffffff; min-height: 100vh; padding: 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%);
            border-radius: 15px; padding: 30px; margin-bottom: 20px;
            text-align: center; box-shadow: 0 10px 40px rgba(255, 0, 0, 0.3);
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .ticket-info { display: flex; justify-content: center; gap: 30px; margin-top: 15px; font-size: 14px; opacity: 0.9; }
        .message {
            background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 15px;
            margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.3s ease;
        }
        .message:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 0, 0, 0.3); }
        .message-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .author { color: #FF4444; font-weight: bold; font-size: 14px; }
        .timestamp { color: #888; font-size: 12px; }
        .content { color: #ddd; line-height: 1.6; word-wrap: break-word; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 ${this.formatTicketNumber(ticket.ticketId)} — Sentoria Tickets</h1>
            <div class="ticket-info">
                <span>📋 ${config.categories[ticket.category]?.name || ticket.category}</span>
                <span>👤 ${ticket.creatorTag}</span>
                <span>📅 ${new Date(ticket.createdAt).toLocaleDateString('ar-SA')}</span>
            </div>
        </div>
        <div class="messages">`;

            for (const [, message] of sortedMessages) {
                html += `
            <div class="message">
                <div class="message-header">
                    <span class="author">${message.author.tag}</span>
                    <span class="timestamp">${new Date(message.createdTimestamp).toLocaleString('ar-SA')}</span>
                </div>
                <div class="content">${this.escapeHtml(message.content || '')}</div>
            </div>`;
            }

            html += `
        </div>
        <div class="footer">
            <p>Sentoria Tickets v2.0 — Premium Support System</p>
            <p>Generated on ${new Date().toLocaleString('ar-SA')}</p>
        </div>
    </div>
</body>
</html>`;

            return html;
        } catch (error) {
            console.error('Error generating transcript:', error);
            return null;
        }
    }

    static escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    static async sendLog(guild, action, data) {
        try {
            const settings = await this.getSettings(guild.id);
            if (!settings.ticketLogsChannelId) return;

            const logsChannel = guild.channels.cache.get(settings.ticketLogsChannelId);
            if (!logsChannel) return;

            const { ticket, member, category } = data;
            const formattedNumber = this.formatTicketNumber(ticket.ticketId);

            let components = [];
            let color = config.colors.primary;

            switch (action) {
                case 'create':
                    color = config.colors.success;
                    components = [
                        this.text(`## 📩 تذكرة جديدة — ${formattedNumber}`),
                        this.separator(),
                        this.text(
                            `**المنشئ:** ${member.user.tag} (${member.id})\n` +
                            `**الفئة:** ${category?.name || ticket.category}\n` +
                            `**القناة:** <#${ticket.channelId}>`
                        ),
                    ];
                    break;

                case 'close':
                    color = config.colors.danger;
                    components = [
                        this.text(`## 🔒 تم إغلاق تذكرة — ${formattedNumber}`),
                        this.separator(),
                        this.text(
                            `**المغلق:** ${member?.user?.tag || 'System'}\n` +
                            `**السبب:** ${data.reason || 'لا يوجد سبب'}\n` +
                            `**المنشئ:** ${ticket.creatorTag}`
                        ),
                    ];
                    break;

                case 'claim':
                    components = [
                        this.text(`## ✋ تم استلام تذكرة — ${formattedNumber}`),
                        this.separator(),
                        this.text(
                            `**المستلم:** ${member?.user?.tag || 'Unknown'}\n` +
                            `**المنشئ:** ${ticket.creatorTag}`
                        ),
                    ];
                    break;

                default:
                    return;
            }

            await logsChannel.send({
                components: [this.buildContainer(color, components)],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            console.error('Error sending log:', error);
        }
    }

    static async getStats(guildId) {
        const total = await Ticket.countDocuments({ guildId });
        const open = await Ticket.countDocuments({ guildId, status: 'open' });
        const closed = await Ticket.countDocuments({ guildId, status: 'closed' });

        const categoryStats = {};
        for (const cat of Object.keys(config.categories)) {
            categoryStats[cat] = await Ticket.countDocuments({ guildId, category: cat });
        }

        return { total, open, closed, categories: categoryStats };
    }
}

module.exports = TicketManager;
