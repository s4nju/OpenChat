# OpenChat

[![Visit OpenChat](https://img.shields.io/badge/Visit-OpenChat-blue)](https://chat.ajanraj.com)

**OpenChat** is a free, open-source AI chat application that provides a seamless interface for multiple language models in one place.

![OpenChat screenshot](./public/cover_openchat.jpg)

## ✨ Features

- **Multi-model support** - Seamlessly switch between Gemini, Deepseek, Llama and Mistral
- **Responsive design** - Enjoy a beautiful interface that works on both desktop and mobile
- **Advanced sidebar** - Collapsible chat sidebar with search, pinning, and organization by time
- **Comprehensive settings** - Dedicated settings pages for account, customization, history, and attachments
- **Chat management** - Pin chats, export/import history, edit titles, and branch conversations
- **Prompt suggestions** - Get inspiration with contextual prompt ideas
- **Image uploads** - Share images with AI for analysis and discussion
- **Light and dark mode** - Work comfortably in any lighting condition
- **Keyboard shortcuts** - Quick access with ⌘+K (search), ⌘+Shift+O (new chat), ⌘+B (toggle sidebar)
- **AI model reasoning display** - Show the reasoning process for thinking models
- **Web search integration** - Enhanced responses with real-time web search capabilities using Exa
- **User customization** - Personalize AI behavior with custom traits, occupation, and preferences

## 🎯 Key Features

### Smart Chat Management
- **Pinned Chats** - Keep important conversations at the top
- **Time-based Organization** - Automatic grouping by Today, Yesterday, Last 7 Days, etc.
- **Chat Branching** - Create alternative conversation paths from any assistant message
- **Search & Filter** - Quickly find conversations with real-time search
- **Bulk Operations** - Export, delete, or manage multiple chats at once

### Personalization & Settings
- **User Customization** - Set your name, occupation, and personality traits for AI interactions
- **Model Preferences** - Choose your preferred AI model with per-chat switching
- **Theme System** - Beautiful light and dark modes with smooth transitions
- **Keyboard Shortcuts** - Power-user features with intuitive shortcuts
- **Data Management** - Export/import chat history with full data portability

### Advanced AI Features
- **Multi-modal Support** - Text, images, and reasoning across all supported models
- **Web Search Integration** - Real-time internet search for up-to-date information using Exa API
- **Reasoning Display** - View AI thinking process for compatible models
- **Message Usage Tracking** - Clear visibility into daily/monthly limits
- **Stream Processing** - Real-time message streaming for instant responses

## 🤖 Available Models

### Currently Available
- **GPT-4o Mini** - OpenAI's efficient multimodal model
- **Gemini 2.0 Flash** - Google's faster Gemini variant
- **Gemini 2.5 Pro** - Google's advanced model with image understanding and reasoning capabilities
- **Llama 4 Maverick 17B** - Meta's powerful model with image understanding support
- **Llama 4 Scout 17B** - Another variant of Meta's Llama 4 with image capabilities
- **Pixtral Large** - Mistral's image-capable model
- **Mistral Large** - Mistral's powerful text model
- **DeepSeek V3** - Advanced DeepSeek model
- **DeepSeek R1** - DeepSeek model with reasoning capabilities

### Coming Soon
- **Claude Sonnet 4** - Anthropic's efficient and powerful model
- **Claude 3.7 Sonnet** - Anthropic's latest advanced model
- **GPT-4o** - OpenAI's powerful multimodal mode
- **Grok 3** - xAI's advanced model

## 🛠️ Built with

- [Next.js](https://nextjs.org) - React framework for the frontend
- [prompt-kit](https://prompt-kit.com/) - Beautiful AI components and primitives
- [shadcn/ui](https://ui.shadcn.com) - Modern component library for UI
- [motion-primitives](https://motion-primitives.com) - Smooth animations and transitions
- [Vercel AI SDK](https://vercel.com/blog/introducing-the-vercel-ai-sdk) - Model integration and streaming
- [Convex](https://convex.dev) - Real-time backend, authentication, and database
- [Phosphor Icons](https://phosphoricons.com) - Beautiful icon system
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework


## 🗺️ Roadmap

- **Projects & Workspaces** - Organize your chats into projects and workspaces
- **MCP integration** - Model Context Protocol support for enhanced AI capabilities
- **Advanced search** - Full-text search across chat history

## 🚀 Recent Updates

- **Enhanced Settings Panel** - Comprehensive settings with account management, customization options, and data export
- **Advanced Sidebar** - Collapsible chat sidebar with search, pinning, time-based organization, and chat branching
- **Keyboard Shortcuts** - Full keyboard navigation support for power users
- **Chat Management** - Pin important chats, export/import history, edit titles, and create conversation branches
- **User Personalization** - Customize AI behavior with personal traits, occupation details, and preferences
- **Advanced Search** - Quickly find messages with full-text search snippets
- **Message Usage Tracking** - Visual indicators for daily/monthly message limits and premium credits (to be implemented)
- **Responsive Mobile UI** - Optimized mobile experience with drawer-based navigation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun (recommended)
- Git
- A Convex account (free tier available)
- API keys for the AI models you want to use

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/OpenChat.git
cd OpenChat

# Install dependencies (using Bun - recommended)
bun install

# Or with npm
npm install
```

### 2. Set up Convex Backend

OpenChat uses [Convex](https://convex.dev) for real-time backend, authentication, and database management.

```bash
# Install Convex CLI globally
bun add -g convex

# Login to Convex (creates account if needed)
bunx convex login

# Set up a new Convex project
bunx convex dev --once
```

This will:
- Create a new Convex project in your dashboard
- Generate a `convex/` directory with your schema
- Create a `.env.local` file with your Convex URL

### 3. Configure Environment Variables

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env.local
```

Add your API keys to `.env.local`:

```env
# Convex (automatically added by Convex CLI)
CONVEX_DEPLOYMENT=your-deployment-url

# AI Model API Keys (add the ones you want to use)
OPENAI_API_KEY=your-openai-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
MISTRAL_API_KEY=your-mistral-key
TOGETHER_API_KEY=your-together-key

# Secret used to encrypt user-provided API keys
API_KEY_SECRET=change-me

# Authentication (Convex handles this automatically)
CONVEX_AUTH_ADAPTER=convex

# Optional: Web Search API Keys
EXA_API_KEY=your-exa-key  # For web search functionality (recommended)
TAVILY_API_KEY=your-tavily-key  # Alternative web search provider
```

`API_KEY_SECRET` is used server-side to encrypt any API keys users save in the
settings page. Keep it long and random.

### 4. Set up Authentication

OpenChat uses Convex Auth for authentication with Google OAuth. Follow these steps:

1. **Set up Google OAuth**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://yourdomain.com/api/auth/callback/google`

2. **Configure Convex Auth**:
   - Go to your [Convex Dashboard](https://dashboard.convex.dev)
   - Select your project
   - Navigate to "Settings" → "Environment Variables"
   - Add your Google OAuth credentials:

```env
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
SITE_URL=http://localhost:3000  # For development
```

3. **Reference**: For detailed setup instructions, see the [Convex Auth Google Provider Documentation](https://docs.convex.dev/auth/config/google)

### 5. Deploy Convex Functions

Deploy your Convex schema and functions:

```bash
# Deploy to Convex (this pushes your functions and schema)
bunx convex deploy

# Or for development with hot reload
bunx convex dev
```

### 6. Run the Development Server

```bash
# Start the Next.js development server
bun dev

# Or with npm
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see OpenChat running locally!

### 7. Production Deployment

For production deployment:

1. **Deploy Convex**:
   ```bash
   bunx convex deploy --prod
   ```

2. **Deploy Frontend** (Vercel recommended):
   ```bash
   # Install Vercel CLI
   bun add -g vercel
   
   # Deploy to Vercel
   vercel --prod
   ```

3. **Update Environment Variables**:
   - Add your production API keys to Vercel
   - Update `SITE_URL` in Convex dashboard to your production URL

### Troubleshooting

**Convex Connection Issues**:
- Ensure you're logged into Convex: `bunx convex login`
- Check your deployment URL in `.env.local`
- Run `bunx convex dev` to sync functions

**Authentication Issues**:
- Verify OAuth credentials in Convex dashboard
- Check `SITE_URL` matches your development/production URL
- Ensure Convex Auth is properly configured

**API Key Issues**:
- Verify API keys are correctly set in `.env.local`
- Check API key permissions and quotas
- Some models may require waitlist approval

**Need Help?**
- Check the [Convex Documentation](https://docs.convex.dev)
- Review the [Convex Auth Guide](https://docs.convex.dev/auth)
- See [Google OAuth Setup](https://docs.convex.dev/auth/config/google) for authentication
- Get an [Exa API key](https://exa.ai/) for web search functionality
- Open an issue in this repository

## 🤝 Contributing

We welcome contributions! OpenChat is built with modern web technologies and follows best practices for maintainability and performance.

### Setup for Contributors
1. Fork the repository
2. Follow the [Getting Started](#🚀-getting-started) guide above to set up your development environment
3. Create your feature branch (`git checkout -b feature/amazing-feature`)

### Development Guidelines
- Follow the existing code style and patterns
- Add tests for new features when applicable
- Update documentation for user-facing changes
- Ensure responsive design works across devices
- Test keyboard shortcuts and accessibility features

### Submitting Changes
1. Commit your changes (`git commit -m 'Add some amazing feature'`)
2. Push to the branch (`git push origin feature/amazing-feature`)
3. Open a Pull Request with a clear description of changes

### Areas I'd Love Help With
- Performance optimizations
- BYOK using OpenRouter

## ⚠️ Notes

**Current Status**: Beta Release - OpenChat is actively developed with regular feature updates and improvements.

**Compatibility**: This codebase represents a significant evolution from earlier versions, with substantial architectural improvements and new features added throughout 2025.

**Performance**: Built for scale with real-time features, efficient data management, and optimized for both desktop and mobile experiences.

**Privacy**: All data is processed securely with user control over exports, imports, and data management.

---

This code is a heavily modified version of work by Julien Thibeaut, originally licensed under the Apache License 2.0.
All significant changes, improvements, and new features were implemented by Ajan Raj in 2025.