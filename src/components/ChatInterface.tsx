
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, KeyRound, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import LegalChatMessage from './LegalChatMessage';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    text: "Welcome to LegalGPT. How can I assist you with your legal questions today?",
    isUser: false
  }
];

const DEFAULT_SYSTEM_PROMPT = `You are LegalGPT, an AI assistant specialized in legal information. 
You provide helpful, accurate, and clear information about legal topics. 
Remember that you provide general legal information, not specific legal advice. 
Always suggest consulting with a qualified attorney for specific legal problems.
Focus on giving factual, well-structured responses about legal matters.`;

interface ChatInterfaceProps {
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('AIzaSyBU6DAN_wDG7nqyV60a7ZaIjHVp-SE2x2w');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [showSystemPromptSettings, setShowSystemPromptSettings] = useState(false);
  const [apiProvider, setApiProvider] = useState<'deepseek' | 'gemini'>('gemini');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Try to get API key and system prompt from localStorage on initial load
  useEffect(() => {
    // Set the saved API key and provider
    const savedApiKey = localStorage.getItem('ai-api-key') || 'AIzaSyBU6DAN_wDG7nqyV60a7ZaIjHVp-SE2x2w';
    setApiKey(savedApiKey);
    
    const savedApiProvider = localStorage.getItem('ai-api-provider') as 'deepseek' | 'gemini' || 'gemini';
    setApiProvider(savedApiProvider);
    
    // Check for custom system prompt
    const savedSystemPrompt = localStorage.getItem('system-prompt');
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('ai-api-key', apiKey);
      localStorage.setItem('ai-api-provider', apiProvider);
      setShowApiKeyInput(false);
      toast({
        title: "Success",
        description: `${apiProvider.charAt(0).toUpperCase() + apiProvider.slice(1)} API key saved successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid API key",
      });
    }
  };

  const saveSystemPrompt = () => {
    localStorage.setItem('system-prompt', systemPrompt);
    setShowSystemPromptSettings(false);
    toast({
      title: "Success",
      description: "Custom prompt saved successfully",
    });
  };

  const resetSystemPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    localStorage.removeItem('system-prompt');
    toast({
      title: "Success",
      description: "Prompt reset to default",
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    if (!apiKey) {
      setShowApiKeyInput(true);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Please enter your ${apiProvider.charAt(0).toUpperCase() + apiProvider.slice(1)} API key first`,
      });
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      let response;
      if (apiProvider === 'deepseek') {
        response = await fetchDeepSeekResponse(inputValue);
      } else if (apiProvider === 'gemini') {
        response = await fetchGeminiResponse(inputValue);
      } else {
        throw new Error('Unsupported API provider');
      }
      
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false
      };
      
      setMessages(prev => [...prev, responseMessage]);
    } catch (error) {
      console.error(`Error fetching ${apiProvider} response:`, error);
      
      let errorMessage = "I'm sorry, I encountered an error processing your request.";
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('invalid')) {
          errorMessage += ` Invalid API key or authentication error. Please check your ${apiProvider} API key and try again.`;
        } else if (error.message.includes('429') || error.message.includes('quota')) {
          errorMessage += " Rate limit exceeded or quota reached. Please try again later.";
        } else if (error.message.includes('500')) {
          errorMessage += ` The ${apiProvider} API is experiencing issues. Please try again later.`;
        } else {
          errorMessage += " " + error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "API Error",
        description: `Failed to get response from ${apiProvider}. Please check your API key and try again.`,
      });
      
      const aiErrorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false
      };
      
      setMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeepSeekResponse = async (userInput: string): Promise<string> => {
    try {
      const previousMessages = messages
        .filter(m => messages.indexOf(m) > 0) // Skip the initial welcome message
        .map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }));

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            ...previousMessages,
            {
              role: 'user',
              content: userInput
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw error;
    }
  };

  const fetchGeminiResponse = async (userInput: string): Promise<string> => {
    try {
      // Prepare conversation history (skip the initial welcome message)
      const previousMessages = messages
        .filter(m => messages.indexOf(m) > 0)
        .map(m => ({
          role: m.isUser ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));
      
      // Format contents array with proper system prompt handling
      const contents = [];
      
      // Add system prompt as first user message
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      
      // Add acknowledgment from the model
      contents.push({
        role: 'model',
        parts: [{ text: 'I will act as LegalGPT, providing legal information but not legal advice.' }]
      });
      
      // Add conversation history
      contents.push(...previousMessages);
      
      // Add current user input
      contents.push({
        role: 'user',
        parts: [{ text: userInput }]
      });

      // Make API request with the correct endpoint and model
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            topK: 40,
            topP: 0.95
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Extract text from Gemini response
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  };

  // Simple fallback response generator for when API is not available
  const generateFallbackResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('contract') || input.includes('agreement')) {
      return "Contracts are legally binding agreements between parties. For specific contract advice, I'd need more details about your situation. What type of contract are you dealing with?";
    } else if (input.includes('liability') || input.includes('sue')) {
      return "Liability questions are complex and depend on jurisdiction and specific circumstances. Could you provide more details about your situation so I can offer more targeted information?";
    } else if (input.includes('rights') || input.includes('entitled')) {
      return "Legal rights vary significantly by jurisdiction and context. To provide accurate information about your rights, I would need to know your location and the specific situation you're inquiring about.";
    } else if (input.includes('hello') || input.includes('hi')) {
      return "Hello! I'm LegalGPT, your AI legal assistant. Please note that while I can provide legal information, I cannot provide legal advice that substitutes for a qualified attorney. How can I help you today?";
    } else {
      return "Thank you for your question. To provide you with accurate legal information, I'd need more specific details. Please note that I provide general legal information, not legal advice. For specific advice tailored to your situation, consulting with a qualified attorney is recommended.";
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-[500px] md:h-[600px] w-full max-w-3xl mx-auto rounded-xl shadow-elegant border border-legal-border overflow-hidden bg-legal-light/50 dark:bg-legal-slate/5",
      className
    )}>
      <div className="bg-white dark:bg-legal-slate/10 border-b border-legal-border px-4 py-3 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-legal-slate">LegalGPT Assistant</h3>
          <p className="text-xs text-legal-muted">Ask any legal question</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showSystemPromptSettings} onOpenChange={setShowSystemPromptSettings}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Custom Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Customize System Prompt</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={8}
                    className="resize-none"
                    placeholder="Enter your custom system prompt..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt defines how the AI assistant behaves. You can customize it to focus on specific legal domains or response styles.
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={resetSystemPrompt}>
                    Reset to Default
                  </Button>
                  <Button onClick={saveSystemPrompt}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs flex items-center gap-1"
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          >
            <KeyRound className="h-3 w-3" />
            {apiKey ? 'Change API Key' : 'Set API Key'}
          </Button>
        </div>
      </div>
      
      {showApiKeyInput && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-b border-legal-border">
          <div className="text-sm mb-2">Select API provider and enter your API key</div>
          <div className="flex gap-2 mb-2">
            <select 
              value={apiProvider}
              onChange={(e) => setApiProvider(e.target.value as 'deepseek' | 'gemini')}
              className="px-3 py-2 bg-white dark:bg-legal-slate/20 border border-legal-border rounded-md text-sm"
            >
              <option value="deepseek">DeepSeek API</option>
              <option value="gemini">Google Gemini API</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiProvider === 'deepseek' ? 'DeepSeek API Key' : 'Gemini API Key'}
              className="flex-1 text-sm border-legal-border"
            />
            <Button onClick={saveApiKey} className="bg-legal-accent hover:bg-legal-accent/90 text-white">
              Save
            </Button>
          </div>
          <p className="text-xs mt-2 text-legal-muted">
            Your API key is stored locally in your browser and never sent to our servers.
            {apiProvider === 'gemini' && (
              <span> For Gemini, use an API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.</span>
            )}
          </p>
        </div>
      )}
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <LegalChatMessage
              key={message.id}
              message={message.text}
              isUser={message.isUser}
            />
          ))}
          
          {isLoading && (
            <LegalChatMessage
              message=""
              isUser={false}
              isLoading={true}
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <form 
        onSubmit={handleSendMessage}
        className="border-t border-legal-border bg-white dark:bg-legal-slate/10 p-4"
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="flex-shrink-0 text-legal-muted hover:text-legal-slate border-legal-border"
          >
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>
          
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your legal question..."
            className="flex-1 border-legal-border focus-visible:ring-legal-accent"
          />
          
          <Button
            type="submit"
            className="flex-shrink-0 bg-legal-accent hover:bg-legal-accent/90 text-white"
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
