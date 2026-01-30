import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { Tool, ToolContext } from '../types.js';

export const searchContextTool: Tool = {
  definition: {
    name: 'search_context',
    description:
      'Search the agent context files for relevant information about models, tables, and business concepts.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search query to find relevant context',
        required: true,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
        required: false,
      },
    ],
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const query = (args.query as string).toLowerCase();
    const limit = (args.limit as number) || 5;

    if (!existsSync(context.agentContextPath)) {
      return { results: [], message: 'No agent context available' };
    }

    const results: Array<{ file: string; content: string; relevance: number }> = [];

    // Read all markdown files in the context directory
    try {
      const files = readdirSync(context.agentContextPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = join(context.agentContextPath, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          // Simple relevance scoring based on keyword matches
          const queryWords = query.split(/\s+/);
          let relevance = 0;

          for (const word of queryWords) {
            if (word.length > 2) {
              const matches = (lowerContent.match(new RegExp(word, 'g')) || []).length;
              relevance += matches;
            }
          }

          if (relevance > 0) {
            // Extract relevant sections (simple approach)
            const sections = content.split('\n## ');
            const relevantSections = sections
              .filter((section) => queryWords.some((word) => section.toLowerCase().includes(word)))
              .slice(0, 3);

            results.push({
              file,
              content: relevantSections.join('\n\n').slice(0, 2000), // Limit content length
              relevance,
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      return { results: [], message: 'Error reading agent context' };
    }

    // Sort by relevance and limit results
    results.sort((a, b) => b.relevance - a.relevance);

    return {
      results: results.slice(0, limit),
      totalFound: results.length,
    };
  },
};
