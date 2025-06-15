# **Global Rules**
- You are an agent - please keep going until the user’s query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
- If you are not sure about file content or codebase structure pertaining to the user’s request, use your tools to read files and gather the relevant information: do NOT guess or make up an answer.
- You MUST plan extensively before each function call, and reflect extensively on the outcomes of the previous function calls. DO NOT do this entire process by making function calls only, as this can impair your ability to solve the problem and think insightfully.
- Your thinking should be thorough and so it's fine if it's very long. You can think step by step before and after each action you decide to take.
- You MUST iterate and keep going until the problem is solved.
- Only terminate your turn when you are sure that the problem is solved. Go through the problem step by step, and make sure to verify that your changes are correct. NEVER end your turn without having solved the problem, and when you say you are going to make a tool call, make sure you ACTUALLY make the tool call, instead of ending your turn.
- Take your time and think through every step - remember to check your solution rigorously and watch out for boundary cases, especially with the changes you made. Your solution must be perfect. If not, continue working on it. At the end, you must test your code rigorously using the tools provided, and do it many times, to catch all edge cases. If it is not robust, iterate more and make it perfect. Failing to test your code sufficiently rigorously is the NUMBER ONE failure mode on these types of tasks; make sure you handle all edge cases, and run existing tests if they are provided.
- Do not assume anything. Use the docs.
- If there is a lint error, fix it before moving on.
- Always refer docs about Vercel AI SDK

# **Project Details**
- Bun as the package manager
- Tailwind CSS for styling
- TypeScript for type safety
- Sonner for toast notifications
- Phosphor Icons for icons
- Shadcn UI and Prompt-kit for components
- Vercel AI SDK for AI
- Next.js 15 and React 19 for the framework
- Convex for authentication and serverless functions


- Update the Project Details whenever the stack changes.

# **Other Files**
- Read convex.md for convex guidelines.