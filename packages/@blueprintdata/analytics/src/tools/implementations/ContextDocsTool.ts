import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Tool, ToolContext } from '../types.js';

const DEFAULT_LIMIT = 200;
const DEFAULT_MAX_CHARS = 6000;

const resolveSafePath = (baseDir: string, targetPath: string): string | null => {
  const normalizedBase = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, targetPath);

  if (resolved === normalizedBase || resolved.startsWith(`${normalizedBase}${path.sep}`)) {
    return resolved;
  }

  return null;
};

export const listContextDocsTool: Tool = {
  definition: {
    name: 'list_context_docs',
    description: 'List markdown files available under the agent-context directory.',
    parameters: [
      {
        name: 'subdir',
        type: 'string',
        description: 'Optional subdirectory under agent-context to scope the listing',
        required: false,
      },
      {
        name: 'limit',
        type: 'number',
        description: `Maximum number of files to return (default: ${DEFAULT_LIMIT})`,
        required: false,
      },
    ],
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    if (!existsSync(context.agentContextPath)) {
      return { files: [], message: 'No agent context available' };
    }

    const subdir = typeof args.subdir === 'string' ? args.subdir.trim() : '';
    const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : DEFAULT_LIMIT;
    const baseDir = context.agentContextPath;
    const targetDir = subdir ? resolveSafePath(baseDir, subdir) : baseDir;

    if (!targetDir) {
      return { files: [], message: 'Invalid subdir path' };
    }

    let truncated = false;
    const files: string[] = [];

    const walk = async (currentDir: string): Promise<void> => {
      if (truncated) {
        return;
      }

      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (truncated) {
          return;
        }

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        if (!entry.name.toLowerCase().endsWith('.md')) {
          continue;
        }

        const relativePath = path.relative(baseDir, fullPath);
        files.push(relativePath);

        if (files.length >= limit) {
          truncated = true;
          return;
        }
      }
    };

    await walk(targetDir);

    return {
      files,
      total: files.length,
      truncated,
      baseDir: subdir ? path.relative(baseDir, targetDir) : '.',
    };
  },
};

export const readContextDocTool: Tool = {
  definition: {
    name: 'read_context_doc',
    description: 'Read a markdown file from the agent-context directory.',
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Relative path to the markdown file under agent-context',
        required: true,
      },
      {
        name: 'maxChars',
        type: 'number',
        description: `Maximum number of characters to return (default: ${DEFAULT_MAX_CHARS})`,
        required: false,
      },
    ],
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const relativePath = typeof args.path === 'string' ? args.path.trim() : '';
    const maxChars =
      typeof args.maxChars === 'number' && args.maxChars > 0 ? args.maxChars : DEFAULT_MAX_CHARS;

    if (!relativePath) {
      return { message: 'Path is required' };
    }

    if (!existsSync(context.agentContextPath)) {
      return { message: 'No agent context available' };
    }

    if (!relativePath.toLowerCase().endsWith('.md')) {
      return { message: 'Only markdown files are supported' };
    }

    const baseDir = context.agentContextPath;
    const resolvedPath = resolveSafePath(baseDir, relativePath);

    if (!resolvedPath) {
      return { message: 'Invalid path' };
    }

    let stat;
    try {
      stat = await fs.stat(resolvedPath);
    } catch {
      return { message: 'File not found' };
    }

    if (!stat.isFile()) {
      return { message: 'Path is not a file' };
    }

    let content: string;
    try {
      content = await fs.readFile(resolvedPath, 'utf-8');
    } catch {
      return { message: 'Unable to read file' };
    }

    const truncated = content.length > maxChars;
    const resultContent = truncated ? content.slice(0, maxChars) : content;

    return {
      path: relativePath,
      content: resultContent,
      truncated,
      totalChars: content.length,
    };
  },
};
