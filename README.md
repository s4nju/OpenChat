# OpenChat

This is a web-based chat interface that allows users to interact with various AI models provided by the [OpenRouter API](https://openrouter.ai/). Users can input their OpenRouter API key, select from available models (including free options), and engage in conversations with the chosen AI.

## How it Works

1.  **API Key:** Users provide their OpenRouter API key in the Settings tab. This key is stored locally in the browser's `localStorage`.
2.  **Model Fetching:** Using the provided API key, the application fetches a list of available AI models from the OpenRouter API.
3.  **Model Selection:** Users select a desired model from the fetched list. A filter allows viewing only free models.
4.  **Chat Interaction:** Users type messages in the chat interface and receive responses from the AI.
5.  **Chat Management:** The application supports creating, saving, renaming, and deleting chat conversations.
6.  **Streaming Response:** AI responses are displayed in a streaming manner as they are generated.

## Key Features

*   **OpenRouter Integration:** Connects to the OpenRouter API to access a wide range of AI models.
*   **Model Selection:** Allows users to choose from various models, including filtering for free options.
*   **Chat Management:** Complete chat management with history, titles, and organization.
*   **Local Storage:** Securely stores the user's OpenRouter API key and chat history in browser storage.
*   **Streaming Responses:** Displays AI responses as they are generated.
*   **Modern UI:** Built with shadcn/ui components for a clean and responsive interface.
*   **Responsive Design:** Adapts to both desktop and mobile layouts with a collapsible sidebar.
*   **Dark/Light Mode:** Includes a toggle for theme preference.
*   **Message Formatting:** Markdown support with syntax highlighting for code blocks.
*   **State Management:** Efficient state management with Zustand stores.

## Tech Stack

*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
*   **UI Library:** [React 19](https://reactjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Components:** [shadcn/ui](https://ui.shadcn.com/)
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
*   **Markdown Rendering:** [React Markdown](https://github.com/remarkjs/react-markdown)
*   **Syntax Highlighting:** [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)
*   **Build Tool:** [Turbopack](https://turbo.build/pack)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (Version 18 or later recommended)
*   [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/OpenChat.git
    cd OpenChat
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Running the Development Server

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

In the project directory, you can run:

*   `pnpm dev`: Runs the app in development mode with Turbopack.
*   `pnpm build`: Builds the app for production.
*   `pnpm start`: Starts the production server.
*   `pnpm lint`: Runs the linter.

## Project Architecture

### State Management

The application uses Zustand for state management, organized into three main stores:

1. **Chat Store** (`lib/stores/chat-store.ts`): Manages chat messages, history, and all chat-related operations.
2. **Settings Store** (`lib/stores/settings-store.ts`): Handles API key storage, model selection, and settings configuration.
3. **UI Store** (`lib/stores/ui-store.ts`): Controls UI state including sidebar collapse, mobile detection, and responsive layouts.

### Component Structure

```
/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # API route handlers
│   │   └── chat/         # Chat specific API
│   ├── layout.tsx        # Main application layout
│   └── page.tsx          # Main page component with chat app
│   └── globals.css       # Global styles
├── components/           # Reusable UI components
│   ├── chat/             # Chat-specific components
│   │   ├── ChatHeader.tsx       # Header with controls
│   │   ├── ChatInput.tsx        # Input component
│   │   ├── MessageItem.tsx      # Individual message
│   │   ├── MessageList.tsx      # List of messages
│   │   ├── SettingsDialog.tsx   # Settings panel
│   │   └── Sidebar.tsx          # Chat sidebar
│   ├── ui/               # shadcn/ui components
│   └── theme-provider.tsx # Theme management
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and libraries
│   ├── stores/           # Zustand stores
│   │   ├── chat-store.ts     # Chat state management
│   │   ├── settings-store.ts # Settings state
│   │   └── ui-store.ts       # UI state
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
├── public/               # Static assets
└── [Configuration files]
```

## Features To Add

Here are some potential enhancements for future development:

* User authentication system
* Chat export/import functionality
* Additional model parameter controls (temperature, tokens, etc.)
* Custom styling options for the interface
* Conversation branching
* Voice input/output

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

* [OpenRouter](https://openrouter.ai/) for providing the AI model API
* [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
