'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Mail,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Calendar,
  Filter,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Deliverability & Pipeline Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">
          Detailed metrics across campaigns, mailbox performance, positive sentiment, and bounce rates.
        </p>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs text-slate-400 font-medium uppercase">Outbound Sent</span>
          <div className="text-2xl font-bold text-white mt-2">{data?.metrics.totalSent ?? '...'}</div>
          <span className="text-xs text-slate-500 mt-1 block">Across all campaigns</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs text-slate-400 font-medium uppercase">Reply Rate</span>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{data?.metrics.replyRate ?? '...'}</div>
          <span className="text-xs text-emerald-500 mt-1 block">{data?.metrics.totalReplies ?? 0} total replies</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs text-slate-400 font-medium uppercase">Positive Sentiment</span>
          <div className="text-2xl font-bold text-amber-400 mt-2">{data?.metrics.positiveReplyRate ?? '...'}</div>
          <span className="text-xs text-amber-500 mt-1 block">{data?.metrics.interestedLeads ?? 0} interested leads</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs text-slate-400 font-medium uppercase">Bounce Rate</span>
          <div className="text-2xl font-bold text-rose-400 mt-2">{data?.metrics.bounceRate ?? '...'}</div>
          <span className="text-xs text-rose-500 mt-1 block">{data?.metrics.totalBounces ?? 0} bounces recorded</span>
        </div>
      </div>

      {/* Mailbox Performance Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Mailbox Performance Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-medium">Mailbox</th>
                <th className="pb-3 font-medium">Volume Sent</th>
                <th className="pb-3 font-medium">Replies</th>
                <th className="pb-3 font-medium">Reply Rate</th>
                <th className="pb-3 font-medium">Bounces</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.mailboxes?.map((mb: any) => {
                const rate = mb.totalSent > 0 ? ((mb.totalReplies / mb.totalSent) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={mb.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-medium text-slate-200">
                      <div>{mb.displayName}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{mb.email}</div>
                    </td>
                    <td className="py-3 font-mono text-slate-300">{mb.totalSent}</td>
                    <td className="py-3 font-mono text-emerald-400 font-medium">{mb.totalReplies}</td>
                    <td className="py-3 font-mono text-emerald-400 font-bold">{rate}%</td>
                    <td className="py-3 font-mono text-rose-400">{mb.totalBounces || 0}</td>
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
