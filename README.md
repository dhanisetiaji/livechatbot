# 💬 Telegram Multi-Bot Live Chat System

A comprehensive live chat management system that allows multiple Telegram bots to connect with a centralized admin panel. Admins can manage multiple bots, handle conversations from different users simultaneously, and receive real-time notifications.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)

## ✨ Features

### 🤖 Multi-Bot Support
- **Multiple Telegram Bots**: Manage and monitor several Telegram bots from one dashboard
- **Dynamic Bot Assignment**: Assign specific bots to different admin users
- **Bot Status Management**: Enable/disable bots on the fly
- **Webhook Configuration**: Automatic webhook setup for Telegram integration

### 👥 User & Role Management
- **Role-Based Access Control**: Super Admin and Admin roles with different permissions
- **User Assignment**: Assign specific bots to different admin users
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Password Management**: Built-in password change functionality

### 💬 Real-Time Chat Features
- **Live Chat Interface**: WhatsApp-like chat interface for seamless communication
- **Multi-User Support**: Handle multiple conversations simultaneously
- **Infinite Scroll**: Efficient message pagination (20 messages per batch)
- **Message Search**: Quick search functionality to find specific messages
- **Real-time Updates**: WebSocket-powered instant message delivery
- **User Info Display**: View user details and conversation metadata

### 📱 Mobile-Responsive Design
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Touch-Friendly**: Smooth scrolling with iOS webkit optimization
- **Adaptive Layouts**: Clamp-based responsive sizing for all screen sizes
- **Mobile-First**: Tables, forms, and buttons adapt perfectly to small screens

### 🔔 Telegram Notifications
- **Admin Notifications**: Receive Telegram notifications when users send messages
- **Per-Bot Configuration**: Set different Telegram notification IDs for each bot assignment
- **Easy Setup**: Simple integration with @userinfobot for Telegram ID retrieval

### 🎨 Modern UI/UX
- **WhatsApp-Inspired Design**: Familiar and intuitive interface
- **Dark Mode Support**: Eye-friendly color scheme
- **Emoji Support**: Tab navigation with emoji icons
- **Smooth Animations**: Polished user experience with transitions

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 10.4
- **Language**: TypeScript 5.6
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport
- **Real-time**: Socket.IO + WebSockets
- **Telegram**: Telegraf (nestjs-telegraf)
- **File Upload**: Multer

### Frontend
- **Framework**: Remix 2.5 (React)
- **Language**: TypeScript 5.3
- **Styling**: CSS (with CSS-in-JS inline styles)
- **Real-time**: Socket.IO Client
- **Build Tool**: Vite 5.0

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **PostgreSQL** >= 12
- **Telegram Bot Token(s)** - Get from [@BotFather](https://t.me/BotFather)
- **Public Domain/URL** - For webhook configuration (ngrok for development)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/dhanisetiaji/livechatbot.git
cd livechatbot
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=livechat_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Server
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Webhook URL for Telegram bots (without trailing slash)
WEBHOOK_URL=https://yourdomain.com

# Node Environment (development/production)
NODE_ENV=development
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb livechat_db

# Run migrations
npm run migration:run

# (Optional) Seed initial data
npm run seed
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit frontend `.env` file:

```env
# Backend API URL
VITE_API_URL=http://localhost:3001

# WebSocket URL (same as API URL)
VITE_WS_URL=http://localhost:3001

# Frontend Port
PORT=5173

# Base Path (use / for root, or /livechat for subdirectory)
VITE_BASE_PATH=/
```

**Note:** If deploying to a subdirectory (e.g., `https://yourdomain.com/livechat`), set:
```env
VITE_BASE_PATH=/livechat
```

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```
Backend will run on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173` (or the PORT specified in `.env`)

### Production Mode

**Backend:**
```bash
cd backend

# Set NODE_ENV to production in .env
# NODE_ENV=production

npm run build
npm run start:prod
```

**Frontend:**
```bash
cd frontend

# Update .env with production URLs
# VITE_API_URL=https://your-api-domain.com
# VITE_WS_URL=https://your-api-domain.com
# PORT=3000 (or your preferred port)

npm run build

# Start with .env file (reads PORT from .env)
npm start

# OR start with custom port
npm run start:prod
```

**⚠️ Production Notes:**
- Backend automatically disables database query logging when `NODE_ENV=production`
- Database synchronize is disabled in production (use migrations instead)
- Ensure all environment variables are properly set
- Use process managers like PM2 for production deployments
- Configure proper SSL certificates for HTTPS

### Deploying to Subdirectory

If deploying frontend to a subdirectory (e.g., `https://yourdomain.com/livechat`):

1. **Set Base Path in `.env`:**
```env
VITE_BASE_PATH=/livechat
```

2. **Rebuild the application:**
```bash
npm run build
```

3. **Configure your web server (Nginx example):**
```nginx
# Frontend at /livechat
location /livechat {
    alias /path/to/your/frontend/build/client;
    try_files $uri $uri/ /livechat/index.html;
}

# API requests
location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# WebSocket
location /socket.io {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

4. **For Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /livechat/
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /livechat/index.html [L]
</IfModule>
```

## ⚙️ Configuration

### Setting Up Telegram Bots

1. **Create Bot with BotFather**
   - Open Telegram and search for [@BotFather](https://t.me/BotFather)
   - Send `/newbot` and follow instructions
   - Copy the bot token

2. **Add Bot in Admin Panel**
   - Log in to admin panel
   - Navigate to "Bot Management" tab
   - Click "Add Bot"
   - Enter bot name and token
   - Activate the bot

3. **Configure Webhook**
   - Set your `WEBHOOK_URL` in backend `.env`
   - Restart backend server
   - Bot will automatically register webhook

### Getting Telegram Notification ID

1. Open Telegram and message [@userinfobot](https://t.me/userinfobot)
2. Copy your Telegram ID
3. In Admin Panel → User Management → Assign Bots
4. Enter your Telegram ID in the notification field
5. You'll now receive notifications when users message your bot

## 📁 Project Structure

```
livechatbot/
├── backend/
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── chat/              # Chat & messaging logic
│   │   ├── telegram/          # Telegram bot handlers
│   │   ├── user-management/   # User & bot management
│   │   ├── config/            # Configuration files
│   │   ├── entities/          # TypeORM entities
│   │   └── main.ts            # Application entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── _index.tsx     # Chat interface
│   │   │   ├── admin.tsx      # Admin panel
│   │   │   └── login.tsx      # Login page
│   │   ├── services/          # API services
│   │   ├── styles/            # Global styles
│   │   └── root.tsx           # Root component
│   └── package.json
│
└── README.md
```

## 🔐 Default Credentials

After running the seed script, you can log in with:

**Super Admin:**
- Username: `superadmin`
- Password: `admin123``

⚠️ **Important**: Change these credentials immediately in production!

## 🌐 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/change-password` - Change user password

### User Management
- `GET /user-management/users` - Get all users
- `POST /user-management/users` - Create new user
- `PATCH /user-management/users/:id` - Update user
- `DELETE /user-management/users/:id` - Delete user

### Bot Management
- `GET /user-management/bots` - Get all bots
- `POST /user-management/bots` - Create new bot
- `PATCH /user-management/bots/:id` - Update bot
- `DELETE /user-management/bots/:id` - Delete bot
- `POST /user-management/assign-bots` - Assign bots to user

### Chat
- `GET /chat/users` - Get all chat users
- `GET /chat/users/:userId/messages` - Get user messages (with pagination)
- `POST /chat/send` - Send message to user
- `POST /chat/upload` - Upload file/media

### WebSocket Events
- `connection` - Client connects
- `message` - New message received
- `disconnect` - Client disconnects

## 📱 Usage

### Admin Panel

1. **Login**
   - Navigate to `/login`
   - Enter credentials
   - Access admin panel or chat

2. **Manage Bots**
   - Go to "Bot Management" tab
   - Add/Edit/Delete bots
   - Toggle bot status

3. **Manage Users**
   - Go to "User Management" tab
   - Create admin users
   - Assign bots to users
   - Set Telegram notification IDs

4. **Handle Chats**
   - Click "💬 Chat" button
   - Select user from list
   - View message history
   - Send replies in real-time
   - Search messages

### Features Walkthrough

**Infinite Scroll:**
- Chat loads 20 messages initially
- Scroll to top to load older messages
- Or click "Load older messages" button

**Search Messages:**
- Type in search box to filter messages
- Search works across entire conversation
- Results update in real-time

**Notifications:**
- Set your Telegram ID in admin settings
- Receive instant notifications when users message
- Each bot can have different notification settings

## 🔧 Troubleshooting

### Webhook Issues

If bots don't receive messages:
```bash
# Check webhook status
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Delete existing webhook
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook

# Restart backend to re-register webhook
```

### Database Connection

If you get database connection errors:
```bash
# Verify PostgreSQL is running
pg_isready

# Check connection settings in .env
# Ensure database exists
psql -l | grep livechat_db
```

### CORS Issues

If frontend can't connect to backend:
- Verify `FRONTEND_URL` in backend `.env`
- Check that ports match (default: frontend=5173, backend=3001)
- Ensure both services are running

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Backend framework
- [Remix](https://remix.run/) - Frontend framework
- [Telegraf](https://telegraf.js.org/) - Telegram bot framework
- [TypeORM](https://typeorm.io/) - ORM for TypeScript
- [Socket.IO](https://socket.io/) - Real-time communication

## 📧 Support

For support, email your-email@example.com or open an issue in the repository.

---

Made with ❤️ for seamless Telegram customer support
