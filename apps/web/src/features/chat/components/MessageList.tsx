import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Bot, Settings, Copy } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    toolCall?: {
      name: string;
      arguments: Record<string, unknown>;
    };
    toolResult?: {
      success: boolean;
      result?: unknown;
      error?: string;
      media?: {
        mimeType: string;
        data: string;
        name?: string;
      };
    };
    chartConfig?: Record<string, unknown>;
  };
}

const TOOL_LABELS: Record<string, string> = {
  query_warehouse: 'Executing query',
  generate_chart: 'Generating chart',
  list_context_docs: 'Listing context docs',
  read_context_doc: 'Reading context doc',
};

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isTool = message.role === 'tool';
  const toolCall = message.metadata?.toolCall;
  const toolResult = message.metadata?.toolResult;
  const hasToolResult = Boolean(toolResult);
  const hasToolError = Boolean(toolResult?.error) || toolResult?.success === false;
  const toolLabel = toolCall?.name ? TOOL_LABELS[toolCall.name] || `Running ${toolCall.name}` : '';
  const toolArguments = toolCall?.arguments || {};
  const toolDetails = getToolDetails(toolCall?.name, toolArguments);
  const toolResultDetails = formatToolResult(toolResult);
  const toolMedia = toolResult?.media;
  const imageSrc =
    toolMedia && toolMedia.mimeType.startsWith('image/')
      ? `data:${toolMedia.mimeType};base64,${toolMedia.data}`
      : null;
  const shouldOpenChart = toolCall?.name === 'generate_chart' && Boolean(imageSrc);

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="h-9 w-9 ring-1 ring-border/60">
        <AvatarFallback
          className={cn(
            'flex items-center justify-center text-xs font-semibold',
            isUser && 'bg-primary text-primary-foreground',
            isAssistant && 'bg-secondary text-secondary-foreground',
            !isUser && !isAssistant && 'bg-muted text-muted-foreground'
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : isAssistant ? (
            <Bot className="h-4 w-4" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <Card
        className={cn(
          'group max-w-[80%] rounded-2xl border border-border/70 bg-white shadow-sm hover:scale-[1.01] hover:shadow-lg transition-all duration-200',
          isUser && 'border-transparent bg-primary text-primary-foreground hover:scale-100',
          isAssistant && 'bg-white',
          isTool && 'bg-muted/30',
          !isUser && !isAssistant && !isTool && 'bg-muted/40'
        )}
      >
        <CardContent className="space-y-2 px-4 py-3">
          <p
            className={cn(
              'text-[0.65rem] uppercase tracking-[0.18em]',
              isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
          >
            {isUser ? 'You' : isAssistant ? 'Assistant' : message.role}
          </p>
          {message.role === 'assistant' ? (
            <div className="text-sm leading-relaxed text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : isTool ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-foreground">{toolLabel || 'Running tool'}</div>
                <div
                  className={cn(
                    'text-xs uppercase tracking-[0.12em]',
                    hasToolResult && !hasToolError && 'text-emerald-600',
                    hasToolError && 'text-destructive',
                    !hasToolResult && 'text-muted-foreground'
                  )}
                >
                  {hasToolResult ? (hasToolError ? 'Failed' : 'Done') : 'In progress'}
                </div>
              </div>
              {toolDetails && (
                <details className="rounded-lg border border-border/70 bg-background/60 p-2 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    {toolDetails.label}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-[0.7rem] leading-relaxed text-foreground">
                    <code>{toolDetails.content}</code>
                  </pre>
                </details>
              )}
              {toolResultDetails && (
                <details className="rounded-lg border border-border/70 bg-background/60 p-2 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    {toolResultDetails.label}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-[0.7rem] leading-relaxed text-foreground">
                    <code>{toolResultDetails.content}</code>
                  </pre>
                </details>
              )}
              {imageSrc && (
                <details
                  className="rounded-lg border border-border/70 bg-background/60 p-2 text-xs"
                  open={shouldOpenChart}
                >
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    View chart
                  </summary>
                  <div className="mt-2 rounded-md bg-muted/40 p-2">
                    <img
                      src={imageSrc}
                      alt={toolMedia?.name || 'Generated chart'}
                      className="w-full"
                    />
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          )}
          {isAssistant && (
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => navigator.clipboard.writeText(message.content)}
                title="Copy message"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const markdownComponents: Components = {
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-muted/40" {...props} />,
  th: ({ node, ...props }) => (
    <th className="border border-border/60 px-3 py-2 text-left text-xs font-semibold" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="border border-border/60 px-3 py-2 align-top" {...props} />
  ),
  p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="mb-3 list-disc pl-5 last:mb-0" {...props} />,
  ol: ({ node, ...props }) => <ol className="mb-3 list-decimal pl-5 last:mb-0" {...props} />,
  code: ({ node, ...props }) => (
    <code className="rounded bg-muted/50 px-1 py-0.5 text-[0.75rem] text-foreground" {...props} />
  ),
  pre: ({ node, ...props }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs" {...props} />
  ),
} as const;

function getToolDetails(toolName: string | undefined, args: Record<string, unknown>) {
  if (!toolName) {
    return null;
  }

  if (toolName === 'query_warehouse') {
    const sql = typeof args.sql === 'string' ? args.sql : '';
    if (sql) {
      return { label: 'View SQL', content: sql };
    }
  }

  if (toolName === 'list_context_docs') {
    const subdir = typeof args.subdir === 'string' ? args.subdir : '';
    if (subdir) {
      return { label: 'View subdir', content: subdir };
    }
  }

  if (toolName === 'read_context_doc') {
    const targetPath = typeof args.path === 'string' ? args.path : '';
    if (targetPath) {
      return { label: 'View path', content: targetPath };
    }
  }

  const argKeys = Object.keys(args);
  if (argKeys.length > 0) {
    return { label: 'View parameters', content: JSON.stringify(args, null, 2) };
  }

  return null;
}

function formatToolResult(toolResult?: { success: boolean; result?: unknown; error?: string }) {
  if (!toolResult) {
    return null;
  }

  if (!toolResult.success) {
    const errorText = toolResult.error || 'Unknown tool error';
    return { label: 'View error', content: errorText };
  }

  if (toolResult.result === undefined) {
    return null;
  }

  const content =
    typeof toolResult.result === 'string'
      ? toolResult.result
      : JSON.stringify(toolResult.result, null, 2);

  return { label: 'View result', content };
}
