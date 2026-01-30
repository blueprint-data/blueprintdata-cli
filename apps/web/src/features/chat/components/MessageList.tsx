
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    toolCall?: {
      name: string;
      arguments: Record<string, unknown>;
    };
    toolResult?: unknown;
    chartConfig?: Record<string, unknown>;
  };
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar>
        <AvatarFallback className={cn(
          isUser && 'bg-primary text-primary-foreground',
          isAssistant && 'bg-secondary text-secondary-foreground',
          !isUser && !isAssistant && 'bg-muted text-muted-foreground'
        )}>
          {isUser ? 'U' : isAssistant ? 'AI' : 'S'}
        </AvatarFallback>
      </Avatar>
      <Card className={cn(
        'max-w-[80%]',
        isUser && 'bg-primary text-primary-foreground'
      )}>
        <CardContent className="p-3">
          {message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          )}
          {message.metadata?.toolCall && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <p className="font-medium">Tool: {message.metadata.toolCall.name}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
