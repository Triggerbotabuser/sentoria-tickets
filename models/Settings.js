const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Guild ID
    guildId: {
        type: String,
        required: true,
        unique: true,
    },

    // Ticket Panel Channel
    ticketPanelChannelId: {
        type: String,
        default: null,
    },

    // Ticket Panel Message ID
    ticketPanelMessageId: {
        type: String,
        default: null,
    },

    // Ticket Logs Channel
    ticketLogsChannelId: {
        type: String,
        default: null,
    },

    // Transcript Logs Channel
    transcriptLogsChannelId: {
        type: String,
        default: null,
    },

    // Ticket Category (Discord category for ticket channels)
    ticketCategoryId: {
        type: String,
        default: null,
    },

    // Staff Role
    staffRoleId: {
        type: String,
        default: null,
    },

    // Admin Role
    adminRoleId: {
        type: String,
        default: null,
    },

    // Ticket Counter
    ticketCounter: {
        type: Number,
        default: 0,
    },

    // Max open tickets per user
    maxOpenTickets: {
        type: Number,
        default: 3,
    },

    // Cooldown time (ms)
    cooldownTime: {
        type: Number,
        default: 60000,
    },

    // Auto close time (ms)
    autoCloseTime: {
        type: Number,
        default: 3600000,
    },

    // Welcome Message
    welcomeMessage: {
        type: String,
        default: 'مرحباً بك في نظام الدعم الخاص بـ Sentoria.\nيرجى اختيار القسم المناسب للحصول على أفضل خدمة ممكنة.',
    },

    // Goodbye Message
    goodbyeMessage: {
        type: String,
        default: 'شكراً لاستخدامك نظام الدعم الخاص بـ Sentoria.\nنتطلع لخدمتك مرة أخرى!',
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    },

    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update timestamp before save
settingsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Settings', settingsSchema);
