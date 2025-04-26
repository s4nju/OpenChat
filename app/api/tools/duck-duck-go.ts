import { tool } from "ai";
import { z } from "zod";
import { DuckDuckGoClient } from "@agentic/duck-duck-go";

const duckDuckGo = new DuckDuckGoClient();

export const duckDuckGoTool = tool({
  description: "Search the web using DuckDuckGo.",
  parameters: z.object({
    query: z.string().describe("Search query"),
    maxResults: z.number().optional().default(3).describe("Maximum number of results to return"),
  }),
  execute: async ({ query, maxResults }) => {
    console.log("Executing duckDuckGoTool with query:", query);
    const result = await duckDuckGo.search({
      query,
      maxResults,
    });
    // console.log("DuckDuckGoTool result:", JSON.stringify(result, null, 2));
    return result;
  },
});
