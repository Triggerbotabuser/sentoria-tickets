const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    // Ticket ID
    ticketId: {
        type: Number,
        required: true,
        unique: true,
    },

    // Guild ID
    guildId: {
        type: String,
        required: true,
        index: true,
    },

    // Channel ID
    channelId: {
        type: String,
        required: true,
        unique: true,
    },

    // Category
    category: {
        type: String,
        required: true,
        enum: ['technical', 'management', 'player-report', 'general', 'partnership'],
    },

    // Creator
    creatorId: {
        type: String,
        required: true,
        index: true,
    },

    creatorTag: {
        type: String,
        required: true,
    },

    // Claimed By
    claimedBy: {
        type: String,
        default: null,
    },

    claimedByTag: {
        type: String,
        default: null,
    },

    claimedAt: {
        type: Date,
        default: null,
    },

    // Status
    status: {
        type: String,
        enum: ['open', 'closed', 'archived'],
        default: 'open',
    },

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },

    // Notes
    notes: [{
        content: String,
        addedBy: String,
        addedByTag: String,
        addedAt: {
            type: Date,
            default: Date.now,
        },
    }],

    // Participants (users added to the ticket)
    participants: [{
        userId: String,
        userTag: String,
        addedAt: {
            type: Date,
            default: Date.now,
        },
    }],

    // Transcript
    transcript: {
        type: String,
        default: null,
    },

    transcriptUrl: {
        type: String,
        default: null,
    },

    // Messages count
    messageCount: {
        type: Number,
        default: 0,
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    },

    closedAt: {
        type: Date,
        default: null,
    },

    closedBy: {
        type: String,
        default: null,
    },

    closedByTag: {
        type: String,
        default: null,
    },

    // Last activity
    lastActivity: {
        type: Date,
        default: Date.now,
    },
});

// Index for efficient queries
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ creatorId: 1, status: 1 });
ticketSchema.index({ channelId: 1 });
ticketSchema.index({ ticketId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
