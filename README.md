# OpenChat

[![Visit OpenChat](https://img.shields.io/badge/Visit-OpenChat-blue)](https://chat.ajanraj.com)

**OpenChat** is a free, open-source AI chat application that provides a seamless interface for multiple language models in one place.

![OpenChat screenshot](./public/cover_openchat.jpg)

## ✨ Features

### 🤖 AI & Models
- **30+ AI Models** - Access OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, xAI, and Moonshot models
- **Multi-modal Support** - Text, images, and reasoning across all supported models
- **Image Generation** - Create high-quality images with GPT Image 1, Imagen 4, and Flux Schnell
- **Reasoning Models** - View AI thinking process with o3, Claude 4, Gemini Thinking, and DeepSeek R1
- **Model Switching** - Seamlessly switch between models within conversations
- **Web Search Integration** - Real-time internet search using Exa, Tavily, and Brave APIs

### 💬 Chat Management
- **Smart Organization** - Automatic grouping by Today, Yesterday, Last 7 Days, etc.
- **Pinned Chats** - Keep important conversations at the top
- **Chat Branching** - Create alternative conversation paths from any assistant message
- **Advanced Search** - Full-text search across chat history with content snippets
- **Bulk Operations** - Export, delete, or manage multiple chats at once
- **Data Portability** - Export/import chat history with full data control

### 🎨 Interface & Experience
- **Responsive Design** - Beautiful interface that works on desktop and mobile
- **Advanced Sidebar** - Collapsible chat sidebar with search, pinning, and organization
- **Theme System** - Beautiful light and dark modes with smooth transitions
- **Keyboard Shortcuts** - Quick access with ⌘+K (search), ⌘+Shift+O (new chat), ⌘+B (toggle sidebar)
- **Real-time Streaming** - Instant message streaming for immediate responses
- **Mobile Optimized** - Drawer-based navigation for seamless mobile experience

### ⚙️ Customization & Settings
- **User Personalization** - Set name, occupation, and personality traits for AI interactions
- **Comprehensive Settings** - Dedicated pages for account, customization, history, and attachments
- **Message Usage Tracking** - Clear visibility into daily/monthly limits and premium credits
- **API Key Management** - Secure encryption and management of user-provided API keys
- **Prompt Suggestions** - Contextual prompt ideas to inspire conversations

### 💳 Premium Features
- **Payments & Subscriptions** - Integrated billing with Polar for premium model access
- **Premium Credits** - Access to advanced models like Claude 4 Sonnet, o3 and more

## 🤖 Available Models

OpenChat supports 30+ AI models across multiple providers:

### 💬 Text & Chat Models
- **OpenAI**: GPT-4o, GPT-4o Mini, o4 Mini, o3, o3 Pro, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4.5
- **Anthropic**: Claude 4 Sonnet, Claude 4 Opus, Claude 3.7 Sonnet, Claude 3.5 Sonnet (with reasoning variants)
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash series (with thinking variants)
- **Meta**: Llama 4 Maverick, Llama 4 Scout
- **Mistral**: Pixtral Large, Mistral Large
- **DeepSeek**: DeepSeek V3, DeepSeek R1
- **xAI**: Grok 3, Grok 3 Mini
- **Moonshot**: Kimi K2

### 🎨 Image Generation
- **OpenAI**: GPT Image 1
- **Google**: Imagen 4, Imagen 4 Ultra
- **Fal**: Flux Schnell

## 🛠️ Built with

- [Next.js](https://nextjs.org) - React framework for the frontend
- [prompt-kit](https://prompt-kit.com/) - Beautiful AI components and primitives
- [shadcn/ui](https://ui.shadcn.com) - Modern component library for UI
- [motion-primitives](https://motion-primitives.com) - Smooth animations and transitions
- [Vercel AI SDK](https://vercel.com/blog/introducing-the-vercel-ai-sdk) - Model integration and streaming
- [Convex](https://convex.dev) - Real-time backend, authentication, and database
- [Polar](https://polar.sh/) - Payments and subscriptions
- [Phosphor Icons](https://phosphoricons.com) - Beautiful icon system
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework


## 🗺️ Roadmap

- **Projects & Workspaces** - Organize your chats into projects and workspaces
- **MCP integration** - Model Context Protocol support for enhanced AI capabilities
- **Tasks** - Tasks using agents and deliver via email.

## 🚀 Recent Updates

- **Image Generation** - Create images with GPT Image 1, Imagen 4, and Flux Schnell
- **Advanced Search** - Full-text search across chat history with content snippets
- **Payments Integration** - Polar-powered subscriptions for premium model access
- **Enhanced Settings Panel** - Comprehensive settings with account management and API key encryption
- **Chat Branching** - Create alternative conversation paths from any assistant message
- **Reasoning Models** - Visual thinking process for o3, Claude 4 Opus, and DeepSeek R1
- **Mobile Optimization** - Improved mobile experience with drawer-based navigation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun (recommended)
- Git
- A Convex account (free tier available)
- API keys for the AI models you want to use

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ajanraj/OpenChat.git
cd OpenChat

# Install dependencies (using Bun - recommended)
bun install
```

### 2. Set up Convex Backend

OpenChat uses [Convex](https://convex.dev) for real-time backend, authentication, and database management.

```bash
# Install Convex CLI globally
bun add -g convex

# Login to Convex (creates account if needed)
bunx convex login

# Set up a new Convex project (this creates .env.local with Convex URLs)
bunx convex dev --once
```

This will:
- Create a new Convex project in your dashboard
- Generate a `convex/` directory with your schema
- Create a `.env.local` file with your Convex deployment URLs

### 3. Configure Environment Variables

**Important**: Convex creates `.env.local` with deployment URLs. Don't overwrite it!

Instead, copy the example file to see what other variables you need:

```bash
# View the example to see what API keys you need
cat .env.example

# Add the additional variables to your existing .env.local
# (Don't copy over - this would delete your Convex URLs!)
```

Manually add these to your existing `.env.local` file:
- AI model API keys (OpenAI, Google, Anthropic, xAI, etc.)
- Analytics keys (PostHog, Umami) 
- Search provider keys (Exa)
- Other configuration from `.env.example`

### 4. Set up Authentication

OpenChat uses Convex Auth for authentication with Google OAuth.

1. **Initialize Convex Auth:**
   ```bash
   # Initialize Convex Auth setup
   bunx @convex-dev/auth
   ```

2. **Set up Google OAuth:**
   - Follow the [Google OAuth Setup Guide](https://labs.convex.dev/auth/config/oauth/google)
   - Set your Google OAuth credentials in Convex:
   ```bash
   # Set Google OAuth credentials
   bunx convex env set AUTH_GOOGLE_ID your-google-client-id
   bunx convex env set AUTH_GOOGLE_SECRET your-google-client-secret
   ```

3. **Set Required Environment Variables:**
   ```bash
   # Generate and set API key encryption secret in Convex (REQUIRED)
   bunx convex env set API_KEY_SECRET $(openssl rand -hex 64)
   
   # Set site URL for development
   bunx convex env set SITE_URL http://localhost:3000
   ```

4. **Optional: Set up Polar Payments:**
   ```bash
   # Set Polar environment variables (optional)
   bunx convex env set POLAR_ORGANIZATION_TOKEN your-polar-organization-token
   bunx convex env set POLAR_PREMIUM_PRODUCT_ID your-product-id
   bunx convex env set POLAR_WEBHOOK_SECRET your-polar-webhook-secret
   ```

5. **Reference**: For detailed setup instructions, see:
   - [Convex Auth Setup Guide](https://labs.convex.dev/auth/setup)
   - [Google OAuth Configuration](https://labs.convex.dev/auth/config/oauth/google)
   - [Polar Component Documentation](https://www.convex.dev/components/polar)

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
   - Update `SITE_URL` in Convex production dashboard to your production URL

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

**Need Help?**
- Check the [Convex Documentation](https://docs.convex.dev)
- Review the [Convex Auth Setup Guide](https://labs.convex.dev/auth/setup)
- See [Google OAuth Configuration](https://labs.convex.dev/auth/config/oauth/google) for authentication
- Get an [Exa API key](https://exa.ai/) for web search functionality
- Set up [Polar payments](https://www.convex.dev/components/polar) for premium features
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
- Stream resuming using Redis
- Performance optimizations

## ⚠️ Notes

**Current Status**: Beta Release - OpenChat is actively developed with regular feature updates and improvements.

**Compatibility**: This codebase represents a significant evolution from earlier versions, with substantial architectural improvements and new features added throughout 2025.

**Performance**: Built for scale with real-time features, efficient data management, and optimized for both desktop and mobile experiences.

**Privacy**: All data is processed securely with user control over exports, imports, and data management.

---

This code is a heavily modified version of work by Julien Thibeaut, originally licensed under the Apache License 2.0.
All significant changes, improvements, and new features were implemented by Ajan Raj in 2025.