import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { X, Send, Bot, User, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface Option {
  key: string;
  label: string;
}

interface BotResponse {
  message: string;
  options?: Option[];
  downloadUrl?: string;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: Option[];
  downloadUrl?: string;
}

interface ChatbotWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatbotWindow({ isOpen, onClose }: ChatbotWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !socketRef.current) {
      const token = localStorage.getItem('token');
      // Conecta ao servidor WebSocket do chatbot
      socketRef.current = io('http://localhost:3002', {
        auth: { token }
      });

      socketRef.current.on('bot_message', (response: BotResponse) => {
        setIsTyping(false);
        const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'bot',
          text: response.message,
          options: response.options,
          downloadUrl: response.downloadUrl,
        };
        setMessages((prev) => [...prev, newMessage]);
      });
    }

    return () => {
      // Limpa ao desmontar se quisermos encerrar a sessão
      // if (socketRef.current) socketRef.current.disconnect();
    };
  }, [isOpen]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim() || !socketRef.current) return;

    // Adiciona a mensagem do usuário
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Envia para o backend
    socketRef.current.emit('user_input', text);
  };

  const handleOptionClick = (key: string, label: string) => {
    // Se o usuário clicou numa opção, envia a key, mas exibe a label no chat para ficar mais bonito
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: label,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    socketRef.current?.emit('user_input', key);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-card border border-border shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold">ValiBread Assistente</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20 text-primary-foreground" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4 bg-muted/30">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-2xl whitespace-pre-wrap text-sm shadow-sm ${msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none'}`}>
                  {msg.text}
                </div>

                {/* Download Button se houver */}
                {msg.downloadUrl && (
                  <Button size="sm" variant="outline" className="gap-2 shadow-sm border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => handleDownload(msg.downloadUrl!)}>
                    <Download className="w-4 h-4" />
                    Baixar Planilha
                  </Button>
                )}

                {/* Opções como Botões */}
                {msg.options && msg.options.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1 w-full min-w-[200px]">
                    {msg.options.map((opt) => (
                      <Button 
                        key={opt.key} 
                        variant={opt.key === '*' ? "secondary" : opt.key === '0' ? "outline" : "default"} 
                        size="sm" 
                        className="w-full justify-start text-left h-auto py-2 px-3 text-xs whitespace-normal shadow-sm"
                        onClick={() => handleOptionClick(opt.key, opt.label)}
                      >
                        <span className="font-bold opacity-50 mr-2">[{opt.key}]</span>
                        <span>{opt.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 max-w-[80%] self-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-tl-none shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 bg-card border-t border-border flex items-center gap-2">
        <Input
          placeholder="Digite o número ou comando..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend(inputValue);
          }}
          className="flex-1 rounded-full bg-muted/50 focus-visible:ring-primary/20"
        />
        <Button 
          size="icon" 
          className="rounded-full shadow-sm flex-shrink-0"
          onClick={() => handleSend(inputValue)}
          disabled={!inputValue.trim() || isTyping}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
