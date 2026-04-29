import React, { useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FileText,
  Download,
  Send,
  Calendar,
  MapPin,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
  Loader2,
  Eye,
  BarChart3,
  Map,
  AlertTriangle,
  Flame,
  Wind,
  TrendingUp,
  Image,
  Table,
  FileJson,
  File,
  Clock,
  Users,
  Shield,
  Sparkles,
  RefreshCw,
  Trash2,
  Copy,
  Mail,
  Printer,
} from 'lucide-react';
import { generateReport, getReportTemplates, getReportHistory } from '../../api/admin';
import LoadingSpinner from '../Common/LoadingSpinner';
import GlowCard from '../Common/GlowCard';

const REPORT_SECTIONS = [
  {
    id: 'executive_summary',
    label: 'Executive Summary',
    icon: FileText,
    description: 'High-level overview of wildfire risk and key findings',
    required: true,
  },
  {
    id: 'risk_assessment',
    label: 'Risk Assessment',
    icon: Flame,
    description: 'Detailed risk analysis with severity levels per region',
    required: true,
  },
  {
    id: 'weather_analysis',
    label: 'Weather Analysis',
    icon: Wind,
    description: 'Current and forecasted weather conditions affecting fire risk',
    required: false,
  },
  {
    id: 'prediction_results',
    label: 'ML Prediction Results',
    icon: TrendingUp,
    description: 'Machine learning model outputs and confidence scores',
    required: false,
  },
  {
    id: 'fire_spread_simulation',
    label: 'Fire Spread Simulation',
    icon: Map,
    description: 'Simulated fire spread scenarios and projected boundaries',
    required: false,
  },
  {
    id: 'historical_comparison',
    label: 'Historical Comparison',
    icon: BarChart3,
    description: 'Comparison with historical fire patterns and trends',
    required: false,
  },
  {
    id: 'active_alerts',
    label: 'Active Alerts',
    icon: AlertTriangle,
    description: 'Currently active warnings and alert details',
    required: false,
  },
  {
    id: 'evacuation_analysis',
    label: 'Evacuation Analysis',
    icon: Users,
    description: 'Evacuation route analysis and population impact assessment',
    required: false,
  },
  {
    id: 'emissions_estimate',
    label: 'Emissions Estimate',
    icon: Wind,
    description: 'Estimated carbon and particulate emissions from fires',
    required: false,
  },
  {
    id: 'resource_allocation',
    label: 'Resource Allocation',
    icon: Shield,
    description: 'Recommended resource deployment and priority zones',
    required: false,
  },
  {
    id: 'satellite_imagery',
    label: 'Satellite Imagery',
    icon: Image,
    description: 'Latest MODIS/VIIRS satellite imagery and hotspot data',
    required: false,
  },
  {
    id: 'data_tables',
    label: 'Data Tables',
    icon: Table,
    description: 'Raw data tables for all selected metrics',
    required: false,
  },
];

const REPORT_FORMATS = [
  { id: 'pdf', label: 'PDF Report', icon: File, extension: '.pdf' },
  { id: 'html', label: 'Interactive HTML', icon: FileText, extension: '.html' },
  { id: 'csv', label: 'CSV Data Export', icon: Table, extension: '.csv' },
  { id: 'json', label: 'JSON API Format', icon: FileJson, extension: '.json' },
];

const REPORT_TEMPLATES = [
  {
    id: 'daily_brief',
    name: 'Daily Briefing',
    description: 'Standard daily wildfire situation report',
    sections: ['executive_summary', 'risk_assessment', 'weather_analysis', 'active_alerts'],
    schedule: 'daily',
  },
  {
    id: 'incident_report',
    name: 'Incident Report',
    description: 'Detailed report for specific fire incidents',
    sections: [
      'executive_summary',
      'risk_assessment',
      'fire_spread_simulation',
      'evacuation_analysis',
      'emissions_estimate',
      'satellite_imagery',
    ],
    schedule: null,
  },
  {
    id: 'weekly_analysis',
    name: 'Weekly Analysis',
    description: 'Comprehensive weekly trend analysis',
    sections: [
      'executive_summary',
      'risk_assessment',
      'weather_analysis',
      'prediction_results',
      'historical_comparison',
      'data_tables',
    ],
    schedule: 'weekly',
  },
  {
    id: 'resource_planning',
    name: 'Resource Planning',
    description: 'Resource deployment and allocation recommendations',
    sections: [
      'executive_summary',
      'risk_assessment',
      'prediction_results',
      'resource_allocation',
      'evacuation_analysis',
    ],
    schedule: null,
  },
  {
    id: 'full_comprehensive',
    name: 'Full Comprehensive',
    description: 'All sections included — complete analysis',
    sections: REPORT_SECTIONS.map((s) => s.id),
    schedule: 'monthly',
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Select your own sections and parameters',
    sections: ['executive_summary', 'risk_assessment'],
    schedule: null,
  },
];

const PREDEFINED_REGIONS = [
  { id: 'california', name: 'California', coordinates: [-119.4179, 36.7783] },
  { id: 'oregon', name: 'Oregon', coordinates: [-120.5542, 43.8041] },
  { id: 'washington', name: 'Washington', coordinates: [-120.7401, 47.7511] },
  { id: 'colorado', name: 'Colorado', coordinates: [-105.7821, 39.5501] },
  { id: 'montana', name: 'Montana', coordinates: [-109.6333, 46.8797] },
  { id: 'arizona', name: 'Arizona', coordinates: [-111.0937, 34.0489] },
  { id: 'nevada', name: 'Nevada', coordinates: [-116.4194, 38.8026] },
  { id: 'idaho', name: 'Idaho', coordinates: [-114.742, 44.0682] },
  { id: 'new_mexico', name: 'New Mexico', coordinates: [-105.8701, 34.5199] },
  { id: 'utah', name: 'Utah', coordinates: [-111.0937, 39.3210] },
];

const SCHEDULE_OPTIONS = [
  { id: 'none', label: 'One-time generation', icon: FileText },
  { id: 'daily', label: 'Daily at 6:00 AM', icon: Clock },
  { id: 'weekly', label: 'Weekly on Mondays', icon: Calendar },
  { id: 'monthly', label: 'Monthly on 1st', icon: Calendar },
];

const ReportGenerator = ({ onReportGenerated, onPreview }) => {
  const { user } = useSelector((state) => state.auth);

  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSections, setSelectedSections] = useState([
    'executive_summary',
    'risk_assessment',
  ]);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [customRegion, setCustomRegion] = useState({ name: '', lat: '', lng: '', radius: '50' });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [schedule, setSchedule] = useState('none');
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [includeRawData, setIncludeRawData] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeMapSnapshots, setIncludeMapSnapshots] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [aiSummary, setAiSummary] = useState(true);

  // UI State
  const [expandedSection, setExpandedSection] = useState('template');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load recent reports
  useEffect(() => {
    const loadRecentReports = async () => {
      try {
        const response = await getReportHistory({ limit: 5 });
        setRecentReports(response.data || []);
      } catch (err) {
        console.error('Failed to load recent reports:', err);
      }
    };
    loadRecentReports();
  }, []);

  // Apply template
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id);
    setSelectedSections([...template.sections]);
    setReportTitle(template.name);
    setReportDescription(template.description);
    if (template.schedule) {
      setSchedule(template.schedule);
    }
  };

  // Section toggling
  const toggleSection = (sectionId) => {
    const section = REPORT_SECTIONS.find((s) => s.id === sectionId);
    if (section?.required) return;

    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
    setSelectedTemplate('custom');
  };

  // Region management
  const toggleRegion = (regionId) => {
    setSelectedRegions((prev) =>
      prev.includes(regionId)
        ? prev.filter((id) => id !== regionId)
        : [...prev, regionId]
    );
  };

  const addCustomRegion = () => {
    if (!customRegion.name || !customRegion.lat || !customRegion.lng) return;

    const newRegion = {
      id: `custom_${Date.now()}`,
      name: customRegion.name,
      coordinates: [parseFloat(customRegion.lng), parseFloat(customRegion.lat)],
      radius: parseFloat(customRegion.radius),
      custom: true,
    };

    PREDEFINED_REGIONS.push(newRegion);
    setSelectedRegions((prev) => [...prev, newRegion.id]);
    setCustomRegion({ name: '', lat: '', lng: '', radius: '50' });
  };

  // Recipient management
  const addRecipient = () => {
    const email = newRecipient.trim();
    if (!email || !email.includes('@')) return;
    if (recipients.includes(email)) return;
    setRecipients((prev) => [...prev, email]);
    setNewRecipient('');
  };

  const removeRecipient = (email) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  // Generate report
  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      setError('Please select at least one report section');
      return;
    }

    if (selectedRegions.length === 0) {
      setError('Please select at least one region');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStatus('Initializing report generation...');

    const reportConfig = {
      title: reportTitle || 'Wildfire Analysis Report',
      description: reportDescription,
      sections: selectedSections,
      format: selectedFormat,
      regions: selectedRegions.map((id) => {
        const region = PREDEFINED_REGIONS.find((r) => r.id === id);
        return {
          id: region.id,
          name: region.name,
          coordinates: region.coordinates,
          radius: region.radius,
        };
      }),
      dateRange,
      schedule: schedule !== 'none' ? schedule : null,
      recipients: recipients.length > 0 ? recipients : null,
      options: {
        includeRawData,
        includeCharts,
        includeMapSnapshots,
        confidenceThreshold,
        aiSummary,
      },
      generatedBy: user?.id,
    };

    try {
      // Simulate progress stages
      const stages = [
        { progress: 10, status: 'Fetching weather data...' },
        { progress: 25, status: 'Running prediction models...' },
        { progress: 40, status: 'Analyzing risk zones...' },
        { progress: 55, status: 'Processing satellite imagery...' },
        { progress: 70, status: 'Generating charts and maps...' },
        { progress: 85, status: 'Compiling report sections...' },
        { progress: 95, status: 'Finalizing document...' },
      ];

      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          const nextStage = stages.find((s) => s.progress > prev);
          if (nextStage) {
            setGenerationStatus(nextStage.status);
            return nextStage.progress;
          }
          return prev;
        });
      }, 1500);

      const response = await generateReport(reportConfig);

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Report generated successfully!');

      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationStatus('');
        onReportGenerated?.(response.data);
      }, 1000);
    } catch (err) {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
      setError(err.response?.data?.message || 'Failed to generate report. Please try again.');
    }
  };

  // Toggle collapsible section
  const toggleExpandedSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // Estimate generation time
  const estimatedTime = useCallback(() => {
    let seconds = 10;
    seconds += selectedSections.length * 3;
    seconds += selectedRegions.length * 5;
    if (includeMapSnapshots) seconds += 15;
    if (aiSummary) seconds += 10;
    if (includeCharts) seconds += 8;
    const minutes = Math.ceil(seconds / 60);
    return minutes <= 1 ? '~1 minute' : `~${minutes} minutes`;
  }, [selectedSections, selectedRegions, includeMapSnapshots, aiSummary, includeCharts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-orange-400" />
            Report Generator
          </h2>
          <p className="text-gray-400 mt-1">
            Create comprehensive wildfire analysis reports with AI-powered insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Est. time: {estimatedTime()}</span>
        </div>
      </div>

      {/* Generation Progress Overlay */}
      {isGenerating && (
        <div className="bg-gray-800/80 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            <div>
              <h3 className="text-white font-semibold">Generating Report</h3>
              <p className="text-sm text-gray-400">{generationStatus}</p>
            </div>
            <span className="ml-auto text-orange-400 font-bold text-lg">
              {generationProgress}%
            </span>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${generationProgress}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-700/50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Sections</p>
              <p className="text-lg font-bold text-white">{selectedSections.length}</p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Regions</p>
              <p className="text-lg font-bold text-white">{selectedRegions.length}</p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Format</p>
              <p className="text-lg font-bold text-white uppercase">{selectedFormat}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Template Selection */}
      <GlowCard glowColor="orange">
        <button
          onClick={() => toggleExpandedSection('template')}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20">
              <Sparkles className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">1. Choose Template</h3>
              <p className="text-sm text-gray-400">
                {selectedTemplate
                  ? REPORT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name
                  : 'Select a report template'}
              </p>
            </div>
          </div>
          {expandedSection === 'template' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'template' && (
          <div className="px-4 pb-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {REPORT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                    selectedTemplate === template.id
                      ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium text-sm">{template.name}</h4>
                    {selectedTemplate === template.id && (
                      <Check className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{template.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText className="w-3 h-3" />
                    <span>{template.sections.length} sections</span>
                    {template.schedule && (
                      <>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{template.schedule}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Report Title / Description */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Report Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter report title"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </GlowCard>

      {/* 2. Report Sections */}
      <GlowCard glowColor="purple">
        <button
          onClick={() => toggleExpandedSection('sections')}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20">
              <Settings className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">2. Select Sections</h3>
              <p className="text-sm text-gray-400">
                {selectedSections.length} of {REPORT_SECTIONS.length} sections selected
              </p>
            </div>
          </div>
          {expandedSection === 'sections' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'sections' && (
          <div className="px-4 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">Required sections are always included</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSections(REPORT_SECTIONS.map((s) => s.id))}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Select All
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={() =>
                    setSelectedSections(REPORT_SECTIONS.filter((s) => s.required).map((s) => s.id))
                  }
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Required Only
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REPORT_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isSelected = selectedSections.includes(section.id);

                return (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    disabled={section.required}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    } ${section.required ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white font-medium">{section.label}</span>
                        {section.required && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GlowCard>

      {/* 3. Region Selection */}
      <GlowCard glowColor="green">
        <button
          onClick={() => toggleExpandedSection('regions')}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/20">
              <MapPin className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">3. Select Regions</h3>
              <p className="text-sm text-gray-400">
                {selectedRegions.length} region{selectedRegions.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          {expandedSection === 'regions' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'regions' && (
          <div className="px-4 pb-4 animate-fadeIn">
            {/* Predefined Regions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PREDEFINED_REGIONS.map((region) => {
                const isSelected = selectedRegions.includes(region.id);
                return (
                  <button
                    key={region.id}
                    onClick={() => toggleRegion(region.id)}
                    className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                      isSelected
                        ? 'border-green-500/50 bg-green-500/10 text-green-300'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {region.name}
                      {isSelected && <Check className="w-3.5 h-3.5 text-green-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Region */}
            <div className="border border-gray-700 rounded-xl p-3 bg-gray-800/30">
              <h4 className="text-sm text-gray-300 font-medium mb-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Custom Region
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={customRegion.name}
                  onChange={(e) => setCustomRegion({ ...customRegion, name: e.target.value })}
                  placeholder="Region name"
                  className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500/50"
                />
                <input
                  type="number"
                  value={customRegion.lat}
                  onChange={(e) => setCustomRegion({ ...customRegion, lat: e.target.value })}
                  placeholder="Latitude"
                  className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500/50"
                />
                <input
                  type="number"
                  value={customRegion.lng}
                  onChange={(e) => setCustomRegion({ ...customRegion, lng: e.target.value })}
                  placeholder="Longitude"
                  className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500/50"
                />
                <button
                  onClick={addCustomRegion}
                  disabled={!customRegion.name || !customRegion.lat || !customRegion.lng}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </GlowCard>

      {/* 4. Date Range & Format */}
      <GlowCard glowColor="blue">
        <button
          onClick={() => toggleExpandedSection('settings')}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">4. Date Range & Format</h3>
              <p className="text-sm text-gray-400">
                {dateRange.start} to {dateRange.end} • {selectedFormat.toUpperCase()}
              </p>
            </div>
          </div>
          {expandedSection === 'settings' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'settings' && (
          <div className="px-4 pb-4 space-y-4 animate-fadeIn">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-blue-500/50 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-blue-500/50 outline-none text-sm"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Output Format</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REPORT_FORMATS.map((format) => {
                  const FormatIcon = format.icon;
                  const isSelected = selectedFormat === format.id;

                  return (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                        isSelected
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                          : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <FormatIcon className="w-4 h-4" />
                      <span className="font-medium">{format.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Schedule</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SCHEDULE_OPTIONS.map((option) => {
                  const OptionIcon = option.icon;
                  const isSelected = schedule === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => setSchedule(option.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                        isSelected
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                          : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <OptionIcon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipients (shown for scheduled reports) */}
            {schedule !== 'none' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Recipients</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                    placeholder="Add email recipient"
                    className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-blue-500/50 outline-none text-sm"
                  />
                  <button
                    onClick={addRecipient}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recipients.map((email) => (
                      <span
                        key={email}
                        className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300"
                      >
                        <Mail className="w-3 h-3" />
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="text-gray-500 hover:text-red-400 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </GlowCard>

      {/* 5. Advanced Options */}
      <GlowCard glowColor="cyan">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20">
              <Settings className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">Advanced Options</h3>
              <p className="text-sm text-gray-400">Charts, maps, AI summary, confidence threshold</p>
            </div>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 animate-fadeIn">
            {/* Toggle options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  key: 'includeCharts',
                  label: 'Include Charts & Graphs',
                  desc: 'Risk trend, feature importance, and distribution charts',
                  value: includeCharts,
                  setter: setIncludeCharts,
                  icon: BarChart3,
                },
                {
                  key: 'includeMapSnapshots',
                  label: 'Include Map Snapshots',
                  desc: 'Static map images with risk overlays',
                  value: includeMapSnapshots,
                  setter: setIncludeMapSnapshots,
                  icon: Map,
                },
                {
                  key: 'aiSummary',
                  label: 'AI-Generated Summary',
                  desc: 'PyroSage AI executive summary and insights',
                  value: aiSummary,
                  setter: setAiSummary,
                  icon: Sparkles,
                },
                {
                  key: 'includeRawData',
                  label: 'Include Raw Data',
                  desc: 'Append raw data tables and CSV exports',
                  value: includeRawData,
                  setter: setIncludeRawData,
                  icon: Table,
                },
              ].map((option) => {
                const OptionIcon = option.icon;
                return (
                  <button
                    key={option.key}
                    onClick={() => option.setter(!option.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      option.value
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        option.value ? 'border-cyan-500 bg-cyan-500' : 'border-gray-600'
                      }`}
                    >
                      {option.value && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <OptionIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confidence Threshold Slider */}
            <div>
              <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Model Confidence Threshold</span>
                <span className="text-cyan-400 font-medium">
                  {(confidenceThreshold * 100).toFixed(0)}%
                </span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10% (Include all)</span>
                <span>100% (High confidence only)</span>
              </div>
            </div>
          </div>
        )}
      </GlowCard>

      {/* Summary & Generate Button */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-800/50 border border-gray-700 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-3">Report Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{selectedSections.length}</p>
            <p className="text-xs text-gray-400">Sections</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{selectedRegions.length}</p>
            <p className="text-xs text-gray-400">Regions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{selectedFormat.toUpperCase()}</p>
            <p className="text-xs text-gray-400">Format</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{estimatedTime()}</p>
            <p className="text-xs text-gray-400">Est. Time</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedSections.length === 0 || selectedRegions.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:shadow-none"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Report
              </>
            )}
          </button>

          <button
            onClick={() => onPreview?.({ selectedSections, selectedRegions, dateRange })}
            className="flex items-center justify-center gap-2 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-xl transition-colors"
          >
            <Eye className="w-5 h-5" />
            Preview
          </button>
        </div>
      </div>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Recent Reports
          </h3>
          <div className="space-y-2">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-xl p-3 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-700">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{report.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()} •{' '}
                      {report.format?.toUpperCase()} • {report.sections?.length} sections
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPreview?.(report)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="View report"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Download report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;