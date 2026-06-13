# 🎫 Sentoria Tickets

Premium Discord Ticket Bot with Modern Design

## 📋 Features

- **Slash Commands** - `/setup`, `/close`, `/add`, `/remove`, `/rename`, `/transcript`, `/claim`
- **Modern Embed UI** - Blue & dark theme with premium design
- **Arabic Language** - Full Arabic support
- **5 Ticket Categories** - Technical, Management, Player Report, General, Partnership
- **Ticket System** - Private channels with automatic permissions
- **Transcript Generation** - HTML transcripts with modern design
- **Anti-Spam Protection** - Cooldown system
- **MongoDB Database** - Persistent storage
- **Automatic Numbering** - #0001, #0002, etc.

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit the `.env` file:

```env
DISCORD_TOKEN=your_bot_token_here
MONGO_URI=mongodb://localhost:27017/sentoria-tickets
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_guild_id_here
```

### 3. Configure Settings

Edit `config.js` to customize:
- Channel IDs
- Role IDs
- Colors
- Messages

### 4. Deploy Commands

```bash
node deploy-commands.js
```

### 5. Start Bot

```bash
npm start
```

## 📁 Project Structure

```
Sentoria Tickets/
├── commands/           # Slash commands
│   ├── setup.js       # Setup ticket panel
│   ├── close.js       # Close ticket
│   ├── add.js         # Add member
│   ├── remove.js      # Remove member
│   ├── rename.js      # Rename ticket
│   ├── transcript.js  # Generate transcript
│   └── claim.js       # Claim ticket
├── events/            # Event handlers
│   ├── ready.js       # Bot ready event
│   └── interactionCreate.js  # Interaction handler
├── models/            # MongoDB models
│   ├── Ticket.js      # Ticket model
│   └── Settings.js    # Settings model
├── utils/             # Utility functions
│   └── ticketManager.js  # Ticket management
├── assets/            # Static assets
│   └── tickets-banner.png  # Banner image
├── config.js          # Configuration
├── .env               # Environment variables
├── index.js           # Main entry point
└── deploy-commands.js # Command deployment
```

## 🎨 Customization

### Colors
Edit `config.js` to change colors:
```javascript
colors: {
    primary: 0x0066FF,    // Blue
    secondary: 0x0044CC,  // Dark Blue
    accent: 0x00A3FF,     // Light Blue
    // ...
}
```

### Categories
Edit ticket categories in `config.js`:
```javascript
categories: {
    technical: { name: '🔧 الدعم الفني', ... },
    management: { name: '📋 تقديم للإدارة', ... },
    // ...
}
```

### Messages
Customize welcome/goodbye messages in Settings model.

## ⚙️ Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/setup` | Setup ticket panel | Admin |
| `/close` | Close current ticket | Staff/User |
| `/add` | Add member to ticket | Staff |
| `/remove` | Remove member from ticket | Staff |
| `/rename` | Rename ticket channel | Staff |
| `/transcript` | Generate transcript | Admin |
| `/claim` | Claim ticket | Staff |

## 📊 Database

The bot uses MongoDB for:
- Ticket storage
- Settings storage
- Transcript storage
- Statistics tracking

## 🔒 Permissions

- **Admin** - Full access to all commands
- **Staff** - Can manage tickets (add, remove, claim, close)
- **User** - Can create tickets and close their own

## 📝 License

MIT License

## 🎯 Support

For support, join our Discord server or create an issue on GitHub.
