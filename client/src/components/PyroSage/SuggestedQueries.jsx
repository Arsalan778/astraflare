import React, { useState, useMemo } from 'react';
import {
  Flame,
  Wind,
  MapPin,
  TrendingUp,
  Shield,
  Thermometer,
  Droplets,
  TreePine,
  AlertTriangle,
  BarChart3,
  Navigation,
  Clock,
} from 'lucide-react';

const QUERY_CATEGORIES = [
  {
    id: 'risk',
    label: 'Risk Assessment',
    icon: Flame,
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    hoverBg: 'hover:bg-red-500/20',
    queries: [
      {
        text: "What's the current wildfire risk in my region?",
        icon: MapPin,
      },
      {
        text: 'Show me the highest risk zones for the next 72 hours',
        icon: AlertTriangle,
      },
      {
        text: 'What factors are contributing most to fire risk today?',
        icon: TrendingUp,
      },
      {
        text: 'Compare current risk levels with last month',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'weather',
    label: 'Weather & Climate',
    icon: Wind,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hoverBg: 'hover:bg-blue-500/20',
    queries: [
      {
        text: 'How will upcoming weather conditions affect fire risk?',
        icon: Thermometer,
      },
      {
        text: 'What is the current drought index for California?',
        icon: Droplets,
      },
      {
        text: 'Are there any Red Flag Warnings active?',
        icon: AlertTriangle,
      },
      {
        text: 'How does wind pattern affect fire spread in mountainous terrain?',
        icon: Wind,
      },
    ],
  },
  {
    id: 'prediction',
    label: 'Predictions & Analysis',
    icon: TrendingUp,
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    hoverBg: 'hover:bg-purple-500/20',
    queries: [
      {
        text: 'Predict fire spread for the active Caldor Fire region',
        icon: Flame,
      },
      {
        text: 'What does the ML model predict for next week?',
        icon: BarChart3,
      },
      {
        text: 'Show historical fire patterns for this season',
        icon: Clock,
      },
      {
        text: 'Explain the model confidence for the current predictions',
        icon: Shield,
      },
    ],
  },
  {
    id: 'safety',
    label: 'Safety & Evacuation',
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    hoverBg: 'hover:bg-green-500/20',
    queries: [
      {
        text: 'What are the recommended evacuation routes near me?',
        icon: Navigation,
      },
      {
        text: 'How can communities prepare for wildfire season?',
        icon: Shield,
      },
      {
        text: 'What vegetation management reduces fire risk?',
        icon: TreePine,
      },
      {
        text: 'Show emission estimates for active fires',
        icon: Wind,
      },
    ],
  },
];

const SuggestedQueries = ({ onSelect, compact = false }) => {
  const [activeCategory, setActiveCategory] = useState('risk');

  const activeQueries = useMemo(
    () =>
      QUERY_CATEGORIES.find((c) => c.id === activeCategory)?.queries || [],
    [activeCategory]
  );

  const activeCategoryData = useMemo(
    () => QUERY_CATEGORIES.find((c) => c.id === activeCategory),
    [activeCategory]
  );

  if (compact) {
    // Compact mode — flat scrollable list
    const allQueries = QUERY_CATEGORIES.flatMap((cat) =>
      cat.queries.slice(0, 1).map((q) => ({
        ...q,
        category: cat,
      }))
    );

    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {allQueries.map((query, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(query.text)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-300 border whitespace-nowrap transition-all ${query.category.bgColor} ${query.category.borderColor} ${query.category.hoverBg}`}
          >
            <query.icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{query.text}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        {QUERY_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                  : `${category.bgColor} text-gray-400 border ${category.borderColor} ${category.hoverBg}`
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Query Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {activeQueries.map((query, idx) => {
          const QueryIcon = query.icon;

          return (
            <button
              key={idx}
              onClick={() => onSelect(query.text)}
              className={`group flex items-start gap-3 p-3 rounded-xl text-left transition-all border ${activeCategoryData.borderColor} ${activeCategoryData.bgColor} ${activeCategoryData.hoverBg} hover:scale-[1.02]`}
            >
              <div
                className={`p-1.5 rounded-lg bg-gradient-to-br ${activeCategoryData.color} bg-opacity-20 flex-shrink-0`}
              >
                <QueryIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors leading-snug">
                {query.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedQueries;