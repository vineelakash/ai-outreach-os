'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Trash2,
  Pause,
  Play,
  X,
  Server,
  Key,
} from 'lucide-react';

interface Mailbox {
  id: string;
  email: string;
  displayName: string;
  providerType: string;
  status: string;
  dailyLimit: number;
  currentDaySent: number;
  totalSent: number;
  totalReplies: number;
  totalBounces: number;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // New Mailbox Form State
  const [providerType, setProviderType] = useState<'SMTP_IMAP' | 'MOCK' | 'GMAIL' | 'MICROSOFT_GRAPH'>('SMTP_IMAP');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dailyLimit, setDailyLimit] = useState(50);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [imapUser, setImapUser] = useState('');
  const [imapPass, setImapPass] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchMailboxes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mailboxes');
      if (res.ok) {
        const json = await res.json();
        setMailboxes(json.mailboxes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMailboxes();
  }, []);

  const handleTestConnection = async (mailboxId: string) => {
    try {
      setTestingId(mailboxId);
      const res = await fetch(`/api/mailboxes/${mailboxId}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.testResult?.success) {
        alert('✔ Connection test successful! Inbound and Outbound verified.');
      } else {
        alert(`❌ Connection test failed: ${data.testResult?.error || data.error}`);
      }
      fetchMailboxes();
    } catch (err: any) {
      alert(err.message || 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateMailbox = async () => {
    if (!email || !displayName) {
      alert('Email and display name are required');
      return;
    }

    try {
      setIsSaving(true);
      let credentials: Record<string, unknown> = {};

      if (providerType === 'SMTP_IMAP') {
        credentials = {
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpUser,
          smtpPass,
          imapHost,
          imapPort: Number(imapPort),
          imapUser: imapUser || smtpUser,
          imapPass: imapPass || smtpPass,
        };
      } else {
        credentials = { mock: true };
      }

      const res = await fetch('/api/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          displayName,
          organizationId: 'default',
          providerType,
          dailyLimit,
          credentials,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Mailbox connected successfully!');
      setIsModalOpen(false);
      fetchMailboxes();
    } catch (err: any) {
      alert(err.message || 'Failed to connect mailbox');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Mailbox Management</h2>
          <p className="text-sm text-slate-400 mt-1">
            Connect sender mailboxes with automatic rotational limits and AES-256-GCM encrypted credentials.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Connect Mailbox
        </button>
      </div>

      {/* Mailbox List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3 px-6 font-medium">Sender</th>
                <th className="py-3 px-6 font-medium">Provider</th>
                <th className="py-3 px-6 font-medium">Today&apos;s Quota</th>
                <th className="py-3 px-6 font-medium">Total Sent</th>
                <th className="py-3 px-6 font-medium">Replies</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading mailboxes...
                  </td>
                </tr>
              ) : mailboxes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No mailboxes connected. Click &quot;Connect Mailbox&quot; to add one.
                  </td>
                </tr>
              ) : (
                mailboxes.map((mb) => {
                  const percent = Math.min(100, Math.round((mb.currentDaySent / mb.dailyLimit) * 100));
                  return (
                    <tr key={mb.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-200 text-sm">{mb.displayName}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{mb.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[11px] font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                          {mb.providerType}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${percent > 85 ? 'bg-amber-500' : 'bg-blue-500'}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-slate-300 text-[11px]">
                            {mb.currentDaySent}/{mb.dailyLimit}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-300">{mb.totalSent}</td>
                      <td className="py-4 px-6 font-mono text-emerald-400 font-medium">{mb.totalReplies}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            mb.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {mb.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleTestConnection(mb.id)}
                          disabled={testingId === mb.id}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition inline-flex items-center gap-1"
                        >
                          <RotateCw className={`w-3 h-3 ${testingId === mb.id ? 'animate-spin' : ''}`} /> Test
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect Mailbox Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Connect New Mailbox</h3>
                <p className="text-xs text-slate-400 mt-0.5">Credentials are encrypted at rest with AES-256-GCM</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Provider Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProviderType('SMTP_IMAP')}
                    className={`p-2.5 rounded-lg border text-center transition ${
                      providerType === 'SMTP_IMAP'
                        ? 'bg-blue-600/10 border-blue-500 text-white font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Generic SMTP / IMAP
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderType('MOCK')}
                    className={`p-2.5 rounded-lg border text-center transition ${
                      providerType === 'MOCK'
                        ? 'bg-blue-600/10 border-blue-500 text-white font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Mock (Test / Dev)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sales@yourdomain.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Daily Sending Limit</label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value) || 50)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              {providerType === 'SMTP_IMAP' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h4 className="font-semibold text-slate-300">SMTP Settings (Outbound)</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Host (smtp.mail.com)"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Port (587)"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="SMTP Username"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                    />
                    <input
                      type="password"
                      placeholder="SMTP Password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                    />
                  </div>

                  <h4 className="font-semibold text-slate-300 pt-2">IMAP Settings (Inbound Reply Detection)</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Host (imap.mail.com)"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Port (993)"
                        value={imapPort}
                        onChange={(e) => setImapPort(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMailbox}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {isSaving ? 'Connecting...' : 'Connect & Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
