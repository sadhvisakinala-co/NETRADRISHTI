import React, { useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  FileText, Download, Printer, CheckCircle, AlertTriangle,
  Award, BarChart3, ShieldCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useInspectionStore, useToastStore } from '../store';
import {
  Inspection, formatDate, formatDuration, getStatusLabel, getResultLabel
} from '../types';

export const ReportsPage: React.FC = () => {
  const { inspections, getStats } = useInspectionStore();
  const { addToast } = useToastStore();
  const location = useLocation();
  const initialId = (location.state as { selectedId?: string } | null)?.selectedId;

  // Selected inspection for report generation
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(
    initialId || (inspections[0]?.id ?? '')
  );

  const selectedInspection: Inspection | undefined = useMemo(() => {
    return inspections.find((i) => i.id === selectedInspectionId) || inspections[0];
  }, [inspections, selectedInspectionId]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const raw = getStats();
    const withDefects = inspections.filter(
      (i) => (i.result?.suspiciousRegions?.length || 0) > 0
    ).length;
    const clean = raw.completed - withDefects;
    const yieldRate = raw.total > 0 ? ((clean / raw.total) * 100).toFixed(1) : '100.0';
    const avgLatency =
      raw.total > 0
        ? Math.round(
            inspections.reduce((acc, curr) => acc + (curr.processingTime || 0), 0) /
              raw.total
          )
        : 0;
    return { ...raw, withDefects, clean, yieldRate, avgLatency };
  }, [inspections, getStats]);

  // PDF Generation with jsPDF
  const generatePDF = () => {
    if (!selectedInspection) {
      addToast({ type: 'warning', message: 'No inspection selected to export.' });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor = '#1F2421';

      // Header Banner
      doc.setFillColor(31, 36, 33);
      doc.rect(0, 0, 210, 32, 'F');

      // Champagne Gold Accent Bar
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 32, 210, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('NETRADRISHTI — PRODUCT INSPECTION REPORT', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(212, 175, 55);
      doc.text('Automated Vision Telemetry & Defect Evaluation Record', 14, 25);

      // Metadata Bar
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 18);
      doc.text(`Document ID: ND-${selectedInspection.id.slice(0, 8).toUpperCase()}`, 140, 24);

      // Section 1: Executive Verdict
      let y = 42;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text('1. EXECUTIVE VERDICT & DECISION', 14, y);

      y += 8;
      const isClean =
        selectedInspection.status === 'completed' &&
        (selectedInspection.result?.suspiciousRegions.length || 0) === 0;

      doc.setFillColor(isClean ? 240 : 254, isClean ? 248 : 243, isClean ? 240 : 235);
      doc.roundedRect(14, y, 182, 22, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(isClean ? '#2E7D32' : '#C62828');
      doc.text(
        selectedInspection.result
          ? getResultLabel(selectedInspection.result.type)
          : getStatusLabel(selectedInspection.status),
        20,
        y + 8
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(
        selectedInspection.result?.summary || 'Standard visual inspection sequence finished.',
        20,
        y + 15
      );

      // Section 2: Audit Target Metadata
      y += 32;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text('2. AUDIT TARGET INFORMATION', 14, y);

      y += 6;
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, y, 182, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('FILE IDENTIFIER', 20, y + 8);
      doc.text('PRODUCT CATEGORY', 70, y + 8);
      doc.text('INSPECTION PROFILE', 120, y + 8);
      doc.text('PROCESSING TIME', 160, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor);
      doc.text(selectedInspection.fileName || 'Sample', 20, y + 16);
      doc.text(selectedInspection.productCategory.replace('_', ' ').toUpperCase(), 70, y + 16);
      doc.text(selectedInspection.inspectionProfile.toUpperCase(), 120, y + 16);
      doc.text(
        selectedInspection.processingTime
          ? formatDuration(selectedInspection.processingTime)
          : '—',
        160,
        y + 16
      );

      // Section 3: Suspicious Regions / Anomaly Manifest
      y += 34;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text(
        `3. ANOMALY MANIFEST (${selectedInspection.result?.suspiciousRegions.length || 0} DETECTED)`,
        14,
        y
      );

      y += 6;
      if (!selectedInspection.result || selectedInspection.result.suspiciousRegions.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('No suspicious regions or surface defects were detected during analysis.', 20, y + 8);
        y += 16;
      } else {
        selectedInspection.result.suspiciousRegions.forEach((reg, i) => {
          doc.setFillColor(255, 245, 245);
          doc.roundedRect(14, y, 182, 14, 2, 2, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor('#C62828');
          const classStr = reg.defectClass ? ` [Class: ${reg.defectClass.toUpperCase()}]` : '';
          const confStr = reg.confidence !== undefined ? ` (Conf: ${Math.round(reg.confidence * 100)}%)` : '';
          doc.text(`Anomaly #${i + 1}${classStr} [Severity: ${reg.severity.toUpperCase()}]${confStr}`, 20, y + 6);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text(
            `Area: ${Math.round(reg.area)} px² | BBox: [x:${reg.boundingBox.x}, y:${reg.boundingBox.y}, w:${reg.boundingBox.width}, h:${reg.boundingBox.height}] — ${reg.description}`,
            20,
            y + 11
          );

          y += 17;
        });

        // Add Detected Objects if present
        if (selectedInspection.result.detectedObjects && selectedInspection.result.detectedObjects.length > 0) {
          y += 4;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(primaryColor);
          doc.text(`Identified Manufactured Objects (${selectedInspection.result.detectedObjects.length})`, 14, y);
          y += 6;
          selectedInspection.result.detectedObjects.slice(0, 5).forEach((obj, idx) => {
            doc.setFillColor(245, 248, 246);
            doc.roundedRect(14, y, 182, 10, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor('#173F35');
            doc.text(`${idx + 1}. ${obj.label} — Confidence: ${Math.round(obj.confidence * 100)}%`, 20, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(90, 90, 90);
            doc.text(`Box: [x:${obj.boundingBox.x}, y:${obj.boundingBox.y}, w:${obj.boundingBox.width}, h:${obj.boundingBox.height}]`, 110, y + 5);
            y += 12;
          });
        }
      }

      // Section 4: Agent Tool Execution Trace
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text('4. AGENT DECISION TELEMETRY & TOOL TRACE', 14, y);

      y += 6;
      selectedInspection.events.slice(0, 6).forEach((evt, idx) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(primaryColor);
        doc.text(`${idx + 1}. ${evt.displayName} (${evt.duration || 0}ms)`, 16, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        doc.text(`Agent Rationale: ${evt.reason}`, 20, y + 10);

        y += 13;
      });

      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 280, 196, 280);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      const engineLabel = selectedInspection.result?.serviceName || (selectedInspection.result?.isDemoMode !== false ? 'Client-side Autonomous Engine (Demo Mode)' : 'FastAPI OpenCV Engine');
      doc.text(
        `NETRADRISHTI — Product Inspection Report • Engine: ${engineLabel}`,
        14,
        286
      );
      doc.text('Page 1 of 1', 180, 286);

      // Save PDF
      doc.save(`NetraDrishti_Report_${selectedInspection.id.slice(0, 8)}.pdf`);
      addToast({ type: 'success', message: 'Inspection PDF report generated successfully!' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Failed to generate PDF document.' });
    }
  };

  const exportJSON = () => {
    if (!selectedInspection) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedInspection, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit_report_${selectedInspection.id.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast({ type: 'success', message: 'Inspection JSON package exported successfully.' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Inspection Intelligence & Audit
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '4px 0 0 0' }}>
            Product Inspection Reports
          </h1>
          <p style={{ fontSize: 14, color: 'var(--secondary-text)', marginTop: 4, margin: 0 }}>
            Generate auditable inspection reports, defect manifests, and vision telemetry sheets.
          </p>
        </div>

        {selectedInspection && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={exportJSON}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Download size={15} />
              Export JSON
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Printer size={15} />
              Print Report
            </button>
            <button
              onClick={generatePDF}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Download size={15} />
              Download PDF
            </button>
          </div>
        )}
      </div>

      {/* Aggregate Quality KPI Banner */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 8 }}>
          <div className="card" style={{ padding: 20, background: 'var(--pure-white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--secondary-text)' }}>First-Pass Yield</span>
              <Award size={18} style={{ color: 'var(--amber-gold)' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)' }}>{stats.yieldRate}%</div>
            <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={12} />
              {stats.clean} clean / {stats.total} total
            </div>
          </div>

          <div className="card" style={{ padding: 20, background: 'var(--pure-white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Defects Flagged</span>
              <AlertTriangle size={18} style={{ color: 'var(--error)' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)' }}>{stats.withDefects}</div>
            <div style={{ fontSize: 12, color: 'var(--secondary-text)', marginTop: 4 }}>
              Anomalous surface regions
            </div>
          </div>

          <div className="card" style={{ padding: 20, background: 'var(--pure-white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Review Escalations</span>
              <ShieldCheck size={18} style={{ color: 'var(--warning)' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)' }}>{stats.reviewRequired}</div>
            <div style={{ fontSize: 12, color: 'var(--secondary-text)', marginTop: 4 }}>
              Adaptive human referrals
            </div>
          </div>

          <div className="card" style={{ padding: 20, background: 'var(--pure-white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Average Latency</span>
              <BarChart3 size={18} style={{ color: 'var(--info)' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)' }}>
              {formatDuration(stats.avgLatency)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--secondary-text)', marginTop: 4 }}>
              Total pipeline runtime
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--secondary-text)', paddingLeft: 4 }}>
          * Metrics derived from {stats.total} recorded inspection{stats.total === 1 ? '' : 's'}. Values reflect internal algorithmic benchmarks across saved sessions.
        </div>
      </div>

      {/* Target Selector Selector */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, background: 'var(--pure-white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} style={{ color: 'var(--amber-gold)' }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>Select Target Audit Record:</span>
          </div>

          <div style={{ minWidth: 300 }}>
            {inspections.length === 0 ? (
              <span style={{ fontSize: 13, color: 'var(--secondary-text)' }}>No records available.</span>
            ) : (
              <select
                value={selectedInspectionId}
                onChange={(e) => setSelectedInspectionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-grey)',
                  fontSize: 13,
                  background: 'var(--warm-ivory)',
                  color: 'var(--charcoal)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {inspections.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fileName} ({i.productCategory.replace('_', ' ')}) — {formatDate(i.createdAt)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Report Document Preview Sheet */}
      {selectedInspection ? (
        <div
          className="card"
          id="printable-report"
          style={{
            padding: 40,
            background: 'var(--pure-white)',
            border: '1px solid var(--border-grey)',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
            marginBottom: 40,
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid var(--deep-black)',
              paddingBottom: 24,
              marginBottom: 32,
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--deep-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--amber-gold)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--deep-black)', letterSpacing: '-0.02em' }}>
                    NETRADRISHTI
                  </h2>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Product Inspection Report
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--secondary-text)' }}>
              <div><strong style={{ color: 'var(--charcoal)' }}>Audit Record ID:</strong> {selectedInspection.id}</div>
              <div><strong style={{ color: 'var(--charcoal)' }}>Generated Date:</strong> {formatDate(selectedInspection.createdAt)}</div>
              <div><strong style={{ color: 'var(--charcoal)' }}>Method:</strong> Algorithmic Tolerance & Template Alignment</div>
            </div>
          </div>

          {/* Verdict Banner */}
          <div
            style={{
              padding: 20,
              borderRadius: 8,
              background:
                selectedInspection.status === 'completed'
                  ? 'rgba(46, 125, 50, 0.08)'
                  : 'rgba(239, 108, 0, 0.08)',
              border: `1px solid ${
                selectedInspection.status === 'completed' ? '#2E7D32' : '#D97706'
              }`,
              marginBottom: 32,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: selectedInspection.status === 'completed' ? '#2E7D32' : '#D97706', marginBottom: 4 }}>
              Inspection Decision
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--charcoal)' }}>
              {selectedInspection.result ? getResultLabel(selectedInspection.result.type) : getStatusLabel(selectedInspection.status)}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--secondary-text)', margin: '6px 0 0 0' }}>
              {selectedInspection.result?.summary || 'Full pipeline executed.'}
            </p>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <div style={{ padding: 14, borderRadius: 8, background: 'var(--warm-ivory)', border: '1px solid var(--border-grey)' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Sample Identifier</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginTop: 4 }}>{selectedInspection.fileName}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 8, background: 'var(--warm-ivory)', border: '1px solid var(--border-grey)' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Inspection Source</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginTop: 4, textTransform: 'capitalize' }}>
                {selectedInspection.source === 'live_camera' ? 'Live Webcam Stream' : 'Image Upload'}
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 8, background: 'var(--warm-ivory)', border: '1px solid var(--border-grey)' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Product Class</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginTop: 4, textTransform: 'capitalize' }}>
                {selectedInspection.productCategory.replace('_', ' ')}
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 8, background: 'var(--warm-ivory)', border: '1px solid var(--border-grey)' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Execution Latency</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginTop: 4 }}>
                {selectedInspection.processingTime ? formatDuration(selectedInspection.processingTime) : '—'}
              </div>
            </div>
          </div>

          {/* Visual Evidence Comparison */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>
              Visual Evidence Snapshot
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div style={{ border: '1px solid var(--border-grey)', borderRadius: 8, overflow: 'hidden', background: 'var(--deep-black)', textAlign: 'center' }}>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>
                  Target Image (Inspection Item)
                </div>
                {selectedInspection.productImageData ? (
                  <img
                    src={selectedInspection.productImageData}
                    alt="Target"
                    style={{ maxHeight: 240, width: '100%', objectFit: 'contain', padding: 8 }}
                  />
                ) : (
                  <div style={{ padding: 40, color: 'var(--secondary-text)', fontSize: 13 }}>No preview image</div>
                )}
              </div>

              {(selectedInspection.annotatedImage || selectedInspection.result?.annotatedImage) && (
                <div style={{ border: '1px solid var(--border-grey)', borderRadius: 8, overflow: 'hidden', background: 'var(--deep-black)', textAlign: 'center' }}>
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>
                    OpenCV Annotated Evidence
                  </div>
                  <img
                    src={selectedInspection.annotatedImage || selectedInspection.result?.annotatedImage}
                    alt="OpenCV Annotated"
                    style={{ maxHeight: 240, width: '100%', objectFit: 'contain', padding: 8 }}
                  />
                </div>
              )}

              {selectedInspection.referenceImageData && (
                <div style={{ border: '1px solid var(--border-grey)', borderRadius: 8, overflow: 'hidden', background: 'var(--deep-black)', textAlign: 'center' }}>
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>
                    Golden Reference Standard
                  </div>
                  <img
                    src={selectedInspection.referenceImageData}
                    alt="Reference"
                    style={{ maxHeight: 240, width: '100%', objectFit: 'contain', padding: 8 }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Anomaly Manifest Table */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>
              Defect Region Manifest
            </h4>
            {selectedInspection.result && selectedInspection.result.suspiciousRegions.length > 0 ? (
              <div style={{ border: '1px solid var(--border-grey)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                  <thead style={{ background: 'var(--warm-ivory)', borderBottom: '1px solid var(--border-grey)' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>#</th>
                      <th style={{ padding: '10px 14px' }}>Category</th>
                      <th style={{ padding: '10px 14px' }}>Bounding Box</th>
                      <th style={{ padding: '10px 14px' }}>Area (px²)</th>
                      <th style={{ padding: '10px 14px' }}>Severity</th>
                      <th style={{ padding: '10px 14px' }}>Classification Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInspection.result.suspiciousRegions.map((reg, idx) => (
                      <tr key={reg.id || idx} style={{ borderBottom: '1px solid var(--border-grey)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: 'var(--forest-green)',
                            color: 'var(--pure-white)',
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {reg.defectClass ? reg.defectClass.replace('_', ' ') : 'DEFECT'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>
                          [{reg.boundingBox.x}, {reg.boundingBox.y}, {reg.boundingBox.width}, {reg.boundingBox.height}]
                        </td>
                        <td style={{ padding: '10px 14px' }}>{Math.round(reg.area)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#C62828', fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>
                            {reg.severity}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--secondary-text)' }}>
                          {reg.description}
                          {reg.confidence !== undefined && (
                            <span style={{ marginLeft: 6, color: 'var(--muted-brass)', fontWeight: 600 }}>
                              ({Math.round(reg.confidence * 100)}% conf)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 16, background: 'var(--warm-ivory)', borderRadius: 8, fontSize: 13, color: 'var(--secondary-text)' }}>
                No suspicious regions or surface anomalies were detected during the multi-tool evaluation.
              </div>
            )}

            {/* Detected Objects Table */}
            {selectedInspection.result?.detectedObjects && selectedInspection.result.detectedObjects.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest-green)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                  Identified Manufactured Components ({selectedInspection.result.detectedObjects.length})
                </h5>
                <div style={{ border: '1px solid var(--border-grey)', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                    <thead style={{ background: 'var(--warm-ivory)', borderBottom: '1px solid var(--border-grey)' }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>#</th>
                        <th style={{ padding: '8px 12px' }}>Object Class</th>
                        <th style={{ padding: '8px 12px' }}>Material</th>
                        <th style={{ padding: '8px 12px' }}>Model Confidence</th>
                        <th style={{ padding: '8px 12px' }}>Local Bounding Box</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInspection.result.detectedObjects.map((obj, idx) => (
                        <tr key={obj.id || idx} style={{ borderBottom: '1px solid var(--border-grey)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--forest-green)' }}>{obj.label}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
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
                                border: `1px solid ${
                                  obj.material === 'metal'
                                    ? '#2E7D32'
                                    : obj.material === 'non_metal'
                                    ? '#DC2626'
                                    : '#D97706'
                                }`,
                              }}
                            >
                              {obj.material === 'metal'
                                ? '● Metal'
                                : obj.material === 'non_metal'
                                ? '● Non-Metal'
                                : '● Uncertain'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted-brass)', fontWeight: 700 }}>{Math.round(obj.confidence * 100)}%</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--secondary-text)' }}>
                            [x:{obj.boundingBox.x}, y:{obj.boundingBox.y}, w:{obj.boundingBox.width}, h:{obj.boundingBox.height}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Signoff block */}
          <div style={{ borderTop: '1px solid var(--border-grey)', paddingTop: 24, marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Automated Decision Engine</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginTop: 2 }}>
                {selectedInspection.result?.serviceName || (selectedInspection.result?.isDemoMode !== false ? 'Autonomous Client Engine (Demo Mode)' : 'FastAPI Native OpenCV Service')}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ borderBottom: '1px solid var(--charcoal)', width: 180, marginBottom: 4 }}></div>
              <div style={{ fontSize: 11, color: 'var(--secondary-text)' }}>QA Lead / System Sign-off</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 40, textAlign: 'center', background: 'var(--pure-white)' }}>
          <p style={{ color: 'var(--secondary-text)', fontSize: 14 }}>
            No inspection has been recorded yet to generate a report.
          </p>
          <Link to="/app/inspect" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Run New Inspection
          </Link>
        </div>
      )}
    </div>
  );
};
export default ReportsPage;
