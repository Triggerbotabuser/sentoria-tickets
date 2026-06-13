const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const Ticket = require('../models/Ticket');
const Settings = require('../models/Settings');
const config = require('../config');

class TicketManager {
    /**
     * Get or create settings for a guild
     */
    static async getSettings(guildId) {
        let settings = await Settings.findOne({ guildId });
        if (!settings) {
            settings = await Settings.create({ guildId });
        }
        return settings;
    }

    /**
     * Increment ticket counter
     */
    static async incrementCounter(guildId) {
        const settings = await this.getSettings(guildId);
        settings.ticketCounter += 1;
        await settings.save();
        return settings.ticketCounter;
    }

    /**
     * Get current ticket number formatted
     */
    static formatTicketNumber(number) {
        return `#${String(number).padStart(4, '0')}`;
    }

    /**
     * Check if user can create a ticket
     */
    static async canCreateTicket(guildId, userId) {
        const settings = await this.getSettings(guildId);

        // Check cooldown
        const cooldownKey = `${guildId}-${userId}`;
        // Cooldown check (simplified - DB based)
        const recentTicket = await Ticket.findOne({
            guildId,
            creatorId: userId,
            createdAt: { $gte: new Date(Date.now() - config.tickets.cooldownTime) },
        });
        if (recentTicket) {
            return {
                allowed: false,
                reason: `يرجى الانتظار قليلاً قبل إنشاء تذكرة أخرى.`,
            };
        }

        // Check max open tickets
        const openTickets = await Ticket.countDocuments({
            guildId,
            creatorId: userId,
            status: 'open',
        });

        if (openTickets >= settings.maxOpenTickets) {
            return {
                allowed: false,
                reason: `لديك بالفعل ${openTickets} تذاكر مفتوحة. الحد الأقصى هو ${settings.maxOpenTickets}.`,
            };
        }

        return { allowed: true };
    }

    /**
     * Create a new ticket
     */
    static async createTicket(guild, member, category, settings) {
        try {
            // Get ticket number
            const ticketNumber = await this.incrementCounter(guild.id);
            const formattedNumber = this.formatTicketNumber(ticketNumber);

            // Get category config
            const categoryConfig = config.categories[category];
            if (!categoryConfig) {
                return { success: false, error: 'فئة التذكرة غير صالحة.' };
            }

            // Create ticket channel
            const channelName = `ticket-${String(ticketNumber).padStart(4, '0')}`;

            // Get the category channel
            const ticketCategory = guild.channels.cache.get(settings.ticketCategoryId);

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: ticketCategory || null,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
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

            // Add staff role permissions if exists
            if (settings.staffRoleId) {
                await ticketChannel.permissionOverwrites.edit(settings.staffRoleId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                });
            }

            // Create ticket in database
            const ticket = await Ticket.create({
                ticketId: ticketNumber,
                guildId: guild.id,
                channelId: ticketChannel.id,
                category: category,
                creatorId: member.id,
                creatorTag: member.user.tag,
                status: 'open',
            });

            // Create ticket embed
            const ticketEmbed = new EmbedBuilder()
                .setColor(categoryConfig.color)
                .setAuthor({
                    name: `${categoryConfig.name} - ${formattedNumber}`,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setDescription(
                    `**مرحباً ${member},**\n\n` +
                    `تم إنشاء تذكرتك بنجاح في قسم **${categoryConfig.name}**.\n\n` +
                    `**رقم التذكرة:** ${formattedNumber}\n` +
                    `**النوع:** ${categoryConfig.name}\n` +
                    `**الحالة:** 🟢 مفتوحة\n\n` +
                    `يرجى شرح مشكلتك بالتفصيل وسيقوم فريق الدعم بمساعدتك في أقرب وقت ممكن.\n\n` +
                    `> ⚠️ يرجى عدم إرسال رسائل غير ضرورية لتسريع عملية المساعدة.`
                )
                .setFooter({
                    text: `${config.botName} • ${formattedNumber}`,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            // Action buttons
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_close_${ticketChannel.id}`)
                    .setLabel('إغلاق التذكرة')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId(`ticket_claim_${ticketChannel.id}`)
                    .setLabel('استلام التذكرة')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✋'),
                new ButtonBuilder()
                    .setCustomId(`ticket_transcript_${ticketChannel.id}`)
                    .setLabel('حفظ النسخة')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📄'),
            );

            await ticketChannel.send({
                embeds: [ticketEmbed],
                components: [buttons],
            });

            // Send log
            await this.sendLog(guild, 'create', {
                ticket,
                member,
                category: categoryConfig,
                channel: ticketChannel,
            });

            return {
                success: true,
                channel: ticketChannel,
                ticket,
                ticketNumber: formattedNumber,
            };
        } catch (error) {
            console.error('Error creating ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء إنشاء التذكرة.' };
        }
    }

    /**
     * Close a ticket
     */
    static async closeTicket(guild, channelId, closedBy, reason = 'لا يوجد سبب') {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) {
                return { success: false, error: 'التذكرة غير موجودة أو مغلقة بالفعل.' };
            }

            const channel = guild.channels.cache.get(channelId);
            const closedByMember = guild.members.cache.get(closedBy);

            // Update ticket status
            ticket.status = 'closed';
            ticket.closedAt = new Date();
            ticket.closedBy = closedBy;
            ticket.closedByTag = closedByMember?.user?.tag || 'Unknown';
            await ticket.save();

            // Create close embed
            const closeEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('🔒 تم إغلاق التذكرة')
                .setDescription(
                    `**تم إغلاق التذكرة بواسطة:** ${closedByMember || 'System'}\n` +
                    `**سبب الإغلاق:** ${reason}\n` +
                    `**وقت الإغلاق:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                    `> سيتم حذف هذا الق/channel خلال 10 ثوانٍ.`
                )
                .setFooter({
                    text: `${config.botName} • Transcript will be saved`,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            if (channel) {
                await channel.send({ embeds: [closeEmbed] });

                // Generate transcript before closing
                const transcript = await this.generateTranscript(channel, ticket);

                // Send transcript to logs channel
                const settings = await this.getSettings(guild.id);
                if (settings.transcriptLogsChannelId) {
                    const logsChannel = guild.channels.cache.get(settings.transcriptLogsChannelId);
                    if (logsChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(config.colors.primary)
                            .setTitle(`📄 نسخة التذكرة - ${this.formatTicketNumber(ticket.ticketId)}`)
                            .setDescription(
                                `**التذكرة:** ${this.formatTicketNumber(ticket.ticketId)}\n` +
                                `**المنشئ:** ${ticket.creatorTag}\n` +
                                `**الفئة:** ${config.categories[ticket.category]?.name || ticket.category}\n` +
                                `**الحالة:** مغلقة\n` +
                                `**أغلقها:** ${closedByMember?.user?.tag || 'System'}\n` +
                                `**الرسائل:** ${ticket.messageCount}`
                            )
                            .setFooter({
                                text: config.botName,
                                iconURL: guild.iconURL({ dynamic: true }),
                            })
                            .setTimestamp();

                        if (transcript) {
                            await logsChannel.send({
                                embeds: [logEmbed],
                                files: [{
                                    attachment: Buffer.from(transcript, 'utf-8'),
                                    name: `transcript-${ticket.ticketId}.html`,
                                }],
                            });
                        }
                    }
                }

                // Send log
                await this.sendLog(guild, 'close', {
                    ticket,
                    member: closedByMember,
                    reason,
                });

                // Delete channel after delay
                setTimeout(async () => {
                    try {
                        await channel.delete();
                    } catch (e) {
                        console.error('Error deleting channel:', e);
                    }
                }, 10000);
            }

            return { success: true, ticket };
        } catch (error) {
            console.error('Error closing ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء إغلاق التذكرة.' };
        }
    }

    /**
     * Claim a ticket
     */
    static async claimTicket(guild, channelId, claimedBy) {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) {
                return { success: false, error: 'التذكرة غير موجودة أو مغلقة.' };
            }

            if (ticket.claimedBy) {
                return { success: false, error: `التذكرة مستلمة بالفعل بواسطة ${ticket.claimedByTag}.` };
            }

            const member = guild.members.cache.get(claimedBy);

            // Update ticket
            ticket.claimedBy = claimedBy;
            ticket.claimedByTag = member?.user?.tag || 'Unknown';
            ticket.claimedAt = new Date();
            await ticket.save();

            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                const claimEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✋ تم استلام التذكرة')
                    .setDescription(
                        `**تم استلام التذكرة بواسطة:** ${member}\n` +
                        `**وقت الاستلام:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                        `> الآن ${member} مسؤول عن هذه التذكرة.`
                    )
                    .setFooter({
                        text: config.botName,
                        iconURL: guild.iconURL({ dynamic: true }),
                    })
                    .setTimestamp();

                await channel.send({ embeds: [claimEmbed] });
            }

            // Send log
            await this.sendLog(guild, 'claim', {
                ticket,
                member,
            });

            return { success: true, ticket };
        } catch (error) {
            console.error('Error claiming ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء استلام التذكرة.' };
        }
    }

    /**
     * Add member to ticket
     */
    static async addMember(guild, channelId, targetMember, addedBy) {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) {
                return { success: false, error: 'التذكرة غير موجودة أو مغلقة.' };
            }

            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                return { success: false, error: 'قناة التذكرة غير موجودة.' };
            }

            // Add permissions
            await channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            });

            // Add to participants
            const alreadyAdded = ticket.participants.some(p => p.userId === targetMember.id);
            if (!alreadyAdded) {
                ticket.participants.push({
                    userId: targetMember.id,
                    userTag: targetMember.user.tag,
                });
                await ticket.save();
            }

            const addEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ تم إضافة عضو')
                .setDescription(
                    `**تم إضافة:** ${targetMember}\n` +
                    `** بواسطة:** ${addedBy}`
                )
                .setFooter({
                    text: config.botName,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            await channel.send({ embeds: [addEmbed] });

            return { success: true };
        } catch (error) {
            console.error('Error adding member:', error);
            return { success: false, error: 'حدث خطأ أثناء إضافة العضو.' };
        }
    }

    /**
     * Remove member from ticket
     */
    static async removeMember(guild, channelId, targetMember, removedBy) {
        try {
            const ticket = await Ticket.findOne({ channelId, guildId: guild.id, status: 'open' });
            if (!ticket) {
                return { success: false, error: 'التذكرة غير موجودة أو مغلقة.' };
            }

            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                return { success: false, error: 'قناة التذكرة غير موجودة.' };
            }

            // Remove permissions
            await channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: false,
                SendMessages: false,
                ReadMessageHistory: false,
            });

            // Remove from participants
            ticket.participants = ticket.participants.filter(p => p.userId !== targetMember.id);
            await ticket.save();

            const removeEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ تم إزالة عضو')
                .setDescription(
                    `**تم إزالة:** ${targetMember.user.tag}\n` +
                    `**بواسطة:** ${removedBy}`
                )
                .setFooter({
                    text: config.botName,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            await channel.send({ embeds: [removeEmbed] });

            return { success: true };
        } catch (error) {
            console.error('Error removing member:', error);
            return { success: false, error: 'حدث خطأ أثناء إزالة العضو.' };
        }
    }

    /**
     * Rename ticket channel
     */
    static async renameTicket(guild, channelId, newName, renamedBy) {
        try {
            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                return { success: false, error: 'قناة التذكرة غير موجودة.' };
            }

            const oldName = channel.name;
            await channel.setName(newName);

            const renameEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('📝 تم تغيير اسم التذكرة')
                .setDescription(
                    `**الاسم القديم:** ${oldName}\n` +
                    `**الاسم الجديد:** ${newName}\n` +
                    `**بواسطة:** ${renamedBy}`
                )
                .setFooter({
                    text: config.botName,
                    iconURL: guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            await channel.send({ embeds: [renameEmbed] });

            return { success: true };
        } catch (error) {
            console.error('Error renaming ticket:', error);
            return { success: false, error: 'حدث خطأ أثناء تغيير اسم التذكرة.' };
        }
    }

    /**
     * Generate HTML transcript
     */
    static async generateTranscript(channel, ticket) {
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            const config = require('../config');

            let html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - ${this.formatTicketNumber(ticket.ticketId)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
            color: #ffffff;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #0066FF 0%, #0044CC 100%);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 102, 255, 0.3);
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .header .ticket-info {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 15px;
            font-size: 14px;
            opacity: 0.9;
        }
        .message {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        .message:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(0, 102, 255, 0.3);
        }
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .author {
            color: #00A3FF;
            font-weight: bold;
            font-size: 14px;
        }
        .timestamp {
            color: #888;
            font-size: 12px;
        }
        .content {
            color: #ddd;
            line-height: 1.6;
            word-wrap: break-word;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 20px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: bold;
        }
        .badge-open { background: #00D26A; }
        .badge-closed { background: #FF4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 ${this.formatTicketNumber(ticket.ticketId)} - Transit</h1>
            <div class="ticket-info">
                <span>📋 Type: ${config.categories[ticket.category]?.name || ticket.category}</span>
                <span>👤 Creator: ${ticket.creatorTag}</span>
                <span>📅 Date: ${new Date(ticket.createdAt).toLocaleDateString('ar-SA')}</span>
            </div>
        </div>
        <div class="messages">
`;

            for (const [id, message] of sortedMessages) {
                const author = message.author;
                const content = message.content || '';
                const timestamp = new Date(message.createdTimestamp).toLocaleString('ar-SA');

                html += `
            <div class="message">
                <div class="message-header">
                    <span class="author">${author.tag}</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="content">${this.escapeHtml(content)}</div>
            </div>
`;
            }

            html += `
        </div>
        <div class="footer">
            <p>Sentoria Tickets • Premium Support System</p>
            <p>Generated on ${new Date().toLocaleString('ar-SA')}</p>
        </div>
    </div>
</body>
</html>
`;

            return html;
        } catch (error) {
            console.error('Error generating transcript:', error);
            return null;
        }
    }

    /**
     * Escape HTML special characters
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Send ticket log
     */
    static async sendLog(guild, action, data) {
        try {
            const settings = await this.getSettings(guild.id);
            if (!settings.ticketLogsChannelId) return;

            const logsChannel = guild.channels.cache.get(settings.ticketLogsChannelId);
            if (!logsChannel) return;

            const { ticket, member, category, channel, reason } = data;

            let logEmbed;
            const formattedNumber = this.formatTicketNumber(ticket.ticketId);

            switch (action) {
                case 'create':
                    logEmbed = new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('📩 تذكرة جديدة')
                        .setDescription(
                            `**رقم التذكرة:** ${formattedNumber}\n` +
                            `**المنشئ:** ${member.user.tag} (${member.id})\n` +
                            `**الفئة:** ${category?.name || ticket.category}\n` +
                            `**القناة:** <#${ticket.channelId}>`
                        )
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: config.botName })
                        .setTimestamp();
                    break;

                case 'close':
                    logEmbed = new EmbedBuilder()
                        .setColor(config.colors.danger)
                        .setTitle('🔒 تم إغلاق تذكرة')
                        .setDescription(
                            `**رقم التذكرة:** ${formattedNumber}\n` +
                            `**المغلق:** ${member?.user?.tag || 'System'}\n` +
                            `**السبب:** ${reason || 'لا يوجد سبب'}\n` +
                            `**المنشئ:** ${ticket.creatorTag}`
                        )
                        .setFooter({ text: config.botName })
                        .setTimestamp();
                    break;

                case 'claim':
                    logEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle('✋ تم استلام تذكرة')
                        .setDescription(
                            `**رقم التذكرة:** ${formattedNumber}\n` +
                            `**المستلم:** ${member?.user?.tag || 'Unknown'}\n` +
                            `**المنشئ:** ${ticket.creatorTag}`
                        )
                        .setFooter({ text: config.botName })
                        .setTimestamp();
                    break;

                default:
                    return;
            }

            if (logEmbed) {
                await logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Error sending log:', error);
        }
    }

    /**
     * Get ticket statistics
     */
    static async getStats(guildId) {
        const total = await Ticket.countDocuments({ guildId });
        const open = await Ticket.countDocuments({ guildId, status: 'open' });
        const closed = await Ticket.countDocuments({ guildId, status: 'closed' });

        const categoryStats = {};
        for (const cat of Object.keys(config.categories)) {
            categoryStats[cat] = await Ticket.countDocuments({ guildId, category: cat });
        }

        return {
            total,
            open,
            closed,
            categories: categoryStats,
        };
    }
}

module.exports = TicketManager;
