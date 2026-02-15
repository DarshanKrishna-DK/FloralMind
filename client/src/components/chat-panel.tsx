import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Loader2, Bot, User, X, Plus, Check, Mic, MicOff, Volume2, VolumeX, Shield } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import type { Message, ChartConfig } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface ChatPanelProps {
  datasetId: number;
  messages: Message[];
  confidenceScores?: Record<number, number>;
  onSendMessage: (content: string) => Promise<void>;
  onSliceClick?: (data: Record<string, unknown>) => void;
  onAddChartToDashboard?: (chart: ChartConfig) => void;
  isLoading: boolean;
  suggestions?: string[];
  pinnedChart?: ChartConfig | null;
  onClearPinnedChart?: () => void;
}

export function ChatPanel({
  datasetId,
  messages,
  confidenceScores = {},
  onSendMessage,
  onSliceClick,
  onAddChartToDashboard,
  isLoading,
  suggestions = [],
  pinnedChart,
  onClearPinnedChart,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [addedChartIds, setAddedChartIds] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastSpokenMsgId = useRef<number>(0);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "assistant" && lastMsg.id > lastSpokenMsgId.current) {
      lastSpokenMsgId.current = lastMsg.id;
      speakText(lastMsg.content);
    }
  }, [messages, voiceEnabled, speakText]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;
    setInput("");
    await onSendMessage(content);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    setInput("");
    await onSendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAddChart = (chart: ChartConfig, msgId: number) => {
    if (onAddChartToDashboard) {
      onAddChartToDashboard(chart);
      setAddedChartIds((prev) => new Set(prev).add(msgId));
    }
  };

  const defaultSuggestions = [
    "Show me a summary of this dataset",
    "What are the key trends?",
    "Which categories have the highest values?",
    "Break down the data by time period",
  ];

  const activeSuggestions = suggestions.length > 0 ? suggestions : (messages.length === 0 ? defaultSuggestions : []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium">AI Analytics</h3>
            <p className="text-xs text-muted-foreground">Ask questions about your data</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newVal = !voiceEnabled;
              setVoiceEnabled(newVal);
              if (!newVal) window.speechSynthesis?.cancel();
            }}
            title={voiceEnabled ? "Mute voice responses" : "Unmute voice responses"}
            data-testid="button-toggle-voice"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {pinnedChart && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-medium">Pinned Chart</span>
            <Button size="icon" variant="ghost" onClick={onClearPinnedChart} data-testid="button-unpin-chart">
              <X className="w-3 h-3" />
            </Button>
          </div>
          <ChartCard chart={pinnedChart} compact showControls={false} />
        </div>
      )}

      <ScrollArea className="flex-1 px-4" ref={scrollRef as any}>
        <div className="py-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Ready to explore your data</p>
              <p className="text-xs text-muted-foreground">
                Ask questions, request charts, or click on visualizations to drill deeper
              </p>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className="max-w-[85%] space-y-2"
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  <div
                    className={`rounded-md px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.content}
                    {msg.role === "assistant" && confidenceScores[msg.id] && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Shield className="w-2.5 h-2.5" />
                          AI Confidence: {confidenceScores[msg.id]}/5
                        </Badge>
                      </div>
                    )}
                  </div>

                  {msg.chartData && (
                    <div className="space-y-2">
                      <ChartCard
                        chart={msg.chartData as ChartConfig}
                        onSliceClick={onSliceClick}
                        compact
                        showControls={false}
                      />
                      {onAddChartToDashboard && (
                        <Button
                          variant={addedChartIds.has(msg.id) ? "secondary" : "outline"}
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleAddChart(msg.chartData as ChartConfig, msg.id)}
                          disabled={addedChartIds.has(msg.id)}
                          data-testid={`button-add-chart-${msg.id}`}
                        >
                          {addedChartIds.has(msg.id) ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Added to Dashboard
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Add to Dashboard
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {msg.suggestions && (msg.suggestions as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(msg.suggestions as string[]).map((s, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleSuggestionClick(s)}
                          data-testid={`button-suggestion-${i}`}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 items-start"
            >
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-md px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {activeSuggestions.length > 0 && messages.length === 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {activeSuggestions.map((s, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleSuggestionClick(s)}
                data-testid={`button-default-suggestion-${i}`}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t">
        {isListening && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-primary font-medium">Listening...</span>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            className="resize-none text-sm min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={isLoading}
            data-testid="input-chat"
          />
          <Button
            type="button"
            size="icon"
            variant={isListening ? "default" : "ghost"}
            onClick={toggleListening}
            disabled={isLoading}
            title={isListening ? "Stop listening" : "Start voice input"}
            data-testid="button-mic"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
