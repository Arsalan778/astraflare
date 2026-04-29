import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Download,
  Printer,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  X,
  Flame,
  Wind,
  TrendingUp,
  AlertTriangle,
  MapPin,
  BarChart3,
  Map,
  Shield,
  Users,
  Image,
  Table,
  Calendar,
  Clock,
  Eye,
  BookOpen,
  Layers,
  ExternalLink,
  Mail,
  MessageSquare,
  Sparkles,
  Info,
} from 'lucide-react';
import LoadingSpinner from '../Common/LoadingSpinner';
import RiskBadge from '../Common/RiskBadge';

const SECTION_ICONS = {
  executive_summary: FileText,
  risk_assessment: Flame,
  weather_analysis: Wind,
  prediction_results: TrendingUp,
  fire_spread_simulation: Map,
  historical_comparison: BarChart3,
  active_alerts: AlertTriangle,
  evacuation_analysis: Users,
  emissions_estimate: Wind,
  resource_allocation: Shield,
  satellite_imagery: Image,
  data_tables: Table,
};

const SECTION_LABELS = {
  executive_summary: 'Executive Summary',
  risk_assessment: 'Risk Assessment',
  weather_analysis: 'Weather Analysis',
  prediction_results: 'ML Prediction Results',
  fire_spread_simulation: 'Fire Spread Simulation',
  historical_comparison: 'Historical Comparison',
  active_alerts: 'Active Alerts',
  evacuation_analysis: 'Evacuation Analysis',
  emissions_estimate: 'Emissions Estimate',
  resource_allocation: 'Resource Allocation',
  satellite_imagery: 'Satellite Imagery',
  data_tables: 'Data Tables',
};

const ReportViewer = ({
  report,
  onClose,
  onDownload,
  onShare,
  onRegenerate,
  fullscreen: initialFullscreen = false,
}) => {
  const [activeSection, setActiveSection] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const contentRef = useRef(null);
  const sectionRefs = useRef({});

  const resolvedSections = (report?.sections || []).map((s) =>
    typeof s === 'string' ? s : s.id
  );

  useEffect(() => {
    if (report) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
        if (resolvedSections.length > 0) {
          setActiveSection(resolvedSections[0]);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [report]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose?.();
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'p') {
          e.preventDefault();
          handlePrint();
        }
        if (e.key === 'd') {
          e.preventDefault();
          handleDownload();
        }
      }
      if (e.key === 'ArrowRight') navigatePage('next');
      if (e.key === 'ArrowLeft') navigatePage('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  const scrollToSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handleScroll = () => {
      const entries = Object.entries(sectionRefs.current);
      for (const [id, ref] of entries) {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom > 200) {
            setActiveSection(id);
            const idx = resolvedSections.indexOf(id);
            if (idx !== -1) setCurrentPage(idx + 1);
            break;
          }
        }
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isLoading, resolvedSections]);

  const handleZoom = (direction) => {
    setZoom((prev) => {
      const next = direction === 'in' ? prev + 10 : prev - 10;
      return Math.min(Math.max(next, 50), 200);
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/reports/${report?.id}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handlePrint = () => window.print();
  const handleDownload = () => onDownload?.(report);
  const handleShareAction = (method) => {
    setShareMenuOpen(false);
    onShare?.(report, method);
  };

  const totalPages = resolvedSections.length || 1;

  const navigatePage = (direction) => {
    setCurrentPage((prev) => {
      const next = direction === 'next' ? prev + 1 : prev - 1;
      const clamped = Math.min(Math.max(next, 1), totalPages);
      const sectionId = resolvedSections[clamped - 1];
      if (sectionId) scrollToSection(sectionId);
      return clamped;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSectionContent = (sectionId) => {
    if (report?.content && report.content[sectionId]) {
      return report.content[sectionId];
    }
    return null;
  };

  /* ─── empty state ─── */
  if (!report) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg text-gray-400">No report selected</h3>
          <p className="text-sm text-gray-500 mt-1">
            Generate or select a report to view
          </p>
        </div>
      </div>
    );
  }

  /* ─── render ─── */
  return (
    <div
      className={`flex flex-col bg-gray-900 transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50'
          : 'rounded-2xl border border-gray-700 overflow-hidden h-[85vh]'
      }`}
    >
      {/* ═══════ Toolbar ═══════ */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur border-b border-gray-700 flex-shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-sm truncate">
              {report.title || 'Wildfire Analysis Report'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{formatDate(report.createdAt)}</span>
              {report.format && (
                <>
                  <span>•</span>
                  <span className="uppercase">{report.format}</span>
                </>
              )}
              {report.generatedBy && (
                <>
                  <span>•</span>
                  <span>by {report.generatedBy}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-1 mr-2 px-2 py-1 bg-gray-700/50 rounded-lg">
            <button
              onClick={() => handleZoom('out')}
              disabled={zoom <= 50}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-300 w-10 text-center">
              {zoom}%
            </span>
            <button
              onClick={() => handleZoom('in')}
              disabled={zoom >= 200}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 text-gray-400 hover:text-white transition-colors ml-1"
              title="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowTableOfContents(!showTableOfContents)}
            className={`p-2 rounded-lg transition-colors ${
              showTableOfContents
                ? 'text-orange-400 bg-orange-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Table of Contents"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Share dropdown */}
          <div className="relative">
            <button
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {shareMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShareMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 py-1 animate-fadeIn">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'Link copied!' : 'Copy link'}
                  </button>
                  <button
                    onClick={() => handleShareAction('email')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Send via email
                  </button>
                  <button
                    onClick={() => handleShareAction('slack')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Share to Slack
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ═══════ Body ═══════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar / Table of Contents ─── */}
        {showTableOfContents && (
          <aside className="w-64 border-r border-gray-700 bg-gray-800/40 overflow-y-auto flex-shrink-0 hidden md:block">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Table of Contents
              </h3>
              <nav className="space-y-1">
                {resolvedSections.map((sectionId, idx) => {
                  const Icon = SECTION_ICONS[sectionId] || FileText;
                  const isActive = activeSection === sectionId;
                  return (
                    <button
                      key={sectionId}
                      onClick={() => scrollToSection(sectionId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                        isActive
                          ? 'bg-orange-500/10 text-orange-300 border-l-2 border-orange-500'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {idx + 1}. {SECTION_LABELS[sectionId] || sectionId}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Report Metadata */}
              <div className="mt-6 pt-4 border-t border-gray-700 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Report Info
                </h4>

                {report.dateRange && (
                  <div className="text-xs text-gray-500">
                    <p className="text-gray-400 font-medium mb-0.5">Date Range</p>
                    <p>
                      {report.dateRange.start} → {report.dateRange.end}
                    </p>
                  </div>
                )}

                {report.regions && report.regions.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <p className="text-gray-400 font-medium mb-0.5">Regions</p>
                    <div className="flex flex-wrap gap-1">
                      {report.regions.map((r, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-700 rounded-full text-gray-300"
                        >
                          {r.name || r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {report.options?.confidenceThreshold && (
                  <div className="text-xs text-gray-500">
                    <p className="text-gray-400 font-medium mb-0.5">
                      Confidence Threshold
                    </p>
                    <p>{(report.options.confidenceThreshold * 100).toFixed(0)}%</p>
                  </div>
                )}

                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(report)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors mt-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Regenerate Report
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* ─── Main Content ─── */}
        <main
          ref={contentRef}
          className="flex-1 overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-gray-400 mt-4">Loading report…</p>
              </div>
            </div>
          ) : (
            <div
              className="max-w-4xl mx-auto py-8 px-6 transition-transform origin-top-left"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              {/* ── Cover / Title ── */}
              <header className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-xs font-medium mb-4">
                  <Flame className="w-3.5 h-3.5" />
                  AstraFlare Wildfire Intelligence
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                  {report.title || 'Wildfire Analysis Report'}
                </h1>
                {report.description && (
                  <p className="text-gray-400 max-w-xl mx-auto">
                    {report.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(report.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    {resolvedSections.length} sections
                  </span>
                  {report.regions?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {report.regions.length} region
                      {report.regions.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </header>

              <hr className="border-gray-700 mb-10" />

              {/* ── Sections ── */}
              {resolvedSections.map((sectionId, idx) => {
                const Icon = SECTION_ICONS[sectionId] || FileText;
                const label = SECTION_LABELS[sectionId] || sectionId;
                const content = getSectionContent(sectionId);

                return (
                  <section
                    key={sectionId}
                    ref={(el) => (sectionRefs.current[sectionId] = el)}
                    className="mb-12 scroll-mt-8"
                  >
                    {/* Section heading */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-medium">
                          Section {idx + 1}
                        </span>
                        <h2 className="text-xl font-bold text-white">
                          {label}
                        </h2>
                      </div>
                    </div>

                    {/* Section body */}
                    <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-6">
                      {content ? (
                        <SectionRenderer
                          sectionId={sectionId}
                          content={content}
                        />
                      ) : (
                        <PlaceholderSection sectionId={sectionId} />
                      )}
                    </div>
                  </section>
                );
              })}

              {/* ── Footer ── */}
              <footer className="mt-16 pt-6 border-t border-gray-700 text-center text-xs text-gray-500 space-y-1">
                <p>
                  Generated by <span className="text-orange-400">AstraFlare</span>{' '}
                  Wildfire Intelligence Platform
                </p>
                <p>
                  Report ID: {report.id || 'N/A'} •{' '}
                  {formatDate(report.createdAt)}
                </p>
                <p className="text-gray-600">
                  This report is auto-generated. Verify critical data with
                  official sources.
                </p>
              </footer>
            </div>
          )}
        </main>
      </div>

      {/* ═══════ Bottom Navigation Bar ═══════ */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 backdrop-blur border-t border-gray-700 flex-shrink-0">
        <button
          onClick={() => navigatePage('prev')}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <span className="text-sm text-gray-400">
          Section {currentPage} of {totalPages}
          {activeSection && (
            <span className="text-gray-500 ml-2">
              — {SECTION_LABELS[activeSection] || activeSection}
            </span>
          )}
        </span>

        <button
          onClick={() => navigatePage('next')}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-gray-700 transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Section Renderer — displays real content
   ═══════════════════════════════════════════ */
const SectionRenderer = ({ sectionId, content }) => {
  switch (sectionId) {
    case 'executive_summary':
      return <ExecutiveSummarySection content={content} />;
    case 'risk_assessment':
      return <RiskAssessmentSection content={content} />;
    case 'weather_analysis':
      return <WeatherAnalysisSection content={content} />;
    case 'prediction_results':
      return <PredictionResultsSection content={content} />;
    case 'active_alerts':
      return <ActiveAlertsSection content={content} />;
    case 'historical_comparison':
      return <HistoricalComparisonSection content={content} />;
    case 'evacuation_analysis':
      return <EvacuationAnalysisSection content={content} />;
    case 'emissions_estimate':
      return <EmissionsEstimateSection content={content} />;
    case 'data_tables':
      return <DataTablesSection content={content} />;
    default:
      return <GenericSection content={content} />;
  }
};

/* ── Executive Summary ── */
const ExecutiveSummarySection = ({ content }) => (
  <div className="space-y-4">
    {content.aiSummary && (
      <div className="flex items-start gap-3 bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
        <Sparkles className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-orange-400 font-semibold mb-1">
            AI-Generated Summary
          </p>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {content.aiSummary}
          </p>
        </div>
      </div>
    )}

    {content.keyFindings && content.keyFindings.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Key Findings
        </h4>
        <ul className="space-y-2">
          {content.keyFindings.map((finding, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm text-gray-300"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold mt-0.5">
                {idx + 1}
              </span>
              <span>{finding}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {content.overallRisk && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Overall Risk" value={content.overallRisk} color="red" />
        <StatCard
          label="Regions At Risk"
          value={content.regionsAtRisk ?? '—'}
          color="orange"
        />
        <StatCard
          label="Active Fires"
          value={content.activeFires ?? '—'}
          color="yellow"
        />
        <StatCard
          label="Confidence"
          value={
            content.modelConfidence
              ? `${(content.modelConfidence * 100).toFixed(0)}%`
              : '—'
          }
          color="blue"
        />
      </div>
    )}

    {content.narrative && (
      <p className="text-sm text-gray-400 leading-relaxed">
        {content.narrative}
      </p>
    )}
  </div>
);

/* ── Risk Assessment ── */
const RiskAssessmentSection = ({ content }) => (
  <div className="space-y-4">
    {content.regions && content.regions.length > 0 && (
      <div className="space-y-3">
        {content.regions.map((region, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-gray-700/30 border border-gray-700 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">{region.name}</p>
                {region.coordinates && (
                  <p className="text-xs text-gray-500">
                    {region.coordinates[1]?.toFixed(4)},{' '}
                    {region.coordinates[0]?.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {region.riskScore !== undefined && (
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    {typeof region.riskScore === 'number'
                      ? region.riskScore.toFixed(1)
                      : region.riskScore}
                  </p>
                  <p className="text-xs text-gray-500">Risk Score</p>
                </div>
              )}
              {region.riskLevel && <RiskBadge level={region.riskLevel} />}
            </div>
          </div>
        ))}
      </div>
    )}

    {content.factors && content.factors.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Contributing Factors
        </h4>
        <div className="space-y-2">
          {content.factors.map((factor, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-28 truncate">
                {factor.name}
              </span>
              <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                  style={{ width: `${(factor.importance || 0) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-300 w-12 text-right">
                {((factor.importance || 0) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {content.summary && (
      <p className="text-sm text-gray-400 leading-relaxed">{content.summary}</p>
    )}
  </div>
);

/* ── Weather Analysis ── */
const WeatherAnalysisSection = ({ content }) => (
  <div className="space-y-4">
    {content.current && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Temperature"
          value={`${content.current.temperature ?? '—'}°F`}
          color="red"
        />
        <StatCard
          label="Humidity"
          value={`${content.current.humidity ?? '—'}%`}
          color="blue"
        />
        <StatCard
          label="Wind Speed"
          value={`${content.current.windSpeed ?? '—'} mph`}
          color="cyan"
        />
        <StatCard
          label="Drought Index"
          value={content.current.droughtIndex ?? '—'}
          color="orange"
        />
      </div>
    )}

    {content.forecast && content.forecast.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          7-Day Forecast
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Temp</th>
                <th className="pb-2 pr-4">Humidity</th>
                <th className="pb-2 pr-4">Wind</th>
                <th className="pb-2">Fire Weather</th>
              </tr>
            </thead>
            <tbody>
              {content.forecast.map((day, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-700/50 text-gray-300"
                >
                  <td className="py-2 pr-4">{day.date}</td>
                  <td className="py-2 pr-4">{day.temperature}°F</td>
                  <td className="py-2 pr-4">{day.humidity}%</td>
                  <td className="py-2 pr-4">{day.windSpeed} mph</td>
                  <td className="py-2">
                    <RiskBadge level={day.fireWeather || 'low'} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {content.alerts && content.alerts.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Active Weather Alerts
        </h4>
        {content.alerts.map((alert, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-2"
          >
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-300">
                {alert.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {alert.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}

    {content.analysis && (
      <p className="text-sm text-gray-400 leading-relaxed">
        {content.analysis}
      </p>
    )}
  </div>
);

/* ── Prediction Results ── */
const PredictionResultsSection = ({ content }) => (
  <div className="space-y-4">
    {content.models && content.models.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Model Performance
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {content.models.map((model, idx) => (
            <div
              key={idx}
              className="bg-gray-700/30 border border-gray-700 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">{model.name}</p>
                <span className="text-xs text-gray-500">{model.type}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-orange-400">
                    {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Accuracy</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-400">
                    {model.precision
                      ? `${(model.precision * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Precision</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400">
                    {model.recall
                      ? `${(model.recall * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Recall</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {content.predictions && content.predictions.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Prediction Outputs
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-4">Region</th>
                <th className="pb-2 pr-4">Risk Score</th>
                <th className="pb-2 pr-4">Confidence</th>
                <th className="pb-2 pr-4">Timeframe</th>
                <th className="pb-2">Level</th>
              </tr>
            </thead>
            <tbody>
              {content.predictions.map((pred, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-700/50 text-gray-300"
                >
                  <td className="py-2 pr-4">{pred.region}</td>
                  <td className="py-2 pr-4 font-medium">
                    {pred.riskScore?.toFixed(2) ?? '—'}
                  </td>
                  <td className="py-2 pr-4">
                    {pred.confidence
                      ? `${(pred.confidence * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td className="py-2 pr-4">{pred.timeframe || '—'}</td>
                  <td className="py-2">
                    <RiskBadge level={pred.riskLevel || 'low'} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {content.explanation && (
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed">
            {content.explanation}
          </p>
        </div>
      </div>
    )}
  </div>
);

/* ── Active Alerts ── */
const ActiveAlertsSection = ({ content }) => {
  const severityColors = {
    critical: 'border-red-500/30 bg-red-500/5',
    high: 'border-orange-500/30 bg-orange-500/5',
    moderate: 'border-yellow-500/30 bg-yellow-500/5',
    low: 'border-green-500/30 bg-green-500/5',
  };

  return (
    <div className="space-y-3">
      {content.alerts && content.alerts.length > 0 ? (
        content.alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`border rounded-xl p-4 ${
              severityColors[alert.severity] || severityColors.low
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {alert.region} • {alert.issuedAt || 'N/A'}
                  </p>
                  {alert.description && (
                    <p className="text-sm text-gray-300 mt-2">
                      {alert.description}
                    </p>
                  )}
                </div>
              </div>
              <RiskBadge level={alert.severity || 'moderate'} />
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No active alerts at this time</p>
        </div>
      )}

      {content.summary && (
        <p className="text-sm text-gray-400 pt-2">{content.summary}</p>
      )}
    </div>
  );
};

/* ── Historical Comparison ── */
const HistoricalComparisonSection = ({ content }) => (
  <div className="space-y-4">
    {content.comparison && content.comparison.length > 0 && (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
              <th className="pb-2 pr-4">Period</th>
              <th className="pb-2 pr-4">Total Fires</th>
              <th className="pb-2 pr-4">Acres Burned</th>
              <th className="pb-2 pr-4">Avg Risk</th>
              <th className="pb-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {content.comparison.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-700/50 text-gray-300"
              >
                <td className="py-2 pr-4 font-medium">{row.period}</td>
                <td className="py-2 pr-4">{row.totalFires?.toLocaleString()}</td>
                <td className="py-2 pr-4">
                  {row.acresBurned?.toLocaleString()}
                </td>
                <td className="py-2 pr-4">{row.avgRisk?.toFixed(2)}</td>
                <td className="py-2">
                  <span
                    className={`text-xs font-medium ${
                      row.trend === 'up'
                        ? 'text-red-400'
                        : row.trend === 'down'
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '—'}{' '}
                    {row.trendValue || ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {content.insights && content.insights.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Insights</h4>
        <ul className="space-y-1.5">
          {content.insights.map((insight, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm text-gray-300"
            >
              <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {content.narrative && (
      <p className="text-sm text-gray-400 leading-relaxed">
        {content.narrative}
      </p>
    )}
  </div>
);

/* ── Evacuation Analysis ── */
const EvacuationAnalysisSection = ({ content }) => (
  <div className="space-y-4">
    {content.stats && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Population Affected"
          value={content.stats.populationAffected?.toLocaleString() ?? '—'}
          color="red"
        />
        <StatCard
          label="Evacuation Routes"
          value={content.stats.evacuationRoutes ?? '—'}
          color="blue"
        />
        <StatCard
          label="Shelters Available"
          value={content.stats.sheltersAvailable ?? '—'}
          color="green"
        />
        <StatCard
          label="Avg. Evac Time"
          value={content.stats.avgEvacTime ? `${content.stats.avgEvacTime} min` : '—'}
          color="orange"
        />
      </div>
    )}

    {content.routes && content.routes.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Recommended Routes
        </h4>
        <div className="space-y-2">
          {content.routes.map((route, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-700/30 border border-gray-700 rounded-lg p-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm text-white">{route.name}</p>
                  <p className="text-xs text-gray-500">
                    {route.distance} • {route.estimatedTime}
                  </p>
                </div>
              </div>
              <RiskBadge
                level={route.congestion || 'low'}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>
    )}

    {content.recommendations && (
      <p className="text-sm text-gray-400 leading-relaxed">
        {content.recommendations}
      </p>
    )}
  </div>
);

/* ── Emissions Estimate ── */
const EmissionsEstimateSection = ({ content }) => (
  <div className="space-y-4">
    {content.totals && (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="CO₂ Emissions"
          value={content.totals.co2 ? `${content.totals.co2} tons` : '—'}
          color="orange"
        />
        <StatCard
          label="PM2.5"
          value={content.totals.pm25 ? `${content.totals.pm25} µg/m³` : '—'}
          color="red"
        />
        <StatCard
          label="Area Affected"
          value={
            content.totals.areaAffected
              ? `${content.totals.areaAffected.toLocaleString()} acres`
              : '—'
          }
          color="yellow"
        />
      </div>
    )}

    {content.breakdown && content.breakdown.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Emissions Breakdown by Region
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-4">Region</th>
                <th className="pb-2 pr-4">CO₂ (tons)</th>
                <th className="pb-2 pr-4">PM2.5 (µg/m³)</th>
                <th className="pb-2">Vegetation Type</th>
              </tr>
            </thead>
            <tbody>
              {content.breakdown.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-700/50 text-gray-300"
                >
                  <td className="py-2 pr-4">{row.region}</td>
                  <td className="py-2 pr-4">{row.co2?.toLocaleString()}</td>
                  <td className="py-2 pr-4">{row.pm25}</td>
                  <td className="py-2">{row.vegetationType || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {content.healthImpact && (
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-400 font-semibold mb-1">
              Health Impact Assessment
            </p>
            <p className="text-sm text-gray-300">{content.healthImpact}</p>
          </div>
        </div>
      </div>
    )}
  </div>
);

/* ── Data Tables ── */
const DataTablesSection = ({ content }) => (
  <div className="space-y-4">
    {content.tables && content.tables.length > 0 ? (
      content.tables.map((table, tIdx) => (
        <div key={tIdx}>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            {table.title || `Table ${tIdx + 1}`}
          </h4>
          <div className="overflow-x-auto border border-gray-700 rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 bg-gray-700/50">
                  {table.headers?.map((header, hIdx) => (
                    <th key={hIdx} className="px-4 py-2 border-b border-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows?.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-gray-700/50 text-gray-300 hover:bg-gray-700/20"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))
    ) : (
      <div className="text-center py-8 text-gray-500">
        <Table className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>No raw data tables available</p>
      </div>
    )}

    {content.downloadLinks && content.downloadLinks.length > 0 && (
      <div className="flex flex-wrap gap-2 pt-2">
        {content.downloadLinks.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            download
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {link.label}
          </a>
        ))}
      </div>
    )}
  </div>
);

/* ── Generic / Fallback ── */
const GenericSection = ({ content }) => (
  <div className="space-y-3">
    {typeof content === 'string' ? (
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
        {content}
      </p>
    ) : content?.text ? (
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
        {content.text}
      </p>
    ) : content?.data ? (
      <pre className="text-xs text-gray-400 bg-gray-800 rounded-lg p-4 overflow-x-auto">
        {JSON.stringify(content.data, null, 2)}
      </pre>
    ) : (
      <div className="text-center py-8 text-gray-500">
        <Info className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Content for this section is being processed</p>
      </div>
    )}
  </div>
);

/* ── Placeholder (no real data) ── */
const PlaceholderSection = ({ sectionId }) => {
  const Icon = SECTION_ICONS[sectionId] || FileText;
  return (
    <div className="text-center py-10 text-gray-500">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p className="font-medium text-gray-400">
        {SECTION_LABELS[sectionId] || 'Section'}
      </p>
      <p className="text-sm mt-1">
        Data for this section was not included in the generated report.
      </p>
    </div>
  );
};

/* ── Reusable Stat Card ── */
const StatCard = ({ label, value, color = 'orange' }) => {
  const colorMap = {
    red: 'text-red-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-gray-700/30 border border-gray-700 rounded-xl p-3 text-center">
      <p className={`text-xl font-bold ${colorMap[color] || colorMap.orange}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
};

export default ReportViewer;