import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSend(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border/70 bg-white/80 px-4 py-4 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-4xl items-end gap-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your data..."
          disabled={disabled}
          rows={1}
          className="min-h-[52px] max-h-[160px] resize-none rounded-2xl border-border/70 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
        />
        <Button
          type="submit"
          disabled={disabled || !message.trim()}
          size="icon"
          className="h-11 w-11 rounded-full shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="mx-auto mt-2 flex w-full max-w-4xl items-center justify-between text-xs text-muted-foreground">
        <span>Press Enter to send</span>
        <span>Shift + Enter for a new line</span>
      </div>
    </form>
  );
}
