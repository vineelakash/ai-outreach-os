'use client';

import { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Trash2,
  Shield,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';

interface Domain {
  id: string;
  domainName: string;
  spfStatus: boolean;
  spfRecord?: string;
  dkimStatus: boolean;
  dkimRecord?: string;
  dmarcStatus: boolean;
  dmarcRecord?: string;
  healthScore: number;
  healthStatus: string;
  lastCheckedAt?: string;
  mailboxes: Array<{
    id: string;
    email: string;
    totalSent: number;
    totalReplies: number;
  }>;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [selectedGuideDomain, setSelectedGuideDomain] = useState<Domain | null>(null);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/domains');
      if (res.ok) {
        const json = await res.json();
        setDomains(json.domains || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleVerifyDns = async (domainId: string) => {
    try {
      setVerifyingId(domainId);
      const res = await fetch(`/api/domains/${domainId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`DNS Verified! Health Score: ${data.dnsResult?.healthScore || 0}/100`);
        fetchDomains();
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (err: any) {
      alert(err.message || 'Verification error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return;
    try {
      setAddingDomain(true);
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainName: newDomainName,
          organizationId: 'default',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsAddModalOpen(false);
      setNewDomainName('');
      fetchDomains();
    } catch (err: any) {
      alert(err.message || 'Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Domain Deliverability Suite</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real DNS queries (SPF, DKIM, DMARC) with automated deliverability health scoring.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </button>
      </div>

      {/* Domain Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
            Querying DNS records...
          </div>
        ) : domains.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
            No domains registered. Click &quot;Add Domain&quot; to inspect your sending DNS records.
          </div>
        ) : (
          domains.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-teal-400" />
                    <h3 className="font-semibold text-white text-base">{d.domainName}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      d.healthScore >= 80
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : d.healthScore >= 50
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    Score: {d.healthScore}/100
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  {/* SPF */}
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">SPF</span>
                    <span
                      className={`text-[11px] font-bold mt-1 inline-block ${
                        d.spfStatus ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {d.spfStatus ? 'Active' : 'Missing'}
                    </span>
                  </div>

                  {/* DKIM */}
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">DKIM</span>
                    <span
                      className={`text-[11px] font-bold mt-1 inline-block ${
                        d.dkimStatus ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {d.dkimStatus ? 'Active' : 'Missing'}
                    </span>
                  </div>

                  {/* DMARC */}
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">DMARC</span>
                    <span
                      className={`text-[11px] font-bold mt-1 inline-block ${
                        d.dmarcStatus ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {d.dmarcStatus ? 'Active' : 'Missing'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-400 space-y-1">
                  <div>Mailboxes: <strong className="text-slate-200">{d.mailboxes?.length || 0}</strong></div>
                  <div>Last Checked: <span className="font-mono text-slate-500 text-[11px]">{d.lastCheckedAt ? new Date(d.lastCheckedAt).toLocaleTimeString() : 'Never'}</span></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedGuideDomain(d)}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5" /> DNS Guide
                </button>
                <button
                  onClick={() => handleVerifyDns(d.id)}
                  disabled={verifyingId === d.id}
                  className="px-3 py-1.5 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 text-xs rounded-lg font-medium transition flex items-center gap-1"
                >
                  <RotateCw className={`w-3 h-3 ${verifyingId === d.id ? 'animate-spin' : ''}`} />
                  Verify DNS
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Sending Domain</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Enter your root domain (e.g. <code>acmegrowth.com</code>). We will perform real DNS queries for SPF, DKIM, and DMARC TXT records.
            </p>
            <input
              type="text"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              placeholder="acmegrowth.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDomain}
                disabled={addingDomain || !newDomainName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {addingDomain ? 'Verifying...' : 'Add & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DNS Configuration Guidance Drawer/Modal */}
      {selectedGuideDomain && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">DNS Setup: {selectedGuideDomain.domainName}</h3>
              <button onClick={() => setSelectedGuideDomain(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Configure these standard DNS TXT records with your DNS provider (Cloudflare, Namecheap, Route 53) to maximize inbox placement.
            </p>

            <div className="space-y-4 text-xs font-mono">
              {/* SPF Box */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] font-sans font-semibold text-slate-300 block">1. SPF Record (TXT @)</span>
                <code className="text-blue-400 block bg-slate-900 p-2 rounded text-[11px] break-all">
                  v=spf1 include:_spf.google.com ~all
                </code>
              </div>

              {/* DKIM Box */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] font-sans font-semibold text-slate-300 block">2. DKIM Record (TXT google._domainkey)</span>
                <code className="text-emerald-400 block bg-slate-900 p-2 rounded text-[11px] break-all">
                  v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...
                </code>
              </div>

              {/* DMARC Box */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] font-sans font-semibold text-slate-300 block">3. DMARC Record (TXT _dmarc)</span>
                <code className="text-purple-400 block bg-slate-900 p-2 rounded text-[11px] break-all">
                  v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@{selectedGuideDomain.domainName}
                </code>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedGuideDomain(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
