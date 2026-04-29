import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline';
import adminAPI from '@api/admin';
import ReportGenerator from '@components/Reports/ReportGenerator';
import ReportViewer from '@components/Reports/ReportViewer';
import GlowCard from '@components/Common/GlowCard';
import LoadingSpinner from '@components/Common/LoadingSpinner';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await adminAPI.getReports();
      setReports(data.reports || data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportGenerated = (newReport) => {
    setReports((prev) => [newReport, ...prev]);
    setShowGenerator(false);
    setSelectedReport(newReport);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DocumentTextIcon className="w-6 h-6 text-emerald-400" />
            </div>
            Reports
          </h1>
          <p className="text-dark-400 mt-1">
            Generate and view wildfire risk analysis reports.
          </p>
        </div>
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New Report
        </button>
      </motion.div>

      {/* Report Generator */}
      {showGenerator && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <GlowCard className="p-6">
            <ReportGenerator
              onGenerated={handleReportGenerated}
              onCancel={() => setShowGenerator(false)}
            />
          </GlowCard>
        </motion.div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider">
            Generated Reports
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedReport?.id === report.id
                      ? 'bg-primary-500/10 border-primary-500/30 text-white'
                      : 'bg-dark-800/60 border-dark-700/50 text-dark-300 hover:bg-dark-800 hover:text-white'
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {report.title || `Report #${report.id}`}
                  </div>
                  <div className="text-xs text-dark-500 mt-1">
                    {new Date(report.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <GlowCard className="p-6 text-center">
              <DocumentTextIcon className="w-10 h-10 text-dark-500 mx-auto mb-2" />
              <p className="text-dark-400 text-sm">
                No reports yet. Click "New Report" to generate one.
              </p>
            </GlowCard>
          )}
        </div>

        {/* Report Viewer */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <ReportViewer report={selectedReport} />
          ) : (
            <GlowCard className="p-12 text-center">
              <DocumentTextIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-dark-400">
                Select a report to view
              </h3>
              <p className="text-dark-500 mt-1 text-sm">
                Choose from the list on the left or generate a new report.
              </p>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  );
}