import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import pyrosageAPI from '@api/pyrosage';

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, conversationId }, { rejectWithValue }) => {
    try {
      const data = await pyrosageAPI.sendMessage(message, conversationId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send message'
      );
    }
  }
);

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const data = await pyrosageAPI.getConversations();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch conversations'
      );
    }
  }
);

export const fetchConversation = createAsyncThunk(
  'chat/fetchConversation',
  async (conversationId, { rejectWithValue }) => {
    try {
      const data = await pyrosageAPI.getConversation(conversationId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch conversation'
      );
    }
  }
);

export const deleteConversation = createAsyncThunk(
  'chat/deleteConversation',
  async (conversationId, { rejectWithValue }) => {
    try {
      await pyrosageAPI.deleteConversation(conversationId);
      return conversationId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete conversation'
      );
    }
  }
);

export const fetchSuggestedQueries = createAsyncThunk(
  'chat/fetchSuggestions',
  async (context = {}, { rejectWithValue }) => {
    try {
      const data = await pyrosageAPI.getSuggestedQueries(context);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch suggestions'
      );
    }
  }
);

export const fetchInsights = createAsyncThunk(
  'chat/fetchInsights',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await pyrosageAPI.getInsights(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch insights'
      );
    }
  }
);

export const rateMessage = createAsyncThunk(
  'chat/rateMessage',
  async ({ messageId, rating }, { rejectWithValue }) => {
    try {
      const data = await pyrosageAPI.rateResponse(messageId, rating);
      return { messageId, rating, ...data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to rate message'
      );
    }
  }
);

const initialState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  suggestedQueries: [],
  insights: [],
  isLoading: {
    send: false,
    conversations: false,
    messages: false,
    suggestions: false,
    insights: false,
  },
  isStreaming: false,
  isTyping: false,
  streamingContent: '',
  error: null,
  inputDraft: '',
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
      if (!action.payload) {
        state.messages = [];
      }
    },

    startNewConversation(state) {
      state.activeConversationId = null;
      state.messages = [];
      state.streamingContent = '';
      state.isStreaming = false;
    },

    addOptimisticMessage(state, action) {
      const { id, role, content, timestamp } = action.payload;
      state.messages.push({
        id: id || `temp-${Date.now()}`,
        role: role || 'user',
        content,
        timestamp: timestamp || new Date().toISOString(),
        isOptimistic: true,
      });
    },

    removeOptimisticMessage(state, action) {
      const tempId = action.payload;
      state.messages = state.messages.filter((m) => m.id !== tempId);
    },

    setStreamingContent(state, action) {
      state.streamingContent = action.payload;
      state.isStreaming = true;
    },

    appendStreamingContent(state, action) {
      state.streamingContent += action.payload;
      state.isStreaming = true;
    },

    finalizeStreamingMessage(state) {
      if (state.streamingContent) {
        state.messages.push({
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: state.streamingContent,
          timestamp: new Date().toISOString(),
        });
      }
      state.streamingContent = '';
      state.isStreaming = false;
    },

    cancelStreaming(state) {
      state.streamingContent = '';
      state.isStreaming = false;
    },

    setInputDraft(state, action) {
      state.inputDraft = action.payload;
    },

    clearMessages(state) {
      state.messages = [];
      state.activeConversationId = null;
      state.streamingContent = '';
      state.isStreaming = false;
    },

    clearError(state) {
      state.error = null;
    },

    updateMessageRating(state, action) {
      const { messageId, rating } = action.payload;
      const message = state.messages.find((m) => m.id === messageId);
      if (message) {
        message.rating = rating;
      }
    },

    // Handle real-time message injection from WebSocket
    addSocketMessage(state, action) {
      const message = action.payload;
      const exists = state.messages.find((m) => m.id === message.id);
      if (!exists) {
        state.messages.push(message);
      }
    },

    // Reorder conversations — move most recent to top
    reorderConversations(state, action) {
      const conversationId = action.payload;
      const idx = state.conversations.findIndex((c) => c.id === conversationId);
      if (idx > 0) {
        const [conversation] = state.conversations.splice(idx, 1);
        conversation.updatedAt = new Date().toISOString();
        state.conversations.unshift(conversation);
      }
    },

    addMessage(state, action) {
      const message = action.payload;
      state.messages.push({
        id: message.id || `msg-${Date.now()}`,
        role: message.role || 'assistant',
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        sources: message.sources || [],
        metadata: message.metadata || null,
      });
    },

    setLoading(state, action) {
      const { key, value } = action.payload;
      if (state.isLoading.hasOwnProperty(key)) {
        state.isLoading[key] = value;
      }
    },

    setError(state, action) {
      state.error = action.payload;
    },

    clearChat(state) {
      state.messages = [];
      state.activeConversationId = null;
      state.streamingContent = '';
      state.isStreaming = false;
      state.error = null;
      state.inputDraft = '';
    },

    setTyping(state, action) {
      state.isTyping = action.payload;
    },

    updateLastMessage(state, action) {
      const { messageId, updates } = action.payload;
      const message = state.messages.find((m) => m.id === messageId);
      if (message) {
        Object.assign(message, updates);
      }
    },
  },

  extraReducers: (builder) => {
    builder
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.isLoading.send = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading.send = false;

        const payload = action.payload;

        // Set conversation ID if it was a new conversation
        if (payload.conversationId && !state.activeConversationId) {
          state.activeConversationId = payload.conversationId;
        }

        // Remove optimistic user message if the server returned the confirmed one
        if (payload.userMessage) {
          state.messages = state.messages.filter((m) => !m.isOptimistic);
          state.messages.push({
            id: payload.userMessage.id || `user-${Date.now()}`,
            role: 'user',
            content: payload.userMessage.content,
            timestamp: payload.userMessage.timestamp || new Date().toISOString(),
          });
        }

        // Add assistant response
        if (payload.assistantMessage) {
          state.messages.push({
            id: payload.assistantMessage.id || `asst-${Date.now()}`,
            role: 'assistant',
            content: payload.assistantMessage.content,
            timestamp: payload.assistantMessage.timestamp || new Date().toISOString(),
            sources: payload.assistantMessage.sources || [],
            metadata: payload.assistantMessage.metadata || null,
          });
        } else if (payload.message) {
          state.messages.push({
            id: payload.message.id || `asst-${Date.now()}`,
            role: 'assistant',
            content: payload.message.content || payload.message,
            timestamp: payload.message.timestamp || new Date().toISOString(),
            sources: payload.message.sources || [],
            metadata: payload.message.metadata || null,
          });
        } else if (payload.response) {
          // Alternate response shape
          state.messages.push({
            id: payload.response.id || `asst-${Date.now()}`,
            role: 'assistant',
            content: payload.response.content || payload.response,
            timestamp: new Date().toISOString(),
            sources: payload.response.sources || [],
          });
        }

        // Update the conversation preview in the sidebar list
        const convIdx = state.conversations.findIndex(
          (c) => c.id === state.activeConversationId
        );
        if (convIdx !== -1) {
          state.conversations[convIdx].updatedAt = new Date().toISOString();
          state.conversations[convIdx].lastMessage =
            payload.assistantMessage?.content?.slice(0, 100) ||
            payload.response?.content?.slice(0, 100) ||
            '';
          // Move to top
          const [conv] = state.conversations.splice(convIdx, 1);
          state.conversations.unshift(conv);
        } else if (state.activeConversationId) {
          // New conversation — add to list
          state.conversations.unshift({
            id: state.activeConversationId,
            title: payload.conversationTitle || 'New Conversation',
            updatedAt: new Date().toISOString(),
            lastMessage:
              payload.assistantMessage?.content?.slice(0, 100) ||
              payload.response?.content?.slice(0, 100) ||
              '',
          });
        }

        state.inputDraft = '';
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading.send = false;
        state.error = action.payload;
        // Remove the optimistic message on failure
        state.messages = state.messages.filter((m) => !m.isOptimistic);
      })

      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading.conversations = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading.conversations = false;
        state.conversations = action.payload.conversations || action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading.conversations = false;
        state.error = action.payload;
      })

      // Fetch Single Conversation (load messages)
      .addCase(fetchConversation.pending, (state) => {
        state.isLoading.messages = true;
        state.error = null;
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.isLoading.messages = false;
        const payload = action.payload;
        state.messages = payload.messages || payload.conversation?.messages || [];
        state.activeConversationId =
          payload.conversationId || payload.conversation?.id || state.activeConversationId;
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        state.isLoading.messages = false;
        state.error = action.payload;
      })

      // Delete Conversation
      .addCase(deleteConversation.pending, (state) => {
        // Optimistic removal handled in UI
      })
      .addCase(deleteConversation.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.conversations = state.conversations.filter((c) => c.id !== deletedId);
        if (state.activeConversationId === deletedId) {
          state.activeConversationId = null;
          state.messages = [];
        }
      })
      .addCase(deleteConversation.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Suggested Queries
      .addCase(fetchSuggestedQueries.pending, (state) => {
        state.isLoading.suggestions = true;
      })
      .addCase(fetchSuggestedQueries.fulfilled, (state, action) => {
        state.isLoading.suggestions = false;
        state.suggestedQueries = action.payload.suggestions || action.payload;
      })
      .addCase(fetchSuggestedQueries.rejected, (state, action) => {
        state.isLoading.suggestions = false;
        state.error = action.payload;
      })

      // Insights
      .addCase(fetchInsights.pending, (state) => {
        state.isLoading.insights = true;
      })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.isLoading.insights = false;
        state.insights = action.payload.insights || action.payload;
      })
      .addCase(fetchInsights.rejected, (state, action) => {
        state.isLoading.insights = false;
        state.error = action.payload;
      })

      // Rate Message
      .addCase(rateMessage.fulfilled, (state, action) => {
        const { messageId, rating } = action.payload;
        const message = state.messages.find((m) => m.id === messageId);
        if (message) {
          message.rating = rating;
        }
      });
  },
});

export const {
  setActiveConversation,
  startNewConversation,
  addOptimisticMessage,
  removeOptimisticMessage,
  setStreamingContent,
  appendStreamingContent,
  finalizeStreamingMessage,
  cancelStreaming,
  setInputDraft,
  clearMessages,
  clearError,
  updateMessageRating,
  addSocketMessage,
  reorderConversations,
  addMessage,
  setLoading,
  setError,
  clearChat,
  setTyping,
  updateLastMessage,
} = chatSlice.actions;

export default chatSlice.reducer;