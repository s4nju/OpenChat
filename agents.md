# **Global Rules**
- You are an agent - please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
- If you are not sure about file content or codebase structure pertaining to the user's request, use your tools to read files and gather the relevant information: do NOT guess or make up an answer.
- You MUST plan extensively before each function call, and reflect extensively on the outcomes of the previous function calls. DO NOT do this entire process by making function calls only, as this can impair your ability to solve the problem and think insightfully.
- Your thinking should be thorough and so it's fine if it's very long. You can think step by step before and after each action you decide to take.
- You MUST iterate and keep going until the problem is solved.
- Only terminate your turn when you are sure that the problem is solved. Go through the problem step by step, and make sure to verify that your changes are correct. NEVER end your turn without having solved the problem, and when you say you are going to make a tool call, make sure you ACTUALLY make the tool call, instead of ending your turn.
- Take your time and think through every step - remember to check your solution rigorously and watch out for boundary cases, especially with the changes you made. Your solution must be perfect. If not, continue working on it. At the end, you must test your code rigorously using the tools provided, and do it many times, to catch all edge cases. If it is not robust, iterate more and make it perfect. Failing to test your code sufficiently rigorously is the NUMBER ONE failure mode on these types of tasks; make sure you handle all edge cases, and run existing tests if they are provided.
- Do not assume anything. Use the docs.
- If there is a lint error (bun run lint), fix it before moving on.
- Always refer docs using context7 about Vercel AI SDK

# **Project Details**
- Bun as the package manager
- Tailwind CSS for styling
- TypeScript for type safety
- Sonner for toast notifications
- Phosphor Icons, Lucide React for icons
- Shadcn UI and Prompt-kit for components
- Vercel AI SDK v4 for AI
- Next.js 15 and React 19 for the framework
- Convex for authentication, Database, File storage and serverless functions


- Update the Project Details whenever the stack changes.

# **Code Standards**
- Use TypeScript with strict mode enabled. Avoid `any` and `unknown` types. Prefer explicit types and interfaces. Do not use `@ts-ignore` or disable type checks.
- Use functional React components. Always use hooks at the top level. Do not use default exports for components or functions.
- Follow Next.js 15 and React 19 best practices
- Use Tailwind CSS utility classes for styling. Avoid inline styles.
- Use Bun for all package management and scripts (`bun install`).
- Follow Convex guidelines in `convex_rules.md`.
- Use Shadcn UI and Prompt-kit components as documented. Do not modify library code directly. Prefer composition over modification.
- Use Biome for all linting and formatting. Run Biome (`bun run lint`) before committing. Follow all rules specified in `biome.jsonc`. Do not use other linters or formatters (like ESLint or Prettier) unless explicitly specified. Check `biome.jsonc` for custom or overridden rules. Biome extends the `ultracite` ruleset for this project.
- Lint and format code before committing. Fix all Biome lint errors before moving on. Do not commit code with unused variables, imports, or unreachable code.
- Ensure accessibility: use semantic HTML, provide alt text for images, use ARIA attributes appropriately, and follow accessibility rules in `ultracite.md`.
- Do not use `console` statements in production code.
- Do not use TypeScript enums or namespaces.
- Do not use `any` or `unknown` as type constraints.
- Do not use `var` or function declarations outside their block.
- Update this section whenever the stack or tooling changes.

# **Files to read**
- Read convex_rules.md for convex guidelines.
- Read ultracite.md for general code rules (Always read this to avoid lint error)