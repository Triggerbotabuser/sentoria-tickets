const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const config = require('../config');
const TicketManager = require('../utils/ticketManager');
const V2 = require('../utils/v2Builder');
const Ticket = require('../models/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('حفظ نسخة من التذكرة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const { guild, channel } = interaction;
            const ticket = await Ticket.findOne({ channelId: channel.id, guildId: guild.id });

            if (!ticket) {
                return interaction.reply({
                    components: [V2.buildContainer(config.colors.danger, [V2.text('## ❌ خطأ\nهذا ليس قناة تذكرة.')])],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const transcript = await TicketManager.generateTranscript(channel, ticket);

            if (!transcript) return V2.errorReply(interaction, 'حدث خطأ أثناء إنشاء النسخة.');

            ticket.transcript = transcript;
            await ticket.save();

            await interaction.editReply({
                components: [V2.buildContainer(config.colors.success, [V2.text('## ✅ تم إنشاء النسخة\nملف النسخة جاهز.')])],
                flags: MessageFlags.IsComponentsV2,
                files: [{
                    attachment: Buffer.from(transcript, 'utf-8'),
                    name: `transcript-${TicketManager.formatTicketNumber(ticket.ticketId)}.html`,
                }],
            });

        } catch (error) {
            console.error('Transcript error:', error);
            V2.errorReply(interaction, 'حدث خطأ أثناء إنشاء النسخة.');
        }
    },
};
