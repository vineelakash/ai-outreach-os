'use client';

import { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2,
  Mail,
  Users,
  Settings2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  timezone: string;
  startHour: number;
  endHour: number;
  dailyLimit: number;
  replyAutomationMode: string;
  createdAt: string;
  _count: {
    campaignLeads: number;
    emailThreads: number;
  };
  campaignMailboxes: Array<{
    mailbox: {
      id: string;
      email: string;
      displayName: string;
      status: string;
    };
  }>;
  sequences: Array<{
    steps: Array<{
      id: string;
      stepNumber: number;
      delayDays: number;
      subject: string;
      body: string;
      enableAiPersonalize: boolean;
    }>;
  }>;
}

interface Mailbox {
  id: string;
  email: string;
  displayName: string;
  status: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  // New Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [dailyLimit, setDailyLimit] = useState(100);
  const [replyMode, setReplyMode] = useState<'MANUAL' | 'SEMI_AUTOMATIC' | 'AUTOMATIC'>('MANUAL');
  const [aiProvider, setAiProvider] = useState<'OPENAI' | 'GEMINI' | 'ANTHROPIC' | 'MOCK'>('OPENAI');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [sequenceSteps, setSequenceSteps] = useState([
    {
      stepNumber: 1,
      delayDays: 0,
      subject: 'Quick question regarding {{company}}',
      body: 'Hi {{firstName}},\n\nI noticed your work at {{company}}. We help teams streamline their outbound operations.\n\nWould you be open to a 10-minute chat this Thursday?\n\nBest,\n{{senderName}}',
      enableAiPersonalize: true,
    },
    {
      stepNumber: 2,
      delayDays: 3,
      subject: 'Re: Quick question regarding {{company}}',
      body: 'Hi {{firstName}},\n\nFollowing up on my previous note. Thought you might find value in how similar teams improved delivery rates by 40%.\n\nLet me know if you have a few minutes.\n\nBest,\n{{senderName}}',
      enableAiPersonalize: false,
    },
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campRes, mbRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/mailboxes'),
      ]);
      if (campRes.ok) {
        const json = await campRes.json();
        setCampaigns(json.campaigns || []);
      }
      if (mbRes.ok) {
        const json = await mbRes.json();
        setMailboxes(json.mailboxes || []);
        if (json.mailboxes?.length > 0 && selectedMailboxIds.length === 0) {
          setSelectedMailboxIds([json.mailboxes[0].id]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLaunch = async (campaignId: string) => {
    if (!confirm('Launch campaign and enqueue sequence emails?')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/campaigns/${campaignId}/launch`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message || 'Campaign launched!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to launch');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async (campaignId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/campaigns/${campaignId}/pause`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      setActionLoading(true);
      // Derive organization ID from existing mailbox or demo
      const orgId = mailboxes[0]?.id ? campaigns[0]?.id ? 'default' : 'default' : 'default';

      const payload = {
        name: campaignName,
        description: campaignDesc,
        organizationId: 'default',
        timezone,
        dailyLimit,
        replyAutomationMode: replyMode,
        aiProvider,
        aiModel,
        mailboxIds: selectedMailboxIds,
        steps: sequenceSteps,
      };

      // Ensure organizationId is fetched if available
      const camps = await fetch('/api/campaigns');
      const campsData = await camps.json();
      if (campsData.campaigns?.[0]?.organizationId) {
        payload.organizationId = campsData.campaigns[0].organizationId;
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to create campaign');
      }

      setIsBuilderOpen(false);
      setStep(1);
      setCampaignName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save campaign');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Outbound Campaigns</h2>
          <p className="text-sm text-slate-400 mt-1">
            Build multi-step cold email sequences with AI personalization and smart reply stops.
          </p>
        </div>
        <button
          onClick={() => {
            setIsBuilderOpen(true);
            setStep(1);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3 px-6 font-medium">Campaign</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium">Senders</th>
                <th className="py-3 px-6 font-medium">Leads</th>
                <th className="py-3 px-6 font-medium">Steps</th>
                <th className="py-3 px-6 font-medium">AI Mode</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No campaigns created yet. Click &quot;Create Campaign&quot; to begin.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-200 text-sm">{camp.name}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-xs">{camp.description || 'No description'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          camp.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : camp.status === 'PAUSED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-slate-300 font-mono">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{camp.campaignMailboxes.length} mailboxes</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-slate-300 font-mono">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{camp._count.campaignLeads} leads</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-slate-300 font-mono">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>{camp.sequences[0]?.steps.length || 0} steps</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
                        {camp.replyAutomationMode}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {camp.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handlePause(camp.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 text-xs rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition inline-flex items-center gap-1"
                        >
                          <Pause className="w-3 h-3" /> Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLaunch(camp.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 text-xs rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Launch
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8-Step Visual Campaign Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Visual Campaign Builder</h3>
                <p className="text-xs text-slate-400 mt-0.5">Step {step} of 8</p>
              </div>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs font-medium text-slate-400">
              <span className={step >= 1 ? 'text-blue-400' : ''}>1. Details</span>
              <span className={step >= 2 ? 'text-blue-400' : ''}>2. Leads</span>
              <span className={step >= 3 ? 'text-blue-400' : ''}>3. Mailboxes</span>
              <span className={step >= 4 ? 'text-blue-400' : ''}>4. Sequence</span>
              <span className={step >= 5 ? 'text-blue-400' : ''}>5. AI Settings</span>
              <span className={step >= 6 ? 'text-blue-400' : ''}>6. Schedule</span>
              <span className={step >= 7 ? 'text-blue-400' : ''}>7. Review</span>
              <span className={step >= 8 ? 'text-blue-400' : ''}>8. Launch</span>
            </div>

            {/* Step Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
              {/* Step 1: Campaign Details */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Campaign Name *</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g. Q4 FinTech Growth Outbound"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Campaign Description</label>
                    <textarea
                      value={campaignDesc}
                      onChange={(e) => setCampaignDesc(e.target.value)}
                      rows={3}
                      placeholder="Goal of this campaign and target profile..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Leads Selection */}
              {step === 2 && (
                <div className="space-y-4 text-center py-6">
                  <Users className="w-10 h-10 text-indigo-400 mx-auto" />
                  <h4 className="text-base font-semibold text-white">Assign Leads to Campaign</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Leads can be imported via CSV directly or selected from your global database on the Leads page.
                  </p>
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 max-w-sm mx-auto">
                    ✔ Existing queued leads in your organization will be automatically linked upon launch.
                  </div>
                </div>
              )}

              {/* Step 3: Senders Selection */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">Select Outbound Mailboxes</h4>
                  <p className="text-xs text-slate-400">
                    Emails will be rotated automatically across the selected mailboxes respecting daily limits.
                  </p>
                  <div className="space-y-2">
                    {mailboxes.map((mb) => (
                      <label
                        key={mb.id}
                        className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMailboxIds.includes(mb.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMailboxIds([...selectedMailboxIds, mb.id]);
                            } else {
                              setSelectedMailboxIds(selectedMailboxIds.filter((id) => id !== mb.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <div>
                          <div className="font-medium text-slate-200">{mb.displayName}</div>
                          <div className="text-xs text-slate-400 font-mono">{mb.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Sequence Builder */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Email Sequence Steps</h4>
                    <button
                      onClick={() =>
                        setSequenceSteps([
                          ...sequenceSteps,
                          {
                            stepNumber: sequenceSteps.length + 1,
                            delayDays: 3,
                            subject: 'Follow-up regarding {{company}}',
                            body: 'Hi {{firstName}},\n\nJust wanted to follow up on my previous email.\n\nBest,\n{{senderName}}',
                            enableAiPersonalize: false,
                          },
                        ])
                      }
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>

                  {sequenceSteps.map((s, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between font-semibold text-slate-300">
                        <span>Step {s.stepNumber} {idx === 0 ? '(Initial Outreach)' : `(Wait ${s.delayDays} days)`}</span>
                        {idx > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <span>Wait days:</span>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={s.delayDays}
                              onChange={(e) => {
                                const updated = [...sequenceSteps];
                                updated[idx].delayDays = parseInt(e.target.value) || 1;
                                setSequenceSteps(updated);
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-white"
                            />
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={s.subject}
                        onChange={(e) => {
                          const updated = [...sequenceSteps];
                          updated[idx].subject = e.target.value;
                          setSequenceSteps(updated);
                        }}
                        placeholder="Subject Line"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white text-xs font-mono"
                      />
                      <textarea
                        value={s.body}
                        onChange={(e) => {
                          const updated = [...sequenceSteps];
                          updated[idx].body = e.target.value;
                          setSequenceSteps(updated);
                        }}
                        rows={4}
                        placeholder="Email Body (supports {{firstName}}, {{company}}, {{aiPersonalization}})"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white text-xs font-mono"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`ai-${idx}`}
                          checked={s.enableAiPersonalize}
                          onChange={(e) => {
                            const updated = [...sequenceSteps];
                            updated[idx].enableAiPersonalize = e.target.checked;
                            setSequenceSteps(updated);
                          }}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <label htmlFor={`ai-${idx}`} className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Enable grounded AI opening line personalization for this step
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 5: AI Engine Setup */}
              {step === 5 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">AI Engine & Reply Automation</h4>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">AI Provider</label>
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="OPENAI">OpenAI (GPT-4o / GPT-4o-mini)</option>
                      <option value="GEMINI">Google Gemini (1.5 Flash / Pro)</option>
                      <option value="ANTHROPIC">Anthropic Claude (3.5 Haiku / Sonnet)</option>
                      <option value="MOCK">Deterministic Mock (Testing / Dev)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Reply Handling Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setReplyMode('MANUAL')}
                        className={`p-3 rounded-lg border text-left transition ${
                          replyMode === 'MANUAL'
                            ? 'bg-blue-600/10 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs">Manual</div>
                        <div className="text-[11px] text-slate-500 mt-1">AI generates draft; human approves & sends.</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyMode('SEMI_AUTOMATIC')}
                        className={`p-3 rounded-lg border text-left transition ${
                          replyMode === 'SEMI_AUTOMATIC'
                            ? 'bg-blue-600/10 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs">Semi-Automatic</div>
                        <div className="text-[11px] text-slate-500 mt-1">Auto-send confident replies; review sensitive.</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyMode('AUTOMATIC')}
                        className={`p-3 rounded-lg border text-left transition ${
                          replyMode === 'AUTOMATIC'
                            ? 'bg-blue-600/10 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs">Full Automatic</div>
                        <div className="text-[11px] text-slate-500 mt-1">Autonomous SDR agent with strict safety guards.</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Schedule */}
              {step === 6 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">Sending Schedule & Velocity</h4>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="America/New_York">Eastern Time (America/New_York)</option>
                      <option value="America/Chicago">Central Time (America/Chicago)</option>
                      <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                      <option value="Europe/London">London / GMT (Europe/London)</option>
                      <option value="Asia/Kolkata">India Standard Time (Asia/Kolkata)</option>
                      <option value="UTC">UTC Universal Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Daily Sending Limit</label>
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(parseInt(e.target.value) || 50)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                    🕒 Active sending window: <strong>Monday to Friday, 09:00 - 17:00</strong> in target timezone with 120s-300s randomized delay jitter.
                  </div>
                </div>
              )}

              {/* Step 7: Review */}
              {step === 7 && (
                <div className="space-y-4">
                  <h4 className="text-base font-semibold text-white">Pre-Flight Sequence Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400">Campaign Name</span>
                      <div className="text-sm font-bold text-slate-200 mt-1">{campaignName || 'Untitled'}</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400">Senders Selected</span>
                      <div className="text-sm font-bold text-slate-200 mt-1">{selectedMailboxIds.length} mailboxes</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400">Sequence Steps</span>
                      <div className="text-sm font-bold text-slate-200 mt-1">{sequenceSteps.length} steps</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400">AI Automation</span>
                      <div className="text-sm font-bold text-slate-200 mt-1">{replyMode} ({aiProvider})</div>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-xs text-blue-300">
                    ℹ️ Safety Safeguards: Outreach automatically stops for any lead that replies, bounces, or unsubscribes.
                  </div>
                </div>
              )}

              {/* Step 8: Launch Confirmation */}
              {step === 8 && (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-lg font-bold text-white">Ready to Save & Launch!</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click &quot;Save & Activate&quot; to commit this campaign to the database and start the sequence engine.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Previous
              </button>

              {step < 8 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !campaignName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  Next <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={actionLoading}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                >
                  {actionLoading ? 'Saving...' : 'Save & Activate Campaign'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
