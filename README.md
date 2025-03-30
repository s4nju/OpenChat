# OpenChat

This is a web-based chat interface that allows users to interact with various AI models provided by the [OpenRouter API](https://openrouter.ai/). Users can input their OpenRouter API key, select from available models (including free options), and engage in conversations with the chosen AI.

## How it Works

1.  **API Key:** The user provides their OpenRouter API key in the Settings tab. This key is stored locally in the browser's `localStorage`.
2.  **Model Fetching:** Using the provided API key, the application fetches a list of available AI models from the OpenRouter API (`https://openrouter.ai/api/v1/models`).
3.  **Model Selection:** The user selects a desired model from the fetched list. A filter allows viewing only free models.
4.  **Chat Interaction:** The user types messages in the chat interface.
5.  **API Proxy:** When a message is sent, the frontend calls a local Next.js API route (`/api/chat`).
6.  **OpenRouter Request:** The backend API route (presumably) forwards the chat messages and selected model information to the OpenRouter API to get a response. *(Note: Current client-side code also seems to handle direct calls, review `app/page.tsx` and `app/api/chat/route.ts` for exact flow)*.
7.  **Streaming Response:** The application receives and displays the AI's response in a streaming manner.

## Key Features

*   **OpenRouter Integration:** Connects to the OpenRouter API to access a wide range of AI models.
*   **Model Selection:** Allows users to choose from various models, including filtering for free options.
*   **Local API Key Storage:** Securely stores the user's OpenRouter API key in browser `localStorage`.
*   **Streaming Responses:** Displays AI responses as they are generated.
*   **Modern UI:** Built with shadcn/ui components for a clean and responsive interface.
*   **Dark Mode:** Includes a toggle for dark/light theme preference.
*   **Chat Management:** Supports clearing chat history and stopping message generation.
*   **Type Safety:** Developed with TypeScript.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **UI Library:** [React](https://reactjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Components:** [shadcn/ui](https://ui.shadcn.com/)
*   **State Management:** (Likely React Context or Zustand - needs confirmation)
*   **Routing:** Next.js App Router
*   **Linting/Formatting:** Next.js default linting

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (Version 18 or later recommended)
*   [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd chat_app
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Environment Variables

While the OpenRouter API key is currently managed via `localStorage` on the client-side (see Settings tab in the app), if backend functionality relies on environment variables (e.g., if `/api/chat` uses its own key), create a `.env.local` file in the root directory:

```plaintext
# .env.local
# Example for a potential backend key (if needed):
# OPENROUTER_API_KEY=your_api_key_here_for_backend
```

**Note:** The application primarily expects the user to enter their key directly in the UI's Settings tab.

### Running the Development Server

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

In the project directory, you can run:

*   `pnpm dev`: Runs the app in development mode.
*   `pnpm build`: Builds the app for production.
*   `pnpm start`: Starts the production server.
*   `pnpm lint`: Runs the linter.

## Project Structure

```
/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # API route handlers
│   │   └── chat/         # Chat specific API
│   ├── layout.tsx        # Main application layout
│   └── page.tsx          # Main page component
│   └── globals.css       # Global styles
├── components/           # Reusable UI components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and libraries
├── public/               # Static assets (images, fonts, etc.)
├── styles/               # Styling files (if not using globals.css exclusively)
├── next.config.mjs       # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Project metadata and dependencies
└── pnpm-lock.yaml        # pnpm lock file
└── README.md             # This file
