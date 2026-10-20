import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ArrowUpDown, Download, Eye, PlusCircle,
  AlertTriangle, CheckCircle, XCircle, FileText,
  Layers, X, Sparkles
} from 'lucide-react';
import { useInspectionStore, useToastStore } from '../store';
import {
  Inspection, formatDate, formatDuration,
  getStatusLabel, getResultLabel
} from '../types';

export const HistoryPage: React.FC = () => {
  const { inspections } = useInspectionStore();
  const { addToast } = useToastStore();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField] = useState<'createdAt' | 'processingTime'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  // Auto-open modal if id param or state selectedId is provided
  useEffect(() => {
    const targetId = id || (location.state as { selectedId?: string } | null)?.selectedId;
    if (targetId && inspections.length > 0) {
      const match = inspections.find((i) => i.id === targetId || i.id.startsWith(targetId));
      if (match) {
        setSelectedInspection(match);
      }
    }
  }, [id, location.state, inspections]);

  // Filter and sort
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      const matchesSearch =
        item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productCategory.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.productCategory === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => {
      if (sortField === 'createdAt') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const timeA = a.processingTime || 0;
        const timeB = b.processingTime || 0;
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
    });
  }, [inspections, searchQuery, statusFilter, categoryFilter, sortField, sortOrder]);

  const exportAllAsJSON = () => {
    if (filteredInspections.length === 0) {
      addToast({ type: 'warning', message: 'No inspection records to export.' });
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredInspections, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `netradrishti_inspections_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast({ type: 'success', message: `Exported ${filteredInspections.length} inspection records to JSON.` });
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Historical Audits
            </span>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: 'var(--stone-grey)', color: 'var(--secondary-text)' }}>
              {filteredInspections.length} recorded
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: 0 }}>
            Inspection History & Logs
          </h1>
          <p style={{ fontSize: 14, color: 'var(--secondary-text)', marginTop: 4, margin: 0 }}>
            Comprehensive telemetry, computer vision tool logs, and suspicious region manifests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={exportAllAsJSON}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Download size={15} />
            Export JSON
          </button>
          <Link
            to="/app/inspect"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <PlusCircle size={15} />
            Run Inspection
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--pure-white)',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
          <input
            type="text"
            placeholder="Search by filename, category, or audit ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 38px',
              borderRadius: 8,
              border: '1px solid var(--border-grey)',
              fontSize: 13,
              background: 'var(--warm-ivory)',
              color: 'var(--charcoal)',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-text)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} style={{ color: 'var(--secondary-text)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-grey)',
                fontSize: 13,
                background: 'var(--pure-white)',
                color: 'var(--charcoal)',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed (Clean)</option>
              <option value="review_required">Review Required</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-grey)',
              fontSize: 13,
              background: 'var(--pure-white)',
              color: 'var(--charcoal)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories</option>
            <option value="bottle">Bottles</option>
            <option value="metal_surface">Metal Surface</option>
            <option value="pcb">PCB Board</option>
            <option value="textile">Textile</option>
            <option value="packaging">Packaging</option>
          </select>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            title="Toggle sort direction"
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* Main Table / List */}
      {filteredInspections.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            background: 'var(--pure-white)',
            border: '1px dashed var(--border-grey)',
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--stone-grey)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Layers size={24} style={{ color: 'var(--secondary-text)' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
            {inspections.length === 0 ? 'No inspections have been run yet' : 'No inspections match your search criteria'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--secondary-text)', maxWidth: 420, margin: '0 auto 20px' }}>
            {inspections.length === 0
              ? 'Run your first adaptive visual quality inspection to populate agent tool traces, edge maps, and anomaly manifests.'
              : 'Try clearing your filters or search keywords to find the desired record.'}
          </p>
          {inspections.length === 0 ? (
            <Link to="/app/inspect" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={16} />
              Start New Inspection
            </Link>
          ) : (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}
              className="btn btn-secondary"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--pure-white)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--warm-ivory)', borderBottom: '1px solid var(--border-grey)', color: 'var(--secondary-text)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Inspection Target</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Profile & Category</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Decision Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Anomalies</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Processing Time</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((item) => {
                  const regionCount = item.result?.suspiciousRegions?.length || 0;
                  const isReview = item.status === 'review_required';
                  const isSuccess = item.status === 'completed' && regionCount === 0;

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        borderBottom: '1px solid var(--border-grey)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => setSelectedInspection(item)}
                    >
                      {/* Inspection Target */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              overflow: 'hidden',
                              background: 'var(--deep-black)',
                              border: '1px solid var(--border-grey)',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {item.productImageData ? (
                              <img
                                src={item.productImageData}
                                alt="Sample"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Layers size={18} style={{ color: 'var(--secondary-text)' }} />
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 13 }}>
                                {item.fileName || 'Product Sample'}
                              </span>
                              {item.source === 'live_camera' && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(24,61,48,0.1)',
                                  color: 'var(--deep-forest)',
                                  letterSpacing: '0.03em'
                                }}>
                                  LIVE CAMERA
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--secondary-text)' }}>
                              ID: {item.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Profile & Category */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--charcoal)', textTransform: 'capitalize' }}>
                          {item.productCategory.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--secondary-text)', textTransform: 'capitalize' }}>
                          {item.inspectionProfile} Profile
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: isSuccess
                              ? 'rgba(46, 125, 50, 0.1)'
                              : isReview
                              ? 'rgba(239, 108, 0, 0.1)'
                              : 'rgba(198, 40, 40, 0.1)',
                            color: isSuccess
                              ? '#2E7D32'
                              : isReview
                              ? '#EF6C00'
                              : '#C62828',
                          }}
                        >
                          {isSuccess && <CheckCircle size={13} />}
                          {isReview && <AlertTriangle size={13} />}
                          {!isSuccess && !isReview && <XCircle size={13} />}
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      {/* Anomalies */}
                      <td style={{ padding: '14px 20px' }}>
                        {regionCount > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>
                              {regionCount} detected
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'rgba(198, 40, 40, 0.1)',
                                color: '#C62828',
                                fontWeight: 600,
                              }}
                            >
                              FLAGGED
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--secondary-text)', fontSize: 12 }}>None detected</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '14px 20px', color: 'var(--charcoal)', fontFamily: 'monospace', fontSize: 12 }}>
                        {item.processingTime ? formatDuration(item.processingTime) : '—'}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 20px', color: 'var(--secondary-text)', fontSize: 12 }}>
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedInspection(item)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} />
                            View
                          </button>
                          <Link
                            to="/app/reports"
                            state={{ selectedId: item.id }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <FileText size={13} />
                            Report
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Inspection Detail Modal / Drawer */}
      <AnimatePresence>
        {selectedInspection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
            onClick={() => setSelectedInspection(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                width: '100%',
                maxWidth: 620,
                height: '100vh',
                background: 'var(--pure-white)',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border-grey)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--warm-ivory)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber-gold)', textTransform: 'uppercase' }}>
                    Inspection Trace Details
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--charcoal)' }}>
                    {selectedInspection.fileName}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedInspection(null)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--secondary-text)',
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 24 }}>
                {/* Image Inspection View with Bounding Boxes */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-text)', marginBottom: 8, textTransform: 'uppercase' }}>
                    Annotated Visual Inspection
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'var(--deep-black)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 280,
                    }}
                  >
                    {selectedInspection.annotatedImage || selectedInspection.result?.annotatedImage ? (
                      <img
                        src={selectedInspection.annotatedImage || selectedInspection.result?.annotatedImage}
                        alt="OpenCV Annotated Evidence"
                        style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', display: 'block' }}
                      />
                    ) : selectedInspection.productImageData ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={selectedInspection.productImageData}
                          alt="Annotated"
                          style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', display: 'block' }}
                        />
                        {/* Overlay Bounding Boxes */}
                        {selectedInspection.result?.suspiciousRegions.map((region, idx) => (
                          <div
                            key={region.id || idx}
                            style={{
                              position: 'absolute',
                              left: `${(region.boundingBox.x / 512) * 100}%`,
                              top: `${(region.boundingBox.y / 512) * 100}%`,
                              width: `${(region.boundingBox.width / 512) * 100}%`,
                              height: `${(region.boundingBox.height / 512) * 100}%`,
                              border: '2px solid #EF4444',
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                              pointerEvents: 'none',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: -20,
                                left: 0,
                                background: '#EF4444',
                                color: 'white',
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 3,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Region {idx + 1}: {region.severity.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--secondary-text)', fontSize: 13 }}>No preview image available</div>
                    )}
                  </div>
                </div>

                {/* Audit Verdict Banner */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background: selectedInspection.status === 'completed'
                      ? 'rgba(46, 125, 50, 0.08)'
                      : 'rgba(239, 108, 0, 0.08)',
                    border: `1px solid ${
                      selectedInspection.status === 'completed' ? 'rgba(46, 125, 50, 0.25)' : 'rgba(239, 108, 0, 0.25)'
                    }`,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: selectedInspection.status === 'completed' ? '#2E7D32' : '#D97706', marginBottom: 4 }}>
                    {selectedInspection.result ? getResultLabel(selectedInspection.result.type) : getStatusLabel(selectedInspection.status)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.5 }}>
                    {selectedInspection.result?.summary || 'Inspection pipeline completed.'}
                  </div>
                  <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.05)', color: 'var(--secondary-text)', fontWeight: 600 }}>
                    <Sparkles size={12} style={{ color: 'var(--amber-gold)' }} />
                    <span>Inspection Engine: {selectedInspection.result?.serviceName || (selectedInspection.result?.isDemoMode !== false ? 'Client-side Autonomous Engine (Demo Mode)' : 'FastAPI OpenCV Service')}</span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--warm-ivory)', border: '1px solid var(--border-grey)' }}>
                    <div style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Quality Score</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)' }}>
                      {selectedInspection.result?.imageQuality ? `${Math.round(selectedInspection.result.imageQuality.score * 100)}%` : '—'}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--warm-ivory)', border: '1px solid var(--border-grey)' }}>
                    <div style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Tool Steps</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)' }}>
                      {selectedInspection.events.length} tools
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--warm-ivory)', border: '1px solid var(--border-grey)' }}>
                    <div style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Duration</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)' }}>
                      {selectedInspection.processingTime ? formatDuration(selectedInspection.processingTime) : '—'}
                    </div>
                  </div>
                </div>

                {/* Agent Tool Execution Timeline */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-text)', marginBottom: 12, textTransform: 'uppercase' }}>
                    Agent Execution Telemetry
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedInspection.events.map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          border: '1px solid var(--border-grey)',
                          background: 'var(--pure-white)',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>
                            {idx + 1}. {evt.displayName}
                          </span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--secondary-text)', fontSize: 11 }}>
                            {evt.duration ? `${evt.duration}ms` : ''}
                          </span>
                        </div>
                        <div style={{ color: 'var(--secondary-text)', marginBottom: 6 }}>
                          {evt.description}
                        </div>
                        <div style={{ background: 'var(--warm-ivory)', padding: '6px 10px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: 'var(--charcoal)' }}>
                          <strong>Agent Reason:</strong> {evt.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suspicious Regions List */}
                {selectedInspection.result && selectedInspection.result.suspiciousRegions.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Flagged Surface Defects & Anomalies ({selectedInspection.result.suspiciousRegions.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedInspection.result.suspiciousRegions.map((reg, idx) => (
                        <div
                          key={reg.id || idx}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(198, 40, 40, 0.04)',
                            border: '1px solid rgba(198, 40, 40, 0.18)',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: '#C62828', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>Defect #{idx + 1}</span>
                              {reg.defectClass && (
                                <span style={{
                                  fontSize: 10,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: 'var(--forest-green)',
                                  color: 'var(--pure-white)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {reg.defectClass.replace('_', ' ')}
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: 'var(--secondary-text)', fontWeight: 500 }}>
                                ({reg.severity} severity)
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                              {reg.confidence !== undefined && (
                                <span style={{ color: 'var(--muted-brass)', fontWeight: 600 }}>
                                  {Math.round(reg.confidence * 100)}% conf
                                </span>
                              )}
                              <span style={{ color: 'var(--secondary-text)' }}>
                                Area: {Math.round(reg.area)} px²
                              </span>
                            </div>
                          </div>
                          <div style={{ color: 'var(--deep-charcoal)', fontSize: 12 }}>
                            {reg.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Objects Manifest (for Object Detection passes) */}
                {selectedInspection.result?.detectedObjects && selectedInspection.result.detectedObjects.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Detected Manufactured Objects ({selectedInspection.result.detectedObjects.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                      {selectedInspection.result.detectedObjects.map((obj, idx) => (
                        <div
                          key={obj.id || idx}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: 'rgba(23, 63, 53, 0.05)',
                            border: `1px solid ${
                              obj.material === 'metal'
                                ? 'rgba(46, 125, 50, 0.3)'
                                : obj.material === 'non_metal'
                                ? 'rgba(220, 38, 38, 0.3)'
                                : 'rgba(217, 119, 6, 0.3)'
                            }`,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--forest-green)', marginBottom: 4 }}>
                            <span>{obj.label}</span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                background:
                                  obj.material === 'metal'
                                    ? 'rgba(46, 125, 50, 0.12)'
                                    : obj.material === 'non_metal'
                                    ? 'rgba(220, 38, 38, 0.12)'
                                    : 'rgba(217, 119, 6, 0.12)',
                                color:
                                  obj.material === 'metal'
                                    ? '#2E7D32'
                                    : obj.material === 'non_metal'
                                    ? '#DC2626'
                                    : '#D97706',
                              }}
                            >
                              {obj.material === 'metal' ? 'Metal' : obj.material === 'non_metal' ? 'Non-Metal' : 'Uncertain'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--secondary-text)' }}>
                            <span>[x:{obj.boundingBox.x}, y:{obj.boundingBox.y}, w:{obj.boundingBox.width}, h:{obj.boundingBox.height}]</span>
                            <span style={{ color: 'var(--muted-brass)', fontFamily: 'monospace', fontWeight: 600 }}>
                              {Math.round(obj.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <Link
                    to="/app/reports"
                    state={{ selectedId: selectedInspection.id }}
                    className="btn btn-primary"
                    style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                  >
                    <FileText size={16} />
                    Generate Formal PDF Report
                  </Link>
                  <button
                    onClick={() => {
                      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedInspection, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute('href', dataStr);
                      downloadAnchor.setAttribute('download', `inspection_${selectedInspection.id}.json`);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={16} />
                    JSON
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default HistoryPage;
