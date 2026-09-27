import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import Script from 'next/script';
import {
  LayoutDashboard,
  Send,
  Users,
  Inbox,
  Mail,
  Globe,
  BarChart3,
  Bot,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Outreach OS | Self-Hosted Outbound Engagement Platform',
  description: 'Production-ready self-hosted AI outbound sales and email automation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex">
        {/* GA4 Script (Privacy safe, no PII) */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}

        {/* Sidebar Navigation */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
          <div>
            {/* Brand Header */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                ⚡
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-wide text-white">AI Outreach OS</h1>
                <p className="text-[11px] text-slate-400">Self-Hosted Outbound</p>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="p-4 space-y-1 text-sm font-medium">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                Dashboard
              </Link>
              <Link
                href="/campaigns"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                Campaigns
              </Link>
              <Link
                href="/leads"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                Leads
              </Link>
              <Link
                href="/inbox"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Inbox className="w-4 h-4 text-purple-400" />
                Unified Inbox
              </Link>
              <Link
                href="/mailboxes"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                Mailboxes
              </Link>
              <Link
                href="/domains"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Globe className="w-4 h-4 text-teal-400" />
                Domains & DNS
              </Link>
              <Link
                href="/analytics"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Analytics
              </Link>
              <Link
                href="/settings/ai"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Bot className="w-4 h-4 text-pink-400" />
                AI Control Center
              </Link>
            </nav>
          </div>

          {/* Footer Status */}
          <div className="p-4 border-t border-slate-800 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Engine Online
                </span>
                <span className="text-[10px] text-slate-500">v1.0.0</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>AES-256 Encrypted</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
