import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Tool, ToolContext } from '../types.js';

const DEFAULT_LIST_LIMIT = 200;
const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_LINE_COUNT = 200;

const resolveSafePath = (baseDir: string, targetPath: string): string | null => {
  const normalizedBase = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, targetPath);

  if (resolved === normalizedBase || resolved.startsWith(`${normalizedBase}${path.sep}`)) {
    return resolved;
  }

  return null;
};

export const listFilesTool: Tool = {
  definition: {
    name: 'list_files',
    description: 'List files and folders under the current workspace root.',
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Relative path to list (default: .)',
        required: false,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'Whether to list files recursively (default: false)',
        required: false,
      },
      {
        name: 'includeHidden',
        type: 'boolean',
        description: 'Include dotfiles and hidden directories (default: false)',
        required: false,
      },
      {
        name: 'limit',
        type: 'number',
        description: `Maximum number of entries to return (default: ${DEFAULT_LIST_LIMIT})`,
        required: false,
      },
    ],
  },

  async execute(args: Record<string, unknown>, _context: ToolContext): Promise<unknown> {
    const baseDir = process.cwd();
    const relativePath = typeof args.path === 'string' ? args.path.trim() : '.';
    const recursive = Boolean(args.recursive);
    const includeHidden = Boolean(args.includeHidden);
    const limit =
      typeof args.limit === 'number' && args.limit > 0 ? args.limit : DEFAULT_LIST_LIMIT;

    const targetDir = resolveSafePath(baseDir, relativePath || '.');
    if (!targetDir) {
      return { entries: [], message: 'Invalid path' };
    }

    let truncated = false;
    const entries: Array<{ path: string; type: 'file' | 'directory' }> = [];

    const walk = async (currentDir: string): Promise<void> => {
      if (truncated) {
        return;
      }

      let dirEntries;
      try {
        dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of dirEntries) {
        if (truncated) {
          return;
        }

        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);
        const relative = path.relative(baseDir, fullPath) || '.';

        if (entry.isDirectory()) {
          entries.push({ path: relative, type: 'directory' });
          if (entries.length >= limit) {
            truncated = true;
            return;
          }
          if (recursive) {
            await walk(fullPath);
          }
          continue;
        }

        if (entry.isFile()) {
          entries.push({ path: relative, type: 'file' });
          if (entries.length >= limit) {
            truncated = true;
            return;
          }
        }
      }
    };

    await walk(targetDir);

    return {
      entries,
      total: entries.length,
      truncated,
      baseDir: path.relative(baseDir, targetDir) || '.',
    };
  },
};

export const readFileTool: Tool = {
  definition: {
    name: 'read_file',
    description: 'Read a file from the current workspace root.',
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Relative path to the file',
        required: true,
      },
      {
        name: 'startLine',
        type: 'number',
        description: '1-based line number to start reading from',
        required: false,
      },
      {
        name: 'lineCount',
        type: 'number',
        description: `Number of lines to read (default: ${DEFAULT_LINE_COUNT})`,
        required: false,
      },
      {
        name: 'maxChars',
        type: 'number',
        description: `Maximum number of characters to return (default: ${DEFAULT_MAX_CHARS})`,
        required: false,
      },
    ],
  },

  async execute(args: Record<string, unknown>, _context: ToolContext): Promise<unknown> {
    const baseDir = process.cwd();
    const relativePath = typeof args.path === 'string' ? args.path.trim() : '';
    const startLine =
      typeof args.startLine === 'number' && args.startLine > 0 ? Math.floor(args.startLine) : 1;
    const lineCount =
      typeof args.lineCount === 'number' && args.lineCount > 0
        ? Math.floor(args.lineCount)
        : DEFAULT_LINE_COUNT;
    const maxChars =
      typeof args.maxChars === 'number' && args.maxChars > 0 ? args.maxChars : DEFAULT_MAX_CHARS;

    if (!relativePath) {
      return { message: 'Path is required' };
    }

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

    const lines = content.split(/\r?\n/);
    const startIndex = Math.max(startLine - 1, 0);
    const selectedLines = lines.slice(startIndex, startIndex + lineCount);
    const body = selectedLines.join('\n');
    const truncated = body.length > maxChars;

    return {
      path: relativePath,
      startLine,
      lineCount: selectedLines.length,
      totalLines: lines.length,
      truncated,
      content: truncated ? body.slice(0, maxChars) : body,
    };
  },
};
