require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongoUri: process.env.MONGO_URI,

  botName: 'Sentoria Tickets',
  botVersion: '2.0.0',

  colors: {
    primary: 0xFF0000,
    secondary: 0xCC0000,
    accent: 0xFF3333,
    dark: 0x1A0000,
    darker: 0x0D0000,
    success: 0x00D26A,
    warning: 0xFFAA00,
    danger: 0xFF4444,
    white: 0xFFFFFF,
    neutral: 0x2B2D31,
  },

  categories: {
    technical: {
      id: 'technical',
      name: 'الدعم الفني',
      emoji: '🔧',
      description: 'للمشاكل التقنية والأعطال',
      color: 0xFF0000,
    },
    management: {
      id: 'management',
      name: 'تقديم للإدارة',
      emoji: '📋',
      description: 'التواصل المباشر مع الإدارة',
      color: 0xCC0000,
    },
    playerReport: {
      id: 'player-report',
      name: 'تقديم بلاغ',
      emoji: '👮',
      description: 'للإبلاغ عن لاعب أو مشكلة',
      color: 0xFF4444,
    },
    general: {
      id: 'general',
      name: 'الدعم العام',
      emoji: '❓',
      description: 'الأسئلة والاستفسارات العامة',
      color: 0xFF3333,
    },
    partnership: {
      id: 'partnership',
      name: 'الشراكات',
      emoji: '🤝',
      description: 'طلبات الشراكات والتعاون',
      color: 0xFF6666,
    },
  },

  tickets: {
    maxOpenTickets: 3,
    cooldownTime: 60000,
  },
};
