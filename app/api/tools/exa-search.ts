import { tool } from "ai";
import { z } from "zod";

import Exa from "exa-js";
const exa = new Exa(process.env.EXA_API_KEY!);

export const exaSearchTool = tool({
  description: "Search the web using Exa AI.",
  parameters: z.object({
    query: z.string().describe("Search query"),
    numResults: z.number().optional().default(3).describe("Number of results to return"),
    includeDomains: z.array(z.string()).optional().describe("List of domains to include"),
    excludeDomains: z.array(z.string()).optional().describe("List of domains to exclude"),
    startPublishedDate: z.string().optional().describe("Start date for published results"),
    endPublishedDate: z.string().optional().describe("End date for published results"),
    text: z.boolean().optional().default(true).describe("Whether to include text content in results"),
  }),
  execute: async ({ query, numResults, includeDomains, excludeDomains, startPublishedDate, endPublishedDate }) => {
    const options: Record<string, unknown> = {
      numResults,
      text: {
        maxCharacters: 500
      },
      type: "auto",
    };
    if (includeDomains) options.includeDomains = includeDomains;
    if (excludeDomains) options.excludeDomains = excludeDomains;
    if (startPublishedDate) options.startPublishedDate = startPublishedDate;
    if (endPublishedDate) options.endPublishedDate = endPublishedDate;

    const result = await exa.search(query, options);
    return result;
  },
});
