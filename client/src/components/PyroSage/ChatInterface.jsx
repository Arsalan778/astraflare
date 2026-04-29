import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Bot,
  Sparkles,
  Trash2,
  Download,
  Copy,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import SuggestedQueries from './SuggestedQueries';
import InsightCard from './InsightCard';
import {
  addMessage,
  setLoading,
  setError,
  clearChat,
  setTyping,
  updateLastMessage,
} from '../../store/chatSlice';
import { sendMessage, streamMessage, getChatHistory } from '../../api/pyrosage';
import useWebSocket from '../../hooks/useWebSocket';
import useDebounce from '../../hooks/useDebounce';
import LoadingSpinner from '../Common/LoadingSpinner';

const ChatInterface = ({ embedded = false, initialContext = null }) => {
  const dispatch = useDispatch();
  const {
    messages,
    isLoading,
    isTyping,
    error,
    conversationId,
    insights,
  } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.auth);

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!embedded);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentAssistantIdRef = useRef(null);

  const debouncedInput = useDebounce(input, 300);

  const { sendMessage: wsSend, lastMessage: wsMessage } = useWebSocket(
    '/ws/pyrosage',
    {
      onMessage: (data) => {
        if (data.type === 'stream_chunk') {
          setStreamBuffer((prev) => prev + data.content);
        } else if (data.type === 'stream_end') {
          handleStreamEnd();
        } else if (data.type === 'insight') {
          dispatch(addMessage({ role: 'insight', content: data }));
        }
      },
    }
  );

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading, scrollToBottom]);

  // Handle scroll visibility
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getChatHistory(conversationId);
        if (history?.messages?.length > 0) {
          history.messages.forEach((msg) => dispatch(addMessage(msg)));
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    if (conversationId) {
      loadHistory();
    }
  }, [conversationId, dispatch]);

  // Send initial context if provided
  useEffect(() => {
    if (initialContext && messages.length === 0) {
      handleSend(initialContext, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContext]);

  const handleStreamEnd = () => {
    setIsStreaming(false);
    if (streamBuffer) {
      dispatch(
        updateLastMessage({
          content: streamBuffer,
          streaming: false,
        })
      );
      setStreamBuffer('');
    }
    dispatch(setTyping(false));
  };

  const handleSend = async (text = null, isContext = false) => {
    const messageText = text || input.trim();
    if (!messageText && attachments.length === 0) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      isContext,
    };

    if (!isContext) {
      dispatch(addMessage(userMessage));
    }

    setInput('');
    setAttachments([]);
    dispatch(setLoading(true));
    dispatch(setTyping(true));

    const assistantId = (Date.now() + 1).toString();
    currentAssistantIdRef.current = assistantId;

    const assistantPlaceholder = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    dispatch(addMessage(assistantPlaceholder));

    try {
      abortControllerRef.current = new AbortController();

      // Attempt streaming first
      setIsStreaming(true);
      setStreamBuffer('');

      const response = await streamMessage(messageText, conversationId, {
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          setStreamBuffer((prev) => {
            const updated = prev + chunk;
            dispatch(
              updateLastMessage({
                messageId: currentAssistantIdRef.current,
                updates: {
                  content: updated,
                  streaming: true,
                }
              })
            );
            return updated;
          });
        },
        onComplete: (fullResponse) => {
          dispatch(
            updateLastMessage({
              messageId: currentAssistantIdRef.current,
              updates: {
                content: fullResponse.content || fullResponse,
                streaming: false,
                metadata: fullResponse.metadata,
                insights: fullResponse.insights,
              }
            })
          );
          setIsStreaming(false);
          setStreamBuffer('');
          dispatch(setTyping(false));
          dispatch(setLoading(false));
          currentAssistantIdRef.current = null;
        },
        onError: (err) => {
          throw err;
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') return;

      // Fallback to non-streaming
      try {
        const response = await sendMessage(messageText, conversationId);

        dispatch(
          updateLastMessage({
            messageId: currentAssistantIdRef.current,
            updates: {
              content: response.message?.content || response.data?.content || response.data || response,
              streaming: false,
              metadata: response.metadata || response.data?.metadata,
              insights: response.insights || response.data?.insights,
              sources: response.sources || response.data?.sources,
            }
          })
        );
      } catch (fallbackErr) {
        dispatch(
          updateLastMessage({
            messageId: currentAssistantIdRef.current,
            updates: {
              content: 'I encountered an error while analyzing your request. Please try again.',
              isError: true,
              streaming: false,
            }
          })
        );
      } finally {
        setIsStreaming(false);
        setStreamBuffer('');
        dispatch(setTyping(false));
        dispatch(setLoading(false));
        currentAssistantIdRef.current = null;
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      dispatch(setTyping(false));
      dispatch(setLoading(false));
      dispatch(
        updateLastMessage({
          content: streamBuffer || 'Generation stopped.',
          streaming: false,
          stopped: true,
        })
      );
      setStreamBuffer('');
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Send to speech-to-text service
        const formData = new FormData();
        formData.append('audio', blob);

        try {
          const response = await fetch('/api/pyrosage/speech-to-text', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          if (data.text) {
            setInput(data.text);
          }
        } catch (err) {
          console.error('Speech-to-text failed:', err);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const validTypes = [
        'image/png',
        'image/jpeg',
        'application/pdf',
        'text/csv',
        'application/json',
      ];
      return validTypes.includes(file.type) && file.size < 10 * 1024 * 1024;
    });

    setAttachments((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        file,
      })),
    ]);
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearChat = () => {
    dispatch(clearChat());
    setStreamBuffer('');
    setIsStreaming(false);
  };

  const handleRetry = (messageId) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      if (previousUserMessage.role === 'user') {
        handleSend(previousUserMessage.content);
      }
    }
  };

  const handleExportChat = () => {
    const chatData = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyrosage-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSuggestedQuery = (query) => {
    setInput(query);
    inputRef.current?.focus();
  };

  return (
    <div
      className={`flex flex-col bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden transition-all duration-300 ${
        isExpanded
          ? embedded
            ? 'h-[600px]'
            : 'h-full'
          : 'h-16'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-900/50 to-red-900/50 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          </div>
          <div>
            <h3 className="text-white font-semibold flex items-center gap-1.5">
              PyroSage AI
              <Sparkles className="w-4 h-4 text-orange-400" />
            </h3>
            <p className="text-xs text-gray-400">
              {isTyping
                ? 'Analyzing...'
                : isStreaming
                ? 'Generating response...'
                : 'Wildfire Intelligence Assistant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChat}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Export chat"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {embedded && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 transparent' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Welcome to PyroSage AI
            </h2>
            <p className="text-gray-400 max-w-md mb-6">
              Your intelligent wildfire prediction and analysis assistant. Ask me
              about fire risks, weather patterns, historical data, evacuation
              routes, or any wildfire-related questions.
            </p>
            <SuggestedQueries onSelect={handleSuggestedQuery} />
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <React.Fragment key={message.id || index}>
                {message.role === 'insight' ? (
                  <InsightCard data={message.content} />
                ) : (
                  <ChatMessage
                    message={message}
                    onRetry={() => handleRetry(message.id)}
                    onCopy={() =>
                      navigator.clipboard.writeText(message.content)
                    }
                    isLast={index === messages.length - 1}
                  />
                )}
              </React.Fragment>
            ))}

            {isTyping && !isStreaming && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="relative">
          <button
            onClick={() => scrollToBottom()}
            className="absolute -top-12 left-1/2 -translate-x-1/2 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full shadow-lg transition-all"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Insights Row */}
      {insights && insights.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-900/50 h-[52px] flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {insights.map((insight, idx) => (
              <InsightCard key={idx} data={insight} compact />
            ))}
          </div>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700/50">
          <div className="flex gap-2 flex-wrap">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 text-sm"
              >
                <Paperclip className="w-3 h-3 text-gray-400" />
                <span className="text-gray-300 truncate max-w-[150px]">
                  {att.name}
                </span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="text-gray-500 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700 bg-gray-900/80 backdrop-blur">
        {isStreaming && (
          <button
            onClick={handleStopGeneration}
            className="w-full mb-3 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            Stop generating
          </button>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.csv,.json"
            onChange={handleFileAttach}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-colors flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask PyroSage about wildfire risks..."
              rows={1}
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 pr-12 resize-none border border-gray-700 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 outline-none transition-all max-h-32"
              style={{
                height: 'auto',
                minHeight: '44px',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              disabled={isLoading && !isStreaming && messages.length > 0 && messages[messages.length-1].role === 'user'}
              autoFocus
            />
          </div>

          <button
            onClick={handleVoiceInput}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
              isRecording
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={() => handleSend()}
            disabled={(isLoading && !isStreaming && messages.length > 0 && messages[messages.length-1].role === 'user') || (!input.trim() && attachments.length === 0)}
            className="p-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all flex-shrink-0 shadow-lg shadow-orange-500/20 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          PyroSage uses ML models and real-time data. Always verify critical
          decisions with official sources.
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;