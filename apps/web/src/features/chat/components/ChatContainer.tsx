import { useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChat } from '../hooks/useChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bot, Check, ChevronDown, Download } from 'lucide-react';

interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    resetMessages,
    models,
    defaultModelId,
    selectedModelId,
    setSelectedModelId,
  } = useChat(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentModel =
    models.find((model) => model.id === selectedModelId) ||
    models.find((model) => model.id === defaultModelId);
  const modelLabel = currentModel?.name || selectedModelId || defaultModelId || 'Default model';
  const activeSessionId = sessionId || 'default';

  const handleExport = () => {
    const records = [
      {
        type: 'session',
        sessionId: activeSessionId,
        exportedAt: new Date().toISOString(),
        modelId: selectedModelId || defaultModelId || null,
      },
      ...messages.map((message, index) => ({
        type: 'message',
        index,
        ...message,
      })),
    ];
    const jsonl = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `blueprintdata-chat-${activeSessionId}-${timestamp}.jsonl`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="sticky top-0 z-20 border-b bg-white/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Analytics Chat</CardTitle>
            <CardDescription className="text-sm">
              Ask questions about your data and get clear, structured answers.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <span className="text-xs text-muted-foreground">Model</span>
                  <span className="max-w-[160px] truncate text-xs font-medium text-foreground">
                    {modelLabel}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[260px]">
                <DropdownMenuLabel>Available models</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {models.length === 0 ? (
                  <DropdownMenuItem disabled>No models available</DropdownMenuItem>
                ) : (
                  models.map((model) => {
                    const isSelected = model.id === (selectedModelId || defaultModelId);
                    return (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-foreground">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {model.id === defaultModelId && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                              Default
                            </span>
                          )}
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetMessages}
              className="h-8"
            >
              Reset chat
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSONL
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {sessionId ? `Session ${sessionId.slice(0, 8)}...` : 'New session'}
            </div>
          </div>
        </div>
      </div>
      <Card className="mx-auto flex w-full max-w-4xl flex-1 flex-col border-0 bg-transparent shadow-none">
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 px-4 py-6 md:px-6">
              <MessageList messages={messages} />
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 ring-1 ring-border/60">
                    <AvatarFallback className="flex items-center justify-center bg-secondary text-secondary-foreground text-xs font-semibold">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 rounded-full bg-muted animate-bounce [animation-delay:0s]" />
                      <div className="h-2 w-2 rounded-full bg-muted animate-bounce [animation-delay:0.2s]" />
                      <div className="h-2 w-2 rounded-full bg-muted animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </Card>
    </div>
  );
}
