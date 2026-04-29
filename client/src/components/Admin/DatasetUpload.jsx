// client/src/components/Admin/DatasetUpload.jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  TableCellsIcon,
  TrashIcon,
  EyeIcon,
  InformationCircleIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../Common/LoadingSpinner';
import GlowCard from '../Common/GlowCard';

const ACCEPTED_TYPES = {
  'text/csv': '.csv',
  'application/json': '.json',
  'application/geo+json': '.geojson',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/x-parquet': '.parquet',
  'application/x-netcdf': '.nc',
};

const DATASET_CATEGORIES = [
  { value: 'weather', label: 'Weather Data' },
  { value: 'satellite', label: 'Satellite Imagery' },
  { value: 'terrain', label: 'Terrain / Topography' },
  { value: 'vegetation', label: 'Vegetation Index' },
  { value: 'historical_fires', label: 'Historical Fire Records' },
  { value: 'fuel_moisture', label: 'Fuel Moisture' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'custom', label: 'Custom' },
];

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/* ─── Upload Progress Item ─── */
const UploadItem = ({ file, progress, status, error, onRemove }) => (
  <div
    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
      status === 'error'
        ? 'bg-red-500/5 border-red-500/30'
        : status === 'complete'
        ? 'bg-emerald-500/5 border-emerald-500/30'
        : 'bg-gray-800/40 border-gray-700/50'
    }`}
  >
    <div
      className={`p-2 rounded-lg ${
        status === 'error'
          ? 'bg-red-500/20'
          : status === 'complete'
          ? 'bg-emerald-500/20'
          : 'bg-blue-500/20'
      }`}
    >
      <DocumentTextIcon
        className={`w-5 h-5 ${
          status === 'error'
            ? 'text-red-400'
            : status === 'complete'
            ? 'text-emerald-400'
            : 'text-blue-400'
        }`}
      />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-white font-medium truncate">{file.name}</p>
        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{formatFileSize(file.size)}</span>
      </div>

      {status === 'uploading' && (
        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status === 'validating' && (
        <div className="flex items-center gap-2">
          <ArrowPathIcon className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span className="text-xs text-blue-400">Validating…</span>
        </div>
      )}

      {status === 'complete' && (
        <div className="flex items-center gap-1">
          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400">Upload complete</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-1">
          <ExclamationCircleIcon className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">{error || 'Upload failed'}</span>
        </div>
      )}
    </div>

    <button
      onClick={onRemove}
      className="p-1 text-gray-500 hover:text-white transition-colors flex-shrink-0"
    >
      <XMarkIcon className="w-4 h-4" />
    </button>
  </div>
);

/* ─── Dataset Table Row ─── */
const DatasetRow = ({ dataset, onDelete, onPreview }) => (
  <tr className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <TableCellsIcon className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <p className="text-sm text-white font-medium">{dataset.name}</p>
          <p className="text-xs text-gray-500">{dataset.filename}</p>
        </div>
      </div>
    </td>
    <td className="px-4 py-3">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
        {dataset.category}
      </span>
    </td>
    <td className="px-4 py-3 text-sm text-gray-400">{formatFileSize(dataset.size)}</td>
    <td className="px-4 py-3 text-sm text-gray-400">
      {dataset.rowCount ? dataset.rowCount.toLocaleString() : '—'}
    </td>
    <td className="px-4 py-3 text-sm text-gray-400">
      {new Date(dataset.uploadedAt).toLocaleDateString()}
    </td>
    <td className="px-4 py-3">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          dataset.status === 'processed'
            ? 'bg-emerald-500/20 text-emerald-300'
            : dataset.status === 'processing'
            ? 'bg-yellow-500/20 text-yellow-300'
            : dataset.status === 'error'
            ? 'bg-red-500/20 text-red-300'
            : 'bg-gray-500/20 text-gray-400'
        }`}
      >
        {dataset.status}
      </span>
    </td>
    <td className="px-4 py-3">
      <div className="flex justify-end gap-1">
        <button
          onClick={() => onPreview(dataset)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
          title="Preview"
        >
          <EyeIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(dataset)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
);

/* ─── Main Component ─── */
export default function DatasetUpload() {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState([]); // { id, file, progress, status, error }
  const [category, setCategory] = useState('weather');
  const [description, setDescription] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const { data } = await adminAPI.getDatasets();
      setDatasets(data.datasets || []);
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFiles = (files) => {
    const fileArray = Array.from(files);
    const maxSize = 500 * 1024 * 1024; // 500MB

    const newUploads = fileArray.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      if (file.size > maxSize) {
        return { id, file, progress: 0, status: 'error', error: 'File exceeds 500MB limit' };
      }
      return { id, file, progress: 0, status: 'pending', error: null };
    });

    setUploads((prev) => [...prev, ...newUploads]);
    return newUploads.filter((u) => u.status === 'pending');
  };

  const uploadFile = async (uploadItem) => {
    const { id, file } = uploadItem;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('description', description);

    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: 'uploading', progress: 0 } : u))
    );

    try {
      await adminAPI.uploadDataset(formData, {
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
        },
      });

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: 'complete', progress: 100 } : u))
      );
      fetchDatasets();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Upload failed';
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'error', error: msg } : u)));
    }
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const pending = processFiles(e.dataTransfer.files);
        pending.forEach(uploadFile);
      }
    },
    [category, description]
  );

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const pending = processFiles(e.target.files);
      pending.forEach(uploadFile);
    }
    e.target.value = '';
  };

  const removeUpload = (id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const handleDeleteDataset = async (dataset) => {
    if (!window.confirm(`Delete dataset "${dataset.name}"?`)) return;
    try {
      await adminAPI.deleteDataset(dataset._id);
      fetchDatasets();
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  const handlePreview = async (dataset) => {
    try {
      const { data } = await adminAPI.previewDataset(dataset._id);
      setPreviewData({ ...dataset, preview: data });
    } catch (err) {
      console.error('Failed to preview dataset:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dataset Management</h2>
        <p className="text-gray-400 text-sm mt-1">
          Upload and manage training datasets for wildfire prediction models
        </p>
      </div>

      {/* Upload configuration */}
      <GlowCard>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Upload Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              >
                {DATASET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the dataset…"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-orange-500 bg-orange-500/5'
                : 'border-gray-700 hover:border-gray-500 bg-gray-800/20'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.json,.geojson,.xls,.xlsx,.parquet,.nc"
              onChange={handleFileInput}
              className="hidden"
            />

            <CloudArrowUpIcon
              className={`w-14 h-14 mx-auto mb-4 transition-colors ${
                dragActive ? 'text-orange-400' : 'text-gray-500'
              }`}
            />
            <p className="text-white font-medium text-lg">
              {dragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Supports CSV, JSON, GeoJSON, Excel, Parquet, NetCDF • Max 500MB per file
            </p>
          </div>

          {/* Upload queue */}
          {uploads.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300">Upload Queue</h4>
                <button
                  onClick={() => setUploads([])}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
              {uploads.map((u) => (
                <UploadItem
                  key={u.id}
                  file={u.file}
                  progress={u.progress}
                  status={u.status}
                  error={u.error}
                  onRemove={() => removeUpload(u.id)}
                />
              ))}
            </div>
          )}
        </div>
      </GlowCard>

      {/* Existing Datasets */}
      <GlowCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderOpenIcon className="w-5 h-5 text-orange-400" />
              Datasets ({datasets.length})
            </h3>
            <button
              onClick={fetchDatasets}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loadingDatasets ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingDatasets ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-12">
              <TableCellsIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No datasets uploaded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    {['Dataset', 'Category', 'Size', 'Rows', 'Uploaded', 'Status', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${
                            h === 'Actions' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds) => (
                    <DatasetRow
                      key={ds._id}
                      dataset={ds}
                      onDelete={handleDeleteDataset}
                      onPreview={handlePreview}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </GlowCard>

      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">{previewData.name} — Preview</h3>
              <button
                onClick={() => setPreviewData(null)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[65vh]">
              {previewData.preview?.columns && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">
                    Columns: {previewData.preview.columns.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {previewData.preview.columns.map((col) => (
                      <span
                        key={col}
                        className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-md border border-gray-700"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {previewData.preview?.rows && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {previewData.preview.columns?.map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-xs text-gray-400 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.rows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50">
                          {previewData.preview.columns?.map((col) => (
                            <td key={col} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}