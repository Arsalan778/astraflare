import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';

import {
  fetchConversations,
  fetchSuggestedQueries,
  fetchInsights,
} from '@store/chatSlice';
import ChatInterface from '@components/PyroSage/ChatInterface';
import SuggestedQueries from '@components/PyroSage/SuggestedQueries';
import InsightCard from '@components/PyroSage/InsightCard';
import GlowCard from '@components/Common/GlowCard';

export default function PyroSagePage() {
  const dispatch = useDispatch();
  const { insights, suggestedQueries, messages } = useSelector(
    (state) => state.chat
  );

  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchSuggestedQueries());
    dispatch(fetchInsights());
  }, [dispatch]);

  const showWelcome = messages.length === 0;

  return (
    <div className="h-[calc(100vh-var(--header-height))] flex flex-col">
      {/* Header */}
      <motion.div
        className="flex-shrink-0 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-fire-500/20 border border-primary-500/20">
            <SparklesIcon className="w-6 h-6 text-primary-400" />
          </div>
          PyroSage AI
        </h1>
        <p className="text-dark-400 mt-1">
          Your intelligent wildfire analysis assistant powered by RAG.
        </p>
      </motion.div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 max-w-5xl mx-auto w-full">
          {showWelcome && (
            <motion.div
              className="mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SuggestedQueries queries={suggestedQueries} />
            </motion.div>
          )}
          <div className="flex-1 min-h-0">
            <ChatInterface />
          </div>
        </div>

        {/* Right Sidebar — Insights */}
        <motion.div
          className="hidden xl:flex flex-col w-80 flex-shrink-0 space-y-4 overflow-y-auto"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider">
            AI Insights
          </h3>
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <InsightCard key={insight.id || idx} data={insight} />
            ))
          ) : (
            <GlowCard className="p-4">
              <p className="text-sm text-dark-400 text-center">
                Insights will appear here as you interact with PyroSage.
              </p>
            </GlowCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}