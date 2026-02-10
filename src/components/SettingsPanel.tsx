import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Info, Brain, Image as ImageIcon, Zap, Download, Sparkles, AlertCircle, User, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNeptuneStore } from './neptune/Store';
import './neptune/neptune-design.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const SettingsPanel = ({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
}: SettingsPanelProps) => {
  const [checkingApi, setCheckingApi] = useState(false);
  const [apiValid, setApiValid] = useState<boolean | null>(null);

  // AI Personalization state
  const { profile, updateProfile, loading: profileLoading } = useUserProfile();
  const [nickname, setNickname] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync with profile when loaded
  useEffect(() => {
    if (profile?.identity) {
      setNickname(profile.identity.nickname || '');
      setAiInstructions(profile.identity.aiInstructions || '');
    }
  }, [profile]);

  const saveAIPersonalization = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        identity: {
          nickname,
          aiInstructions
        }
      });
      toast.success('AI personalization saved!');
    } catch (error) {
      toast.error('Settings could not be saved');
    } finally {
      setSavingProfile(false);
    }
  };

  const checkApiKey = async () => {
    if (!apiKey) {
      toast.error('API Key is required!');
      return;
    }

    setCheckingApi(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setApiValid(true);
        toast.success('✅ API Key is valid!');
      } else {
        setApiValid(false);
        toast.error('API Key is invalid or unauthorized');
      }
    } catch (error) {
      console.error('API check error:', error);
      toast.error('Could not verify API key');
      setApiValid(false);
    } finally {
      setCheckingApi(false);
    }
  };

  if (!isOpen) return null;

  // Standard card entry animation
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="neptune-glass-panel rounded-2xl p-6 mb-6 relative overflow-hidden border border-[var(--neptune-primary-dim)] shadow-[0_0_50px_rgba(0,0,0,0.5)]"
    >
      {/* Premium Background Effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(0,180,216,0.2),transparent_70%)]" />
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,180,216,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header - STICKY */}
      <div className="sticky top-0 z-20 flex justify-between items-center mb-8 py-4 -mx-6 px-6 bg-[rgba(5,10,20,0.95)] backdrop-blur-sm border-b border-[rgba(0,180,216,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--neptune-primary-dim)] to-transparent border border-[rgba(0,180,216,0.2)] flex items-center justify-center shadow-[0_0_20px_rgba(0,180,216,0.15)]">
            <Key className="w-6 h-6 text-[var(--neptune-primary)] drop-shadow-[0_0_8px_rgba(0,180,216,0.5)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display tracking-tight text-[var(--neptune-text-primary)]">
              Settings
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-[var(--neptune-text-muted)] tracking-wide uppercase">System Config</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] hover:text-white transition-all duration-300 rounded-full w-10 h-10 border border-[rgba(0,180,216,0.2)] hover:border-[rgba(0,180,216,0.5)]"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <motion.div
        className="grid gap-6 relative z-10"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >

        {/* API Settings Section */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl border border-[var(--neptune-primary-dim)] bg-gradient-to-b from-[rgba(0,20,40,0.3)] to-[rgba(0,10,20,0.3)] relative overflow-hidden group">
          {/* Hover Glow */}
          <div className="absolute inset-0 bg-[var(--neptune-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="mb-6 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold font-display text-[var(--neptune-text-primary)] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--neptune-secondary)]" />
                Groq API Settings
              </h3>
              <p className="text-xs font-mono text-[var(--neptune-text-muted)] mt-1">
                Enter your Groq API key to use the AI Chat
              </p>
            </div>
            {apiValid && (
              <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-[10px] font-mono text-green-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                CONNECTED
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label htmlFor="api-key" className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)] tracking-wider">API Key Authorization</Label>
                {apiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkApiKey}
                    disabled={checkingApi}
                    className="h-6 text-[10px] font-mono uppercase tracking-wide border-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] hover:bg-[var(--neptune-primary-dim)] bg-transparent backdrop-blur-sm"
                  >
                    {checkingApi ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Key'
                    )}
                  </Button>
                )}
              </div>
              <div className="relative group/input">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--neptune-primary)] to-[var(--neptune-secondary)] rounded-lg opacity-20 group-hover/input:opacity-40 transition duration-500 blur-sm"></div>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder="gsk_..."
                  className="relative bg-[#050A10] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] font-mono text-sm placeholder:text-[var(--neptune-text-muted)] focus:border-[var(--neptune-primary)] focus:ring-[var(--neptune-primary-dim)] h-11"
                />
                {apiValid && <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
              </div>

              {apiValid !== null && (
                <div className={`text-xs font-mono p-3 rounded-lg flex items-center gap-3 border ${apiValid ? 'bg-green-500/5 text-green-400 border-green-500/20' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}>
                  {apiValid ? (
                    <><CheckCircle2 className="w-4 h-4" /> Authenticated successfully. Systems operational.</>
                  ) : (
                    <><AlertCircle className="w-4 h-4" /> Authentication failed. Check credentials.</>
                  )}
                </div>
              )}

              <Button
                onClick={async () => {
                  if (apiKey.trim()) {
                    onApiKeyChange(apiKey);
                    toast.success('API Key saved successfully');
                  } else {
                    toast.error('Invalid API Key format');
                  }
                }}
                className="w-full h-11 bg-[rgba(30,60,100,0.6)] hover:bg-[rgba(40,80,130,0.7)] border border-[rgba(60,100,160,0.4)] hover:border-[rgba(80,130,200,0.5)] text-white font-bold font-display tracking-wide text-xs uppercase transition-all duration-300 rounded-lg"
              >
                Save API Key
              </Button>
            </div>

            <div className="bg-[rgba(255,255,255,0.02)] rounded-lg p-4 flex gap-4 border border-[rgba(255,255,255,0.05)]">
              <Info className="w-5 h-5 text-[var(--neptune-text-secondary)] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-[var(--neptune-text-primary)]">How to get an API Key?</h4>
                <p className="text-xs text-[var(--neptune-text-muted)] font-mono leading-relaxed">
                  1. Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--neptune-primary)] hover:underline decoration-1 underline-offset-4">Groq Console</a><br />
                  2. Create standard API Key<br />
                  3. Paste above for full access
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Supported Models */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl border border-[var(--neptune-primary-dim)] bg-gradient-to-b from-[rgba(0,20,40,0.3)] to-[rgba(0,10,20,0.3)]">
          <div className="mb-4">
            <h3 className="text-lg font-bold font-display text-[var(--neptune-text-primary)] flex items-center gap-2">
              <Brain className="w-4 h-4 text-green-400" />
              Supported Models
            </h3>
            <p className="text-xs font-mono text-[var(--neptune-text-muted)]">
              Groq models available for AI Chat - Production & Preview
            </p>
          </div>

          <h4 className="text-[10px] font-mono font-bold text-green-400 uppercase mb-3 border-b border-green-500/20 pb-1 w-fit flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Production Models
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { name: 'Llama 3.1 8B', desc: 'Efficiency Optimized', speed: '~560 t/s', ctx: '131K', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
              { name: 'Llama 3.3 70B', desc: 'High Complexity', speed: '~280 t/s', ctx: '131K', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
              { name: 'GPT-OSS 120B', desc: 'Reasoning + Tools', speed: '~500 t/s', ctx: '128K', color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5' },
              { name: 'GPT-OSS 20B', desc: 'Rapid Reasoning', speed: '~700 t/s', ctx: '128K', color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
            ].map((m, i) => (
              <div key={i} className={`rounded-lg p-3 border ${m.border} ${m.bg} hover:bg-[rgba(255,255,255,0.05)] hover:scale-[1.02] transition-all cursor-default`}>
                <div className={`font-bold text-xs ${m.color} mb-1 font-display`}>{m.name}</div>
                <div className="text-[10px] text-[var(--neptune-text-muted)] mb-2 font-mono">{m.desc}</div>
                <div className="flex justify-between text-[9px] font-mono text-[var(--neptune-text-secondary)] opacity-70 border-t border-[rgba(255,255,255,0.05)] pt-2">
                  <span>{m.speed}</span>
                  <span>{m.ctx}</span>
                </div>
              </div>
            ))}
          </div>

          <h4 className="text-[10px] font-mono font-bold text-orange-400 uppercase mb-3 border-b border-orange-500/20 pb-1 w-fit flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Preview Models
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: 'Llama 4 Maverick', desc: 'Next-Gen Versatile', speed: '~400 t/s', ctx: '128K', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
              { name: 'Llama 4 Scout', desc: 'Search Optimized', speed: '~450 t/s', ctx: '512K', color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/5' },
              { name: 'Qwen3 32B', desc: 'Multilingual Logic', speed: '~350 t/s', ctx: '32K', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/5' },
              { name: 'Kimi K2', desc: 'Long Context', speed: '~300 t/s', ctx: '128K', color: 'text-slate-400', border: 'border-slate-500/20', bg: 'bg-slate-500/5' },
            ].map((m, i) => (
              <div key={i} className={`rounded-lg p-3 border ${m.border} ${m.bg} hover:bg-[rgba(255,255,255,0.05)] hover:scale-[1.02] transition-all cursor-default`}>
                <div className={`font-bold text-xs ${m.color} mb-1 font-display`}>{m.name}</div>
                <div className="text-[10px] text-[var(--neptune-text-muted)] mb-2 font-mono">{m.desc}</div>
                <div className="flex justify-between text-[9px] font-mono text-[var(--neptune-text-secondary)] opacity-70 border-t border-[rgba(255,255,255,0.05)] pt-2">
                  <span>{m.speed}</span>
                  <span>{m.ctx}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Groq Cloud & Features */}
        <div className="flex gap-4">
          <motion.div variants={itemVariants} className="flex-1 p-4 rounded-xl bg-gradient-to-br from-[rgba(0,180,216,0.05)] to-transparent border border-[rgba(0,180,216,0.2)]">
            <div className="flex items-center gap-2 mb-2 text-[var(--neptune-primary)]">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-bold font-display uppercase">GroqCloud Free Usage</h4>
            </div>
            <p className="text-[10px] font-mono text-[var(--neptune-text-secondary)] leading-relaxed opacity-80">
              GroqCloud free plan: 200K tokens/day per model.
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="flex-1 p-4 rounded-xl bg-gradient-to-br from-[rgba(255,255,255,0.02)] to-transparent border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2 mb-2 text-[var(--neptune-text-primary)]">
              <Brain className="w-4 h-4" />
              <h4 className="text-xs font-bold font-display uppercase">AI Coach Features</h4>
            </div>
            <p className="text-[10px] font-mono text-[var(--neptune-text-muted)] leading-relaxed">
              All features provided by your Web3 security mentor: Smart Guidance, File Support, Real-time Streaming.
            </p>
          </motion.div>
        </div>

        {/* Performance Settings */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl border border-[var(--neptune-primary-dim)] bg-gradient-to-b from-[rgba(0,20,40,0.3)] to-[rgba(0,10,20,0.3)] relative overflow-hidden group">
          {/* Hover Glow */}
          <div className="absolute inset-0 bg-[var(--neptune-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="mb-6">
            <h3 className="text-lg font-bold font-display text-[var(--neptune-text-primary)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Performance
            </h3>
            <p className="text-xs font-mono text-[var(--neptune-text-muted)] mt-1">
              Adjust performance settings for lower-end devices
            </p>
          </div>

          <div className="space-y-4">
            {/* Blur Toggle */}
            <PerformanceBlurToggle />
          </div>
        </motion.div>

      </motion.div>
    </motion.div>
  );
};

// Add ChevronDown to imports if not present.  I'll include it here to be safe since I used it.
const ChevronDown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6" /></svg>
);

// Performance Blur Toggle Sub-component
const PerformanceBlurToggle = () => {
  const blurEnabled = useNeptuneStore(state => state.blurEnabled);
  const setBlurEnabled = useNeptuneStore(state => state.setBlurEnabled);

  // Load blurEnabled from settings.json on mount
  useEffect(() => {
    const loadSetting = async () => {
      if (window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile('settings.json');
        if (result.success && result.data && typeof result.data.blurEnabled === 'boolean') {
          setBlurEnabled(result.data.blurEnabled);
        }
      }
    };
    loadSetting();
  }, [setBlurEnabled]);

  // Handle toggle with settings.json persistence
  const handleToggle = async () => {
    const newValue = !blurEnabled;
    setBlurEnabled(newValue);

    // Save to settings.json
    if (window.electronAPI?.saveFile && window.electronAPI?.readFile) {
      const result = await window.electronAPI.readFile('settings.json');
      const existingSettings = result.success && result.data ? result.data : {};
      await window.electronAPI.saveFile('settings.json', { ...existingSettings, blurEnabled: newValue });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
        <div>
          <p className="text-sm font-medium text-[var(--neptune-text-primary)]">Glassmorphism Blur</p>
          <p className="text-[10px] font-mono text-[var(--neptune-text-muted)]">Frosted glass effect on modals</p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-all duration-300 ${blurEnabled
            ? 'bg-[var(--neptune-primary)]'
            : 'bg-[rgba(255,255,255,0.1)]'
            }`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${blurEnabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
        </button>
      </div>

      {/* Warning Note */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
        <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] font-mono text-yellow-500/80 leading-relaxed">
          If you experience performance issues (lag/stuttering), disable this option. Blur requires GPU acceleration.
        </p>
      </div>
    </div>
  );
};