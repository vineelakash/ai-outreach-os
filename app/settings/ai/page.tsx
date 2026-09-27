'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Key,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Save,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface AIConfig {
  id: string;
  provider: 'OPENAI' | 'GEMINI' | 'ANTHROPIC';
  defaultModel: string;
  isEnabled: boolean;
  maskedKey: string;
  tokensUsed: number;
  costEstimated: number;
}

export default function AISettingsPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for adding/updating keys
  const [activeProvider, setActiveProvider] = useState<'OPENAI' | 'GEMINI' | 'ANTHROPIC'>('OPENAI');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('gpt-4o-mini');
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/config');
      if (res.ok) {
        const json = await res.json();
        setConfigs(json.configs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSaveConfig = async () => {
    if (!apiKeyInput.trim()) {
      alert('Please enter an API key');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'default',
          provider: activeProvider,
          apiKey: apiKeyInput,
          defaultModel: modelInput,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error);
      }

      alert(`✔ ${activeProvider} credentials saved & encrypted with AES-256-GCM!`);
      setApiKeyInput('');
      fetchConfigs();
    } catch (err: any) {
      alert(err.message || 'Failed to save AI config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (provider: 'OPENAI' | 'GEMINI' | 'ANTHROPIC', key?: string) => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: key || apiKeyInput,
          model: modelInput,
        }),
      });

      const data = await res.json();
      setTestResult({ provider, success: !!data.success });
      if (data.success) {
        alert(`✔ ${provider} connection verified successfully!`);
      } else {
        alert(`❌ ${provider} connection test failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(err.message || 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">AI Engine & Model Settings</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure multi-model AI providers for personalized copy generation, intent classification, and automated reply drafting.
        </p>
      </div>

      {/* Provider Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* OpenAI Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-base">OpenAI</h3>
            <span className="text-xs font-mono text-slate-400">GPT-4o</span>
          </div>
          <p className="text-xs text-slate-400">
            High-precision copywriting and low-latency JSON reply classification.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-emerald-400 font-semibold">Configured</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Key:</span>
              <span className="font-mono text-slate-300">
                {configs.find((c) => c.provider === 'OPENAI')?.maskedKey || '••••••••'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveProvider('OPENAI');
              setModelInput('gpt-4o-mini');
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition"
          >
            Update OpenAI Config
          </button>
        </div>

        {/* Google Gemini Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-base">Google Gemini</h3>
            <span className="text-xs font-mono text-slate-400">1.5 Flash</span>
          </div>
          <p className="text-xs text-slate-400">
            Large context window and cost-effective high-throughput lead personalization.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-slate-400 font-semibold">
                {configs.find((c) => c.provider === 'GEMINI') ? 'Active' : 'Unconfigured'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Key:</span>
              <span className="font-mono text-slate-300">
                {configs.find((c) => c.provider === 'GEMINI')?.maskedKey || '••••••••'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveProvider('GEMINI');
              setModelInput('gemini-1.5-flash');
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition"
          >
            Update Gemini Config
          </button>
        </div>

        {/* Anthropic Claude Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-base">Anthropic Claude</h3>
            <span className="text-xs font-mono text-slate-400">3.5 Haiku</span>
          </div>
          <p className="text-xs text-slate-400">
            Nuanced, humanized tone and strict refusal of hallucinations in outreach copy.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-slate-400 font-semibold">
                {configs.find((c) => c.provider === 'ANTHROPIC') ? 'Active' : 'Unconfigured'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Key:</span>
              <span className="font-mono text-slate-300">
                {configs.find((c) => c.provider === 'ANTHROPIC')?.maskedKey || '••••••••'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveProvider('ANTHROPIC');
              setModelInput('claude-3-5-haiku-20241022');
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition"
          >
            Update Claude Config
          </button>
        </div>
      </div>

      {/* Configure Provider Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 max-w-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Save API Key: {activeProvider}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Encrypted at rest using AES-256-GCM. Keys never leak to client browsers.
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={`Enter new ${activeProvider} API key...`}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Default Model</label>
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => handleTestConnection(activeProvider)}
            disabled={isTesting || !apiKeyInput}
            className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Test API Key
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving || !apiKeyInput}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Encrypting & Saving...' : 'Save & Encrypt'}
          </button>
        </div>
      </div>
    </div>
  );
}
