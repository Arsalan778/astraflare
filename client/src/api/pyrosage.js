import api from './axios';

const pyrosageAPI = {
  sendMessage: async (message, conversationId = null) => {
    const { data } = await api.post('/pyrosage/chat', {
      message,
      conversationId,
    });
    return data.data;
  },

  getConversations: async () => {
    const { data } = await api.get('/pyrosage/conversations');
    return data.data;
  },

  getConversation: async (conversationId) => {
    const { data } = await api.get(`/pyrosage/conversations/${conversationId}`);
    return data.data;
  },

  deleteConversation: async (conversationId) => {
    const { data } = await api.delete(`/pyrosage/conversations/${conversationId}`);
    return data;
  },

  getSuggestedQueries: async (params = {}) => {
    const { data } = await api.get('/pyrosage/suggestions', { params });
    return data;
  },

  getInsights: async (params = {}) => {
    const { data } = await api.get('/pyrosage/insights', { params });
    return data.data;
  },

  streamMessage: async (message, conversationId = null, options = {}) => {
    const { onChunk, onComplete, onError, signal } = options;
    
    try {
      const { data } = await api.post('/pyrosage/chat', {
        message,
        conversationId
      }, { signal });
      
      const result = data.data || data;
      // Extract content from nested structure
      const content = result.message?.content || result.response || result;
      
      if (onComplete) {
        onComplete({
          ...result,
          content: typeof content === 'string' ? content : JSON.stringify(content)
        });
      }
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  },

  rateResponse: async (messageId, rating) => {
    const { data } = await api.post(`/pyrosage/messages/${messageId}/rate`, { rating });
    return data;
  },

  getChatHistory: async (conversationId) => {
    const { data } = await api.get(`/pyrosage/conversations/${conversationId}`);
    return data.data;
  },
};

export default pyrosageAPI;

export const {
  sendMessage,
  streamMessage,
  getChatHistory,
} = pyrosageAPI;