const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const Ticket = require('../models/Ticket');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        console.log(`[INTERACTION] Received: ${interaction.type} - ${interaction.commandName || interaction.customId}`);

        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);

                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('❌ خطأ')
                    .setDescription('حدث خطأ أثناء تنفيذ الأمر.')
                    .setTimestamp();

                const reply = { embeds: [errorEmbed], ephemeral: true };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        // Handle Button Interactions
        if (interaction.isButton()) {
            const { customId, guild, member, channel } = interaction;

            // Ticket Create Buttons
            if (customId.startsWith('ticket_create_')) {
                await handleTicketCreate(interaction, customId);
            }

            // Ticket Close Button
            if (customId.startsWith('ticket_close_')) {
                await handleTicketClose(interaction);
            }

            // Ticket Claim Button
            if (customId.startsWith('ticket_claim_')) {
                await handleTicketClaim(interaction);
            }

            // Ticket Transcript Button
            if (customId.startsWith('ticket_transcript_')) {
                await handleTicketTranscript(interaction);
            }
        }
    },
};

// Handle Ticket Create
async function handleTicketCreate(interaction, customId) {
    const { guild, member } = interaction;

    // Extract category from customId
    const category = customId.replace('ticket_create_', '');

    // Get settings
    const settings = await TicketManager.getSettings(guild.id);

    // Check if user can create ticket
    const canCreate = await TicketManager.canCreateTicket(guild.id, member.id);
    if (!canCreate.allowed) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ لا يمكن إنشاء تذكرة')
            .setDescription(canCreate.reason)
            .setTimestamp();

        return interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }

    // Defer reply
    await interaction.deferReply({ ephemeral: true });

    // Create ticket
    const result = await TicketManager.createTicket(guild, member, category, settings);

    if (!result.success) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription(result.error)
            .setTimestamp();

        return interaction.editReply({
            embeds: [errorEmbed],
        });
    }

    // Set cooldown
    const cooldownKey = `${guild.id}-${member.id}`;
    interaction.client.cooldowns.set(cooldownKey, Date.now() + config.tickets.cooldownTime);

    // Success response
    const successEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ تم إنشاء التذكرة')
        .setDescription(
            `**رقم التذكرة:** ${result.ticketNumber}\n` +
            `**القناة:** <#${result.channel.id}>\n\n` +
            `> تم إنشاء تذكرتك بنجاح. يرجى الانتظار حتى يتم الرد عليك.`
        )
        .setFooter({
            text: config.botName,
            iconURL: guild.iconURL({ dynamic: true }),
        })
        .setTimestamp();

    await interaction.editReply({
        embeds: [successEmbed],
    });
}

// Handle Ticket Close
async function handleTicketClose(interaction) {
    const { guild, member, channel } = interaction;

    // Check if this is a ticket channel
    const ticket = await Ticket.findOne({
        channelId: channel.id,
        guildId: guild.id,
        status: 'open',
    });

    if (!ticket) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription('هذه ليست تذكرة مفتوحة.')
            .setTimestamp();

        return interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }

    // Check permissions
    const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) ||
        (config.roles.staff && member.roles.cache.has(config.roles.staff)) ||
        ticket.creatorId === member.id;

    if (!isStaff) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription('ليس لديك صلاحية لإغلاق هذه التذكرة.')
            .setTimestamp();

        return interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }

    // Defer reply
    await interaction.deferReply();

    // Close ticket
    const result = await TicketManager.closeTicket(guild, channel.id, member.id);

    if (!result.success) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription(result.error)
            .setTimestamp();

        return interaction.editReply({
            embeds: [errorEmbed],
        });
    }

    const successEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ تم إغلاق التذكرة')
        .setDescription('تم إغلاق التذكرة بنجاح. سيتم حذف القناة خلال 10 ثوانٍ.')
        .setTimestamp();

    await interaction.editReply({
        embeds: [successEmbed],
    });
}

// Handle Ticket Claim
async function handleTicketClaim(interaction) {
    const { guild, member, channel } = interaction;

    // Check if this is a ticket channel
    const ticket = await Ticket.findOne({
        channelId: channel.id,
        guildId: guild.id,
        status: 'open',
    });

    if (!ticket) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription('هذه ليست تذكرة مفتوحة.')
            .setTimestamp();

        return interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }

    // Check permissions
    const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) ||
        (config.roles.staff && member.roles.cache.has(config.roles.staff));

    if (!isStaff) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription('ليس لديك صلاحية لاستلام هذه التذكرة.')
            .setTimestamp();

        return interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }

    // Defer reply
    await interaction.deferReply();

    // Claim ticket
    const result = await TicketManager.claimTicket(guild, channel.id, member.id);

    if (!result.success) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription(result.error)
            .setTimestamp();

        return interaction.editReply({
            embeds: [errorEmbed],
        });
    }

    const successEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ تم استلام التذكرة')
        .setDescription(`تم استلام التذكرة بواسطة ${member}.`)
        .setTimestamp();

    await interaction.editReply({
        embeds: [successEmbed],
    });
}

// Handle Ticket Transcript
async function handleTicketTranscript(interaction) {
    const { guild, member, channel } = interaction;

    // Check if this is a ticket channel
    const ticket = await Ticket.findOne({
        channelId: channel.id,
        guildId: guild.id,
    });

    if (!ticket) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription('هذه ليست تذكرة.')
            .setTimestamp();

        return interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }

    // Defer reply
    await interaction.deferReply({ ephemeral: true });

    // Generate transcript
    const transcript = await TicketManager.generateTranscript(channel, ticket);

    if (!transcript) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ خطأ')
            .setDescription('حدث خطأ أثناء إنشاء النسخة.')
            .setTimestamp();

        return interaction.editReply({
            embeds: [errorEmbed],
        });
    }

    // Update ticket
    ticket.transcript = transcript;
    await ticket.save();

    const successEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ تم إنشاء النسخة')
        .setDescription('تم إنشاء نسخة من التذكرة بنجاح.')
        .setTimestamp();

    await interaction.editReply({
        embeds: [successEmbed],
        files: [{
            attachment: Buffer.from(transcript, 'utf-8'),
            name: `transcript-${TicketManager.formatTicketNumber(ticket.ticketId)}.html`,
        }],
    });
}
