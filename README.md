# Multi-Persona Messenger 💬

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)

A next-generation messaging application built on the revolutionary concept that every person has multiple communication personas. Instead of a single chat thread per contact, the app generates multiple isolated chat channels for the same user—each representing a different emotional or functional context.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Ajaykannagit/multi-persona-messenger.git
cd multi-persona-messenger

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run the development server
npm run dev
```

## Core Concept

Traditional messaging apps treat each person as a single entity with one chat history. Multi-Persona Messenger recognizes that humans naturally shift their communication style based on context, emotion, and relationship dynamics. This app makes that implicit behavior explicit and manageable.

## Key Features

### 1. **Persona-Based Chat Channels**
- Each contact has multiple independent chat channels, one per persona
- Personas include: Fun, Serious, Professional, Personal, Romantic, Family, Study, Gaming
- Each channel maintains its own isolated message history
- Switch between personas instantly to change conversational context

### 2. **Dynamic Visual Identity**
- Each persona has its own color scheme (primary, secondary, accent)
- Unique icons for instant recognition
- UI transforms dynamically when switching personas
- Message bubbles, headers, and accents adapt to persona colors

### 3. **Unlimited Custom Personas**
- Create your own personas beyond the 8 defaults
- Customize name, description, icon, and color palette
- Edit or delete personas as relationships evolve
- Activate/deactivate personas per your needs

### 4. **Channel Management**
- Lock sensitive persona channels for privacy
- Toggle notifications per channel
- Independent notification settings for each persona
- Last activity tracking per channel

### 5. **Real-Time Messaging**
- Instant message delivery using Supabase Realtime
- Live updates when contacts send messages
- Smooth, responsive chat experience
- Message timestamps and read receipts

### 6. **Analytics Dashboard**
- Communication frequency per persona
- Visual breakdown of message distribution
- Active channel tracking
- Last activity timestamps
- Percentage-based persona usage insights

### 7. **Contact Management**
- Add contacts by email
- Search and filter contacts
- Nickname support for personalization
- Avatar-based visual identification

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom-built with Lucide React icons
- **Backend**: Supabase
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Authentication
- **Build Tool**: Vite

## Database Architecture

### Tables
1. **profiles** - User profiles linked to auth
2. **default_personas** - System-provided persona templates
3. **user_personas** - User's active and custom personas
4. **contacts** - User's contact list
5. **persona_channels** - Individual chat channels per persona per contact
6. **messages** - All messages across all channels
7. **persona_analytics** - Aggregated statistics per channel

### Security
- Complete Row Level Security implementation
- Users can only access their own data
- Secure contact and message isolation
- Protected persona and channel management

## 📋 Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher (or yarn/pnpm)
- **Supabase account** - [Sign up for free](https://supabase.com)

## 🛠️ Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ajaykannagit/multi-persona-messenger.git
cd multi-persona-messenger
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Supabase

1. Create a new project at [Supabase](https://app.supabase.com)
2. Go to **Settings** → **API** to get your credentials
3. Run the migration file located in `supabase/migrations/` to set up your database schema
4. Enable Row Level Security (RLS) policies as defined in the migration

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Note**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

### Step 5: Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### Step 6: Build for Production

```bash
npm run build
npm run preview
```

### First-Time Setup

1. **Sign Up**: Create an account with email and password
2. **Default Personas**: 8 personas are automatically created for you
3. **Add Contacts**: Use the + button to add contacts by email
4. **Start Chatting**: Select a contact, choose a persona, and begin messaging

## User Guide

### Adding a Contact
1. Click the user-plus icon in the contact panel
2. Enter the contact's email address
3. The contact must have an account on the platform

### Switching Personas
1. Select a contact from the contact list
2. View all available personas in the persona panel
3. Click any persona to switch the chat context
4. The UI will transform to match the persona's theme

### Creating Custom Personas
1. Click the + icon in the persona panel
2. Enter persona name and description
3. Choose an icon name (Lucide React icon)
4. Select three colors: primary, secondary, accent
5. Click Create to save

### Editing Personas
1. Hover over a persona chip
2. Click the edit icon
3. Modify any fields
4. Click Update to save changes

### Channel Settings
- **Lock Icon**: Toggle to lock/unlock channel for privacy
- **Bell Icon**: Enable/disable notifications for this channel

### Viewing Analytics
1. Click the Analytics button in the header
2. View total messages, active personas, and active channels
3. See detailed breakdown per persona with percentages
4. Track last activity times per persona

## Design Philosophy

### Visual Hierarchy
- Clean, modern interface with intentional white space
- Consistent 8px spacing system
- Typography with proper line heights (150% body, 120% headings)
- Professional color system with neutral tones and vibrant accents

### User Experience
- Intuitive persona switching with instant visual feedback
- Hover states and transitions for premium feel
- Progressive disclosure of complex features
- Responsive design for all device sizes

### Emotional Context
- Color psychology applied to default personas
- Visual cues that reinforce the emotional tone
- Smooth transitions maintain continuity
- Clear separation between different conversational modes

## Future Expansion Possibilities

### Phase 1 Enhancements
- Voice-tone detection for automatic persona suggestions
- Message-context warnings when tone doesn't match persona
- Auto-sorting messages based on keywords or emotional cues
- Emoji and GIF integration per persona

### Phase 2 Advanced Features
- AI-powered tone detection for incoming messages
- Persona-based reminders and scheduling
- Message summarizers per persona
- Context-driven automation and smart replies

### Phase 3 Intelligence
- Mood trend analysis over time
- Relationship health indicators
- Predictive persona suggestions
- Communication pattern insights

## Architecture Decisions

### Why Persona-Based Channels?
Traditional chat apps force all communication into a single thread, creating confusion when context shifts. Persona-based channels allow users to consciously choose their communication mode, leading to clearer, more intentional conversations.

### Why Supabase?
- Built-in authentication and RLS
- Real-time subscriptions out of the box
- PostgreSQL for complex relational queries
- Serverless architecture for scalability

### Why Separate Personas Table?
Users can enable/disable default personas and create unlimited custom ones. This architecture supports both standardization and personalization.

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
project/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── lib/             # Utilities and Supabase client
│   └── main.tsx         # Application entry point
├── supabase/
│   └── migrations/      # Database migration files
├── public/              # Static assets
└── dist/               # Production build output
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: `Missing Supabase environment variables` error
- **Solution**: Ensure your `.env` file exists and contains valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Issue**: Database connection errors
- **Solution**: Verify your Supabase project is active and the migration has been run successfully

**Issue**: TypeScript errors
- **Solution**: Run `npm run typecheck` to identify type issues. Ensure all dependencies are installed.

**Issue**: Build fails
- **Solution**: Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

## 🚢 Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Netlify

1. Push your code to GitHub
2. Create a new site in [Netlify](https://netlify.com)
3. Connect your repository
4. Add environment variables
5. Set build command: `npm run build`
6. Set publish directory: `dist`

### Other Platforms

The app is a standard Vite React application and can be deployed to any platform that supports static site hosting or Node.js.

## 🤝 Contributing

Contributions, ideas, and feedback are welcome! This project is open to contributions of all kinds.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes before submitting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- Powered by [Supabase](https://supabase.com) for backend services
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)

---

**Built with care to reimagine how humans communicate digitally.** ✨
