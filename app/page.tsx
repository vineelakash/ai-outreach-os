'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Send,
  MailCheck,
  MessageSquare,
  Sparkles,
  CalendarCheck,
  AlertTriangle,
  Server,
  Plus,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

interface DashboardData {
  metrics: {
    totalLeads: number;
    activeCampaigns: number;
    totalCampaigns: number;
    totalSent: number;
    totalReplies: number;
    totalBounces: number;
    interestedLeads: number;
    meetingsBooked: number;
    replyRate: string;
    bounceRate: string;
    positiveReplyRate: string;
    activeMailboxes: number;
    totalMailboxes: number;
  };
  chartTimeline: Array<{ date: string; sent: number; replies: number }>;
  mailboxes: Array<{
    id: string;
    email: string;
    displayName: string;
    status: string;
    dailyLimit: number;
    currentDaySent: number;
    totalSent: number;
    totalReplies: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    contact: string;
    company: string;
    date: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Outbound Performance</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time pipeline overview, deliverability health, and AI conversation metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 bg-slate-900 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/campaigns"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {data?.metrics.totalLeads ?? '...'}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <span>In active pipeline</span>
          </div>
        </div>

        {/* Emails Sent */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Emails Sent</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {data?.metrics.totalSent ?? '...'}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <span>From {data?.metrics.activeMailboxes ?? 0} active mailboxes</span>
          </div>
        </div>

        {/* Total Replies */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Replies</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {data?.metrics.totalReplies ?? '...'}
          </div>
          <div className="mt-1 text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <span>{data?.metrics.replyRate ?? '0.0%'} reply rate</span>
          </div>
        </div>

        {/* Positive Replies / Meetings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Interested / Meetings</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {(data?.metrics.interestedLeads ?? 0) + (data?.metrics.meetingsBooked ?? 0)}
          </div>
          <div className="mt-1 text-xs text-amber-400 flex items-center gap-1 font-medium">
            <span>{data?.metrics.positiveReplyRate ?? '0.0%'} positive sentiment</span>
          </div>
        </div>
      </div>

      {/* Second Row: Chart & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outbound Activity Trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-white">7-Day Outbound Volume</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily sends and detected replies</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Sends
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Replies
              </span>
            </div>
          </div>

          {/* Simple Visual SVG Bar/Line Representation */}
          <div className="h-48 flex items-end justify-between gap-3 pt-4 border-b border-slate-800">
            {data?.chartTimeline.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1.5 h-36">
                  {/* Sent Bar */}
                  <div
                    className="w-1/2 bg-blue-600/80 rounded-t transition-all hover:bg-blue-500"
                    style={{ height: `${Math.min(100, Math.max(12, item.sent * 4))}%` }}
                    title={`${item.sent} sent`}
                  ></div>
                  {/* Reply Bar */}
                  <div
                    className="w-1/2 bg-emerald-500/80 rounded-t transition-all hover:bg-emerald-400"
                    style={{ height: `${Math.min(100, Math.max(6, item.replies * 8))}%` }}
                    title={`${item.replies} replies`}
                  ></div>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{item.date}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Bounce Rate: <strong className="text-slate-200">{data?.metrics.bounceRate ?? '0.0%'}</strong></span>
            <span>Active Campaigns: <strong className="text-slate-200">{data?.metrics.activeCampaigns ?? 0}</strong></span>
          </div>
        </div>

        {/* Live Conversation Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Live Activity</h3>
              <Link href="/inbox" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                View Inbox <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((act) => (
                  <div key={act.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between font-medium text-slate-200">
                      <span>{act.contact}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">{act.company}</div>
                    <div className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {act.type}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No conversation activity detected yet.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link
              href="/inbox"
              className="w-full block text-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
            >
              Open Smart Inbox
            </Link>
          </div>
        </div>
      </div>

      {/* Mailbox Sending Capacity Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Connected Mailbox Capacity</h3>
            <p className="text-xs text-slate-400 mt-0.5">Daily quotas and warm-up utilization</p>
          </div>
          <Link href="/mailboxes" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            Manage Mailboxes <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-medium">Mailbox</th>
                <th className="pb-3 font-medium">Today&apos;s Quota</th>
                <th className="pb-3 font-medium">Total Sent</th>
                <th className="pb-3 font-medium">Replies</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.mailboxes.map((mb) => {
                const percent = Math.min(100, Math.round((mb.currentDaySent / mb.dailyLimit) * 100));
                return (
                  <tr key={mb.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-medium text-slate-200">
                      <div>{mb.displayName}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{mb.email}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${percent > 85 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {mb.currentDaySent}/{mb.dailyLimit}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-slate-300">{mb.totalSent}</td>
                    <td className="py-3 font-mono text-emerald-400 font-medium">{mb.totalReplies}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          mb.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {mb.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
