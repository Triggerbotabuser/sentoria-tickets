require('dotenv').config();

module.exports = {
  // Bot Settings
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongoUri: process.env.MONGO_URI,

  // Bot Info
  botName: 'Sentoria Tickets',
  botVersion: '1.0.0',
  botTagline: 'Premium Support System',

  // Colors (Blue & Dark Theme)
  colors: {
    primary: 0x0066FF,        // Blue
    secondary: 0x0044CC,      // Dark Blue
    accent: 0x00A3FF,         // Light Blue
    success: 0x00D26A,        // Green
    warning: 0xFFAA00,        // Orange
    danger: 0xFF4444,         // Red
    dark: 0x1A1A2E,           // Dark Background
    darker: 0x0F0F1A,         // Darker Background
    embed: 0x16213E,          // Embed Background
    blurple: 0x5865F2,        // Discord Blurple
    white: 0xFFFFFF,
    black: 0x000000,
  },

  // Embed Settings
  embed: {
    title: '🎫 إنشاء تذكرة',
    description: 'مرحباً بك في الدعم الفني الخاص بـ **Sentoria**.\nيرجى اختيار القسم المناسب من الأسفل للحصول على أفضل خدمة ممكنة.',
    footer: 'Sentoria Tickets • Premium Support System',
    bannerImage: 'attachment://tickets-banner.png',
    thumbnail: 'attachment://sentoria-logo.png',
  },

  // Ticket Categories
  categories: {
    technical: {
      id: 'technical',
      name: '🔧 الدعم الفني',
      emoji: '🔧',
      description: 'للمساعدة في المشاكل التقنية',
      color: 0x0066FF,
      prefix: 'ticket',
    },
    management: {
      id: 'management',
      name: '📋 تقديم للإدارة',
      emoji: '📋',
      description: 'التواصل مع الإدارة',
      color: 0x5865F2,
      prefix: 'ticket',
    },
    playerReport: {
      id: 'player-report',
      name: '👮 تقديم بلاغ',
      emoji: '👮',
      description: 'تقديم بلاغ ضد لاعب',
      color: 0xFFAA00,
      prefix: 'ticket',
    },
    general: {
      id: 'general',
      name: '❓ الدعم العام',
      emoji: '❓',
      description: 'للأسئلة والاستفسارات العامة',
      color: 0x00D26A,
      prefix: 'ticket',
    },
    partnership: {
      id: 'partnership',
      name: '🤝 الشراكات',
      emoji: '🤝',
      description: 'طلبات الشراكات والتعاون',
      color: 0x9B59B6,
      prefix: 'ticket',
    },
  },

  // Ticket Settings
  tickets: {
    maxOpenTickets: 3,           // Max open tickets per user
    cooldownTime: 60000,         // 1 minute cooldown between tickets
    autoCloseTime: 3600000,      // Auto close after 1 hour of inactivity
    ticketPrefix: '#',
    maxTicketNumber: 9999,
  },

  // Anti-Spam Settings
  antiSpam: {
    enabled: true,
    maxTicketsPerHour: 5,
    punishmentTime: 300000,      // 5 minute punishment
  },

  // Channel IDs (Configure these after setup)
  channels: {
    ticketLogs: null,            // Channel for ticket logs
    transcriptLogs: null,        // Channel for transcripts
    category: null,              // Category ID for ticket channels
  },

  // Role IDs (Configure these)
  roles: {
    staff: null,                 // Staff role ID
    admin: null,                 // Admin role ID
  },

  // Footer Icon
  footerIcon: 'https://i.imgur.com/your-logo-url.png',

  // Timestamp
  timestamp: true,
};
