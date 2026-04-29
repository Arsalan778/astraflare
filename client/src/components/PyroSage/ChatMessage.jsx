import React, { useState, useMemo } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  BarChart3,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatMessage = ({ message, onRetry, onCopy, isLast }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showSources, setShowSources] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const isUser = message.role === 'user';
  const isError = message.isError;
  const isStreaming = message.streaming;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleFeedback = async (type) => {
    setFeedback(type);
    try {
      await fetch('/api/pyrosage/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          feedback: type,
        }),
      });
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Parse risk indicators from message
  const riskIndicators = useMemo(() => {
    if (isUser || !message.metadata) return null;
    return message.metadata.riskIndicators || null;
  }, [isUser, message.metadata]);

  // Custom markdown components
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={atomDark}
          language={match[1]}
          PreTag="div"
          className="rounded-lg my-2"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code
          className="bg-gray-700 px-1.5 py-0.5 rounded text-orange-300 text-sm"
          {...props}
        >
          {children}
        </code>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-2">
          <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-gray-700/50">{children}</thead>;
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 border-b border-gray-600">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-3 py-2 text-sm text-gray-300 border-b border-gray-700/50">
          {children}
        </td>
      );
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 underline inline-flex items-center gap-1"
        >
          {children}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-orange-500/50 pl-4 py-1 my-2 text-gray-300 italic bg-orange-500/5 rounded-r-lg">
          {children}
        </blockquote>
      );
    },
    ul({ children }) {
      return <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>;
    },
    ol({ children }) {
      return (
        <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-lg font-semibold text-white mt-3 mb-1">{children}</h3>
      );
    },
    h4({ children }) {
      return (
        <h4 className="text-base font-semibold text-gray-200 mt-2 mb-1">
          {children}
        </h4>
      );
    },
    p({ children }) {
      return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
    },
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case 'map':
        return <MapPin className="w-3.5 h-3.5" />;
      case 'alert':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'data':
        return <BarChart3 className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } animate-fadeIn`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
            : 'bg-gradient-to-br from-orange-500 to-red-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}
      >
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-sm'
              : isError
              ? 'bg-red-900/30 border border-red-700/50 text-red-200 rounded-tl-sm'
              : 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700/50'
          }`}
        >
          {/* Attachments in user message */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1 text-xs"
                >
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Message text */}
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>
                {message.content || message.message?.content || message.response || '...'}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}

          {/* Risk Indicators */}
          {riskIndicators && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex flex-wrap gap-2">
                {riskIndicators.map((indicator, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      indicator.level === 'extreme'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : indicator.level === 'high'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : indicator.level === 'moderate'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}
                  >
                    {indicator.label}: {indicator.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <FileText className="w-3 h-3" />
              {message.sources.length} source
              {message.sources.length > 1 ? 's' : ''}
              {showSources ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showSources && (
              <div className="mt-1.5 space-y-1.5 animate-fadeIn">
                {message.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-orange-400 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50 hover:border-orange-500/30 transition-all"
                  >
                    {getSourceIcon(source.type)}
                    <span className="truncate">{source.title}</span>
                    <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {!isUser && message.metadata && !isStreaming && (
          <div className="mt-1">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              {showMetadata ? 'Hide details' : 'Show details'}
            </button>
            {showMetadata && (
              <div className="mt-1 text-xs text-gray-500 space-y-0.5 animate-fadeIn">
                {message.metadata.model && (
                  <p>Model: {message.metadata.model}</p>
                )}
                {message.metadata.responseTime && (
                  <p>Response time: {message.metadata.responseTime}ms</p>
                )}
                {message.metadata.confidence && (
                  <p>
                    Confidence: {(message.metadata.confidence * 100).toFixed(1)}%
                  </p>
                )}
                {message.metadata.tokensUsed && (
                  <p>Tokens: {message.metadata.tokensUsed}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions & Timestamp */}
        <div
          className={`flex items-center gap-2 mt-1.5 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-xs text-gray-500">
            {formatTimestamp(message.timestamp)}
          </span>

          {!isUser && !isStreaming && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {isLast && (
                <button
                  onClick={onRetry}
                  className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
                  title="Retry"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => handleFeedback('positive')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'positive'
                    ? 'text-green-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleFeedback('negative')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'negative'
                    ? 'text-red-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                title="Bad response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {message.stopped && (
            <span className="text-xs text-yellow-500 italic">
              Generation stopped
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;