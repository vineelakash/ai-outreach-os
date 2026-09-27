'use client';

import { useState, useEffect } from 'react';
import {
  Inbox,
  Sparkles,
  Send,
  MessageSquare,
  Clock,
  User,
  Building,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Mail,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface Thread {
  id: string;
  subject: string;
  snippet?: string;
  hasUnread: boolean;
  latestIntent?: string;
  updatedAt: string;
  lead: {
    id: string;
    email: string;
    fullName?: string;
    company?: string;
    jobTitle?: string;
    status: string;
  };
  mailbox: {
    id: string;
    email: string;
    displayName: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
  classifications?: Array<{
    intent: string;
    confidence: number;
    summary: string;
    recommendedAction: string;
    draftReply?: string;
    autoSent: boolean;
  }>;
  messages: Array<{
    id: string;
    fromEmail: string;
    fromName?: string;
    toEmail: string;
    subject: string;
    bodyText: string;
    isOutbound: boolean;
    sentAt?: string;
    createdAt: string;
  }>;
}

export default function UnifiedInboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inbox?filter=${filter}`);
      if (res.ok) {
        const json = await res.json();
        setThreads(json.threads || []);
        if (json.threads?.length > 0 && !selectedThread) {
          fetchThreadDetail(json.threads[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadDetail = async (threadId: string) => {
    try {
      const res = await fetch(`/api/inbox/${threadId}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedThread(json.thread);
        const classification = json.thread.classifications?.[0];
        if (classification?.draftReply) {
          setReplyText(classification.draftReply);
        } else {
          setReplyText('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [filter]);

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    try {
      setSendingReply(true);
      const res = await fetch(`/api/inbox/${selectedThread.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyText: replyText }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error);
      }

      alert('Reply dispatched successfully!');
      fetchThreadDetail(selectedThread.id);
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleGenerateAiReply = async () => {
    if (!selectedThread) return;
    try {
      setGeneratingAi(true);
      const res = await fetch(`/api/inbox/${selectedThread.id}/generate`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        setReplyText(json.draft || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAi(false);
    }
  };

  const filterTabs = [
    { key: 'ALL', label: 'All Messages' },
    { key: 'UNREAD', label: 'Unread' },
    { key: 'INTERESTED', label: 'Interested' },
    { key: 'MEETINGS', label: 'Meetings' },
    { key: 'NEEDS_REPLY', label: 'Needs Reply' },
    { key: 'UNSUBSCRIBED', label: 'Unsubscribed' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Inbox Left Sidebar: Filter Tabs */}
      <div className="w-56 border-r border-slate-800 bg-slate-900/60 p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Smart Folders
          </div>
          <div className="space-y-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Classification
          </div>
          All incoming replies are automatically categorized with sentiment and draft replies.
        </div>
      </div>

      {/* Middle Column: Threads List */}
      <div className="w-80 md:w-96 border-r border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Conversations</h3>
          <button onClick={fetchThreads} className="p-1 text-slate-400 hover:text-white">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {threads.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No conversations found.
            </div>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                onClick={() => fetchThreadDetail(t.id)}
                className={`p-4 cursor-pointer transition ${
                  selectedThread?.id === t.id
                    ? 'bg-blue-600/10 border-l-2 border-blue-500'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${t.hasUnread ? 'text-white' : 'text-slate-300'}`}>
                    {t.lead.fullName || t.lead.email}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(t.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{t.subject}</div>
                <div className="text-[11px] text-slate-500 truncate mt-1">{t.snippet || 'No preview available'}</div>

                <div className="mt-2 flex items-center gap-2">
                  {t.latestIntent && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        t.latestIntent === 'INTERESTED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : t.latestIntent === 'MEETING_REQUEST'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : t.latestIntent === 'UNSUBSCRIBE'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {t.latestIntent}
                    </span>
                  )}
                  {t.hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Active Conversation Pane */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {selectedThread ? (
          <>
            {/* Header: Contact & Campaign Context */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">
                    {selectedThread.lead.fullName || selectedThread.lead.email}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">({selectedThread.lead.email})</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{selectedThread.lead.company || 'No Company'}</span>
                  <span>•</span>
                  <span>{selectedThread.lead.jobTitle || 'No Title'}</span>
                  <span>•</span>
                  <span className="text-blue-400">{selectedThread.campaign?.name || 'Direct Outreach'}</span>
                </div>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* AI Classification & Summary Card */}
              {selectedThread.classifications?.[0] && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                      <Sparkles className="w-4 h-4" /> AI Intent: {selectedThread.classifications[0].intent}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {Math.round(selectedThread.classifications[0].confidence * 100)}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Summary:</strong> {selectedThread.classifications[0].summary}
                  </p>
                  <p className="text-xs text-slate-400">
                    <strong>Recommended Action:</strong> {selectedThread.classifications[0].recommendedAction}
                  </p>
                </div>
              )}

              {/* Message Thread History */}
              {selectedThread.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border text-xs max-w-2xl ${
                    msg.isOutbound
                      ? 'ml-auto bg-slate-900 border-slate-800 text-slate-200'
                      : 'mr-auto bg-blue-950/20 border-blue-900/40 text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-400 mb-2">
                    <span>{msg.fromName || msg.fromEmail}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(msg.sentAt || msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.bodyText}</div>
                </div>
              ))}
            </div>

            {/* Suggested Reply Box */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Response Composer
                </span>
                <button
                  type="button"
                  onClick={handleGenerateAiReply}
                  disabled={generatingAi}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
                  {generatingAi ? 'Generating...' : 'Regenerate AI Draft'}
                </button>
              </div>

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Type your response here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Sending via: <strong className="text-slate-300">{selectedThread.mailbox.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingReply ? 'Sending...' : 'Send Reply Now'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            Select a conversation on the left to view the thread.
          </div>
        )}
      </div>
    </div>
  );
}
