'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Upload,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  jobTitle?: string;
  status: string;
  unsubscribed: boolean;
  bounced: boolean;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // CSV Import State
  const [csvRaw, setCsvRaw] = useState('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    jobTitle: '',
  });
  const [importSummary, setImportSummary] = useState<{
    totalRows: number;
    validRows: number;
    imported: number;
    duplicates: number;
    invalidEmails: number;
    suppressed: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, search]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRaw(text);

      // Parse headers from first line
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map((h) => h.replace(/["\r]/g, '').trim());
      setDetectedHeaders(headers);

      // Auto-guess mapping
      const mapping = { email: '', firstName: '', lastName: '', company: '', jobTitle: '' };
      for (const h of headers) {
        const lower = h.toLowerCase();
        if (lower.includes('email') && !mapping.email) mapping.email = h;
        else if ((lower.includes('first') || lower === 'fname') && !mapping.firstName) mapping.firstName = h;
        else if ((lower.includes('last') || lower === 'lname') && !mapping.lastName) mapping.lastName = h;
        else if ((lower.includes('company') || lower.includes('org')) && !mapping.company) mapping.company = h;
        else if ((lower.includes('title') || lower.includes('role') || lower.includes('position')) && !mapping.jobTitle) mapping.jobTitle = h;
      }
      setColumnMapping(mapping);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!columnMapping.email) {
      alert('Please select which column contains the email address.');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'default',
          csvContent: csvRaw,
          mapping: columnMapping,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setImportSummary(data.summary);
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Lead Database</h2>
          <p className="text-sm text-slate-400 mt-1">
            Enriched B2B prospects with email validation, duplicate detection, and suppression handling.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportSummary(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search email, name, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="QUEUED">Queued</option>
            <option value="CONTACTED">Contacted</option>
            <option value="REPLIED">Replied</option>
            <option value="INTERESTED">Interested</option>
            <option value="MEETING_BOOKED">Meeting Booked</option>
            <option value="BOUNCED">Bounced</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3 px-6 font-medium">Contact</th>
                <th className="py-3 px-6 font-medium">Company</th>
                <th className="py-3 px-6 font-medium">Job Title</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium">Deliverability</th>
                <th className="py-3 px-6 font-medium text-right">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No leads found matching query.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-200">{l.fullName || l.firstName || 'Unnamed'}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{l.email}</div>
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-300">{l.company || '—'}</td>
                    <td className="py-3.5 px-6 text-slate-400">{l.jobTitle || '—'}</td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          l.status === 'INTERESTED' || l.status === 'MEETING_BOOKED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : l.status === 'REPLIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : l.status === 'CONTACTED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : l.status === 'UNSUBSCRIBED' || l.status === 'BOUNCED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      {l.unsubscribed ? (
                        <span className="text-rose-400 text-[11px]">Unsubscribed</span>
                      ) : l.bounced ? (
                        <span className="text-rose-400 text-[11px]">Bounced</span>
                      ) : (
                        <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-500 font-mono text-[11px]">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Importer Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Import Leads from CSV</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload a CSV file and map fields</p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {!importSummary ? (
                <>
                  {/* File Upload Box */}
                  <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-8 text-center bg-slate-950/40">
                    <FileSpreadsheet className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                    <label className="cursor-pointer">
                      <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm inline-block">
                        Choose CSV File
                      </span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-2">Comma-separated values with headers</p>
                  </div>

                  {/* Column Mapping Section */}
                  {detectedHeaders.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Map CSV Columns to Lead Fields
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">Email Address *</label>
                          <select
                            value={columnMapping.email}
                            onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                          >
                            <option value="">Select column...</option>
                            {detectedHeaders.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">First Name</label>
                          <select
                            value={columnMapping.firstName}
                            onChange={(e) => setColumnMapping({ ...columnMapping, firstName: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                          >
                            <option value="">(None)</option>
                            {detectedHeaders.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Company</label>
                          <select
                            value={columnMapping.company}
                            onChange={(e) => setColumnMapping({ ...columnMapping, company: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                          >
                            <option value="">(None)</option>
                            {detectedHeaders.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Job Title</label>
                          <select
                            value={columnMapping.jobTitle}
                            onChange={(e) => setColumnMapping({ ...columnMapping, jobTitle: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                          >
                            <option value="">(None)</option>
                            {detectedHeaders.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Import Summary Screen */
                <div className="space-y-4 text-center py-4">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">Import Complete!</h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Total Rows</span>
                      <div className="text-sm font-bold text-white mt-1">{importSummary.totalRows}</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 font-medium">Successfully Imported</span>
                      <div className="text-sm font-bold text-emerald-400 mt-1">{importSummary.imported}</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-amber-400 font-medium">Duplicates Filtered</span>
                      <div className="text-sm font-bold text-amber-400 mt-1">{importSummary.duplicates}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Filtered <strong>{importSummary.invalidEmails}</strong> invalid emails and <strong>{importSummary.suppressed}</strong> suppressed addresses.
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              {!importSummary ? (
                <>
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting || !csvRaw}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isImporting ? 'Processing...' : 'Run Import'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
