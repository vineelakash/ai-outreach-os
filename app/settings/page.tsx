'use client';

import { useState } from 'react';
import {
  Settings,
  Shield,
  FileText,
  Sliders,
  Bell,
  Lock,
  CheckCircle,
} from 'lucide-react';

export default function GeneralSettingsPage() {
  const [orgName, setOrgName] = useState('Acme Growth Labs');
  const [defaultTimezone, setDefaultTimezone] = useState('America/New_York');
  const [defaultDailyLimit, setDefaultDailyLimit] = useState(100);
  const [enableUnsubscribeFooter, setEnableUnsubscribeFooter] = useState(true);
  const [footerText, setFooterText] = useState(
    'If you would prefer not to receive future emails from us, please unsubscribe here: {{unsubscribeUrl}}'
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">System & Compliance Settings</h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage sending defaults, CAN-SPAM/GDPR compliance footers, and security guardrails.
        </p>
      </div>

      {/* Organization Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Organization Profile</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Default Timezone</label>
            <select
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white"
            >
              <option value="America/New_York">Eastern Time (America/New_York)</option>
              <option value="America/Chicago">Central Time (America/Chicago)</option>
              <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compliance & Unsubscribe */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">CAN-SPAM & GDPR Compliance</h3>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
            Strict Opt-Out Enabled
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Our sending engine automatically appends RFC 8058 <code>List-Unsubscribe</code> and <code>List-Unsubscribe-Post</code> headers to all outbound emails to ensure full compliance with Gmail and Yahoo 2024+ sender requirements.
        </p>

        <div className="space-y-3 pt-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableUnsubscribeFooter}
              onChange={(e) => setEnableUnsubscribeFooter(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span className="text-slate-300">Append mandatory plain-text opt-out link in email footer</span>
          </label>

          {enableUnsubscribeFooter && (
            <div>
              <label className="block text-slate-400 mb-1">Footer Opt-Out Template</label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-300 font-mono text-[11px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Security Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" /> Security Architecture
        </h3>
        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
          <li>All mailbox SMTP/IMAP passwords and OAuth tokens encrypted at rest via AES-256-GCM.</li>
          <li>AI Provider API keys encrypted with zero client-side exposure.</li>
          <li>Idempotency keys generated per-send step to prevent duplicate sends across worker retries.</li>
          <li>Database queries parameterized through Prisma ORM to prevent SQL injection.</li>
        </ul>
      </div>
    </div>
  );
}
