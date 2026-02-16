import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Coffee, Brain, Timer,
  Clock, Zap, History, StopCircle, Activity, Bell, ChevronRight, X, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import DailyLogModal from './DailyLogModal';
import { Bounty, Goal, Note, Snippet } from '@/types';
import '@/types/electron';
import './neptune/neptune-design.css';

const TIMER_SESSION_FILE = 'timer_session.json';

/* --- FLUX CAPACITOR VISUALIZATION --- */
const FluxCapacitor = ({ progress, mode, isActive, timeDisplay, label }: { progress: number, mode: 'focus' | 'break', isActive: boolean, timeDisplay: string, label: string }) => {
  const color = mode === 'focus' ? 'var(--neptune-primary)' : '#10B981';

  return (
    <div className="relative w-64 h-64 mx-auto mb-6 flex items-center justify-center">
      {/* Outer Ring */}
      <div className={`absolute inset-0 rounded-full border-2 border-[rgba(255,255,255,0.05)] ${isActive ? 'animate-spin-slow' : ''}`} style={{ borderTopColor: color, animationDuration: '3s' }} />

      {/* Middle Ring */}
      <div className={`absolute inset-4 rounded-full border-2 border-[rgba(255,255,255,0.05)] ${isActive ? 'animate-spin-reverse' : ''}`} style={{ borderBottomColor: color, animationDuration: '5s' }} />

      {/* Inner Core - OPTIMIZED: Reduced blur for performance */}
      <div className="absolute inset-8 rounded-full bg-[rgba(0,0,0,0.5)] backdrop-blur-sm flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
        <div className={`w-32 h-32 rounded-full opacity-20 blur-sm transition-all duration-1000 ${isActive ? 'scale-110' : 'scale-100'}`} style={{ backgroundColor: color }} />
      </div>

      {/* Text Display - OPTIMIZED: Removed motion key to prevent remounting every second */}
      <div className="absolute z-10 text-center">
        <div className="font-mono text-xs text-[var(--neptune-text-muted)] mb-1 uppercase tracking-widest">{label}</div>
        <div className="text-4xl font-display font-bold text-[var(--neptune-text-primary)] neptune-text-glow tabular-nums">
          {timeDisplay}
        </div>
        <div className="font-mono text-[9px] text-[var(--neptune-text-muted)] mt-1">Progress {Math.round(progress)}%</div>
      </div>
    </div>
  );
};

/* --- POMODORO TIMER --- */
interface PomodoroTimerProps {
  onSessionComplete: (minutes: number) => void;
}

const PomodoroTimer = ({ onSessionComplete }: PomodoroTimerProps) => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimeRef = useRef(25 * 60);

  const focusDuration = 25 * 60;
  const shortBreak = 5 * 60;
  const longBreak = 15 * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      const minutes = Math.round(totalTimeRef.current / 60);
      onSessionComplete(minutes);
      setCompletedSessions((prev) => prev + 1);
      toast.success(`🎉 Session complete: ${minutes} min`);
      const breakTime = (completedSessions + 1) % 4 === 0 ? longBreak : shortBreak;
      setMode('break'); setTimeLeft(breakTime); totalTimeRef.current = breakTime;
    } else {
      toast.info('☕ Break time over!');
      setMode('focus'); setTimeLeft(focusDuration); totalTimeRef.current = focusDuration;
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    if (mode === 'focus') { setTimeLeft(focusDuration); totalTimeRef.current = focusDuration; }
    else { const breakTime = completedSessions % 4 === 0 && completedSessions > 0 ? longBreak : shortBreak; setTimeLeft(breakTime); totalTimeRef.current = breakTime; }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTimeRef.current - timeLeft) / totalTimeRef.current) * 100;

  return (
    <div className="relative">
      <FluxCapacitor
        progress={progress}
        mode={mode}
        isActive={isRunning}
        timeDisplay={formatTime(timeLeft)}
        label={mode === 'focus' ? 'Focus Time' : 'Break Time'}
      />

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-8">
        <button onClick={resetTimer} className="p-3 rounded-full border border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-muted)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
          <RotateCcw size={20} />
        </button>
        <button
          onClick={toggleTimer}
          className={`
                    w-16 h-16 rounded-full flex items-center justify-center 
                    border-2 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]
                    ${isRunning
              ? 'border-[#F43F5E] text-[#F43F5E] shadow-[0_0_15px_#F43F5E]'
              : 'border-[var(--neptune-primary)] text-[var(--neptune-text-primary)] bg-[var(--neptune-primary)]'
            }
                `}
        >
          {isRunning ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        </button>
      </div>

      {/* Session Pips */}
      <div className="flex justify-center gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`w-12 h-1 rounded-full ${i < (completedSessions % 4) ? 'bg-[var(--neptune-primary)] shadow-[0_0_5px_var(--neptune-primary)]' : 'bg-[rgba(255,255,255,0.1)]'}`} />
        ))}
      </div>
    </div>
  );
};

/* --- POMODORO PRESETS --- */
interface PomodoroPreset {
  id: string;
  label: string;
  emoji: string;
  focusMin: number;
  breakMin: number;
  recommended?: boolean;
}

const POMODORO_PRESETS: PomodoroPreset[] = [
  { id: 'classic', label: 'Classic', emoji: '🍅', focusMin: 25, breakMin: 5, recommended: true },
  { id: 'sprint', label: 'Sprint', emoji: '⚡', focusMin: 15, breakMin: 3 },
  { id: 'deep-work', label: 'Deep Work', emoji: '🧠', focusMin: 45, breakMin: 15, recommended: true },
  { id: 'study-block', label: 'Study Block', emoji: '📚', focusMin: 50, breakMin: 10, recommended: true },
  { id: 'power-hour', label: 'Power Hour', emoji: '🔥', focusMin: 60, breakMin: 15 },
  { id: 'quick-sprint', label: 'Quick Sprint', emoji: '🏃', focusMin: 10, breakMin: 2 },
  { id: 'extended', label: 'Extended', emoji: '💪', focusMin: 90, breakMin: 20 },
  { id: 'focus-burst', label: 'Focus Burst', emoji: '🎯', focusMin: 20, breakMin: 4 },
  { id: 'flow-state', label: 'Flow State', emoji: '🌊', focusMin: 75, breakMin: 15 },
  { id: 'balanced', label: 'Balanced', emoji: '🧘', focusMin: 30, breakMin: 10 },
  { id: 'custom', label: 'Custom', emoji: '⚙️', focusMin: 25, breakMin: 5 },
];

// Focus-end alert, accepted action, break-end chime
const FOCUS_END_SOUND = 'https://assets.mixkit.co/active_storage/sfx/900/900.wav';
const ACCEPT_SOUND = 'https://assets.mixkit.co/active_storage/sfx/901/901.wav';
const BREAK_END_SOUND = 'https://assets.mixkit.co/active_storage/sfx/900/900.wav';

/* --- SMART TIMER (RE-SKINNED, SAME LOGIC) --- */
interface SmartTimerProps {
  onSessionComplete: (data: any) => void;
  bounties?: Bounty[];
  goals?: Goal[];
  notes?: Note[];
  snippets?: Snippet[];
}

const SmartTimer = ({ onSessionComplete, bounties = [], goals = [], notes = [], snippets = [] }: SmartTimerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [breaks, setBreaks] = useState<Array<{ id: string, start: Date, end?: Date, duration?: number }>>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [tick, setTick] = useState(0); // only used to force re-render every second
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- POMODORO COACHING STATE ---
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroPreset, setPomodoroPreset] = useState<PomodoroPreset>(POMODORO_PRESETS[0]);
  const [pomodoroPhase, setPomodoroPhase] = useState<'focus' | 'break'>('focus');
  const [pomodoroPhaseStart, setPomodoroPhaseStart] = useState<number | null>(null); // timestamp ms
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [showPomodoroAlert, setShowPomodoroAlert] = useState(false);
  const [pomodoroAlertType, setPomodoroAlertType] = useState<'break' | 'resume'>('break');
  const [showSessionConfirm, setShowSessionConfirm] = useState(false);
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [customFocus, setCustomFocus] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [targetSessions, setTargetSessions] = useState(4); // how many pomodoros user wants
  const pomodoroAlertFiredRef = useRef(false);

  // Helper: calculate total completed break seconds from breaks array
  const getCompletedBreakSeconds = (brks: typeof breaks) => {
    return brks.reduce((sum, b) => sum + (b.duration || 0), 0);
  };

  // Helper: get current open break duration (if on break right now)
  const getCurrentBreakSeconds = () => {
    if (!isOnBreak || breaks.length === 0) return 0;
    const last = breaks[breaks.length - 1];
    if (last.end) return 0;
    return Math.floor((Date.now() - new Date(last.start).getTime()) / 1000);
  };

  // DERIVED display values from wall-clock (never from a ticking counter)
  const wallClockSeconds = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
  const totalBreakSeconds = getCompletedBreakSeconds(breaks) + getCurrentBreakSeconds();
  const displayFocusTime = Math.max(0, wallClockSeconds - totalBreakSeconds);
  const displayBreakTime = totalBreakSeconds;

  // Load saved session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        let savedSession: any = null;
        if (window.electronAPI?.readFile) {
          const result = await window.electronAPI.readFile(TIMER_SESSION_FILE);
          if (result.success && result.data) savedSession = result.data;
        } else {
          const stored = localStorage.getItem('smartTimerSession');
          if (stored) savedSession = JSON.parse(stored);
        }
        if (savedSession && savedSession.status === 'running') {
          setStartTime(new Date(savedSession.startTime));
          setIsRunning(true);
          setIsOnBreak(savedSession.isOnBreak || false);
          setBreaks((savedSession.breaks || []).map((b: any) => ({
            ...b,
            start: new Date(b.start),
            end: b.end ? new Date(b.end) : undefined,
          })));
          // Restore Pomodoro state
          if (savedSession.pomodoro) {
            const p = savedSession.pomodoro;
            setPomodoroEnabled(p.enabled || false);
            if (p.presetId) {
              const preset = POMODORO_PRESETS.find(pr => pr.id === p.presetId);
              if (preset) setPomodoroPreset(preset);
            }
            setPomodoroPhase(p.phase || 'focus');
            setPomodoroPhaseStart(p.phaseStart || null);
            setPomodorosCompleted(p.sessionsCompleted || 0);
            setTargetSessions(p.targetSessions || 4);
            setCustomFocus(p.customFocus || 25);
            setCustomBreak(p.customBreak || 5);
            pomodoroAlertFiredRef.current = p.alertFired || false;
            if (p.showAlert) {
              setShowPomodoroAlert(true);
              setPomodoroAlertType(p.alertType || 'break');
            }
          }
        }
      } catch (error) { console.error(error); }
    };
    loadSession();
  }, []);

  // Persist session every second
  const lastSaveRef = useRef<number>(0);
  useEffect(() => {
    if (startTime && isRunning) {
      const now = Date.now();
      if (now - lastSaveRef.current < 1000) return;
      lastSaveRef.current = now;
      const session = {
        startTime: startTime.toISOString(),
        breaks: breaks.map(b => ({
          ...b,
          start: new Date(b.start).toISOString(),
          end: b.end ? new Date(b.end).toISOString() : undefined,
        })),
        isOnBreak,
        status: 'running',
        lastSavedAt: now,
        lastUpdated: new Date().toISOString(),
        pomodoro: {
          enabled: pomodoroEnabled,
          presetId: pomodoroPreset.id,
          phase: pomodoroPhase,
          phaseStart: pomodoroPhaseStart,
          sessionsCompleted: pomodorosCompleted,
          targetSessions,
          customFocus,
          customBreak,
          alertFired: pomodoroAlertFiredRef.current,
          showAlert: showPomodoroAlert,
          alertType: pomodoroAlertType,
        }
      };
      if (window.electronAPI?.saveFile) window.electronAPI.saveFile(TIMER_SESSION_FILE, session);
      else localStorage.setItem('smartTimerSession', JSON.stringify(session));
    }
  }, [startTime, tick, breaks, isRunning, isOnBreak, pomodoroEnabled, pomodoroPreset, pomodoroPhase, pomodoroPhaseStart, pomodorosCompleted, targetSessions, customFocus, customBreak, showPomodoroAlert, pomodoroAlertType]);

  // Tick interval: only forces a re-render so derived values update
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStart = () => {
    if (!startTime) setStartTime(new Date());
    setIsRunning(true); setIsOnBreak(false);
    // If pomodoro was enabled before starting, init phase tracking
    if (pomodoroEnabled && !pomodoroPhaseStart) {
      setPomodoroPhaseStart(Date.now());
      setPomodoroPhase('focus');
      pomodoroAlertFiredRef.current = false;
    }
  };

  const handleBreak = () => {
    if (!isRunning) return;
    setIsOnBreak(true);
    setBreaks([...breaks, { id: Date.now().toString(), start: new Date() }]);
  };

  const handleResume = () => {
    if (!isRunning || !isOnBreak) return;
    setIsOnBreak(false);
    if (breaks.length > 0) {
      const last = breaks[breaks.length - 1];
      if (!last.end) {
        const now = new Date();
        const updated = [...breaks];
        updated[updated.length - 1] = { ...last, end: now, duration: Math.floor((now.getTime() - new Date(last.start).getTime()) / 1000) };
        setBreaks(updated);
      }
    }
  };

  const handleFinish = () => {
    if (!startTime) {
      toast.error('Start the timer first before finishing!');
      return;
    }

    setIsRunning(false); setIsOnBreak(false);
    const endTime = new Date();

    // Close any open break
    let finalBreaks = [...breaks];
    if (finalBreaks.length > 0) {
      const last = finalBreaks[finalBreaks.length - 1];
      if (!last.end) {
        finalBreaks[finalBreaks.length - 1] = {
          ...last, end: endTime,
          duration: Math.floor((endTime.getTime() - new Date(last.start).getTime()) / 1000)
        };
        setBreaks(finalBreaks);
      }
    }

    // Wall-clock derived: focusTime + breakTime = wallClock ALWAYS
    const wallClock = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const actualBreakTime = finalBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const actualFocusTime = Math.max(0, wallClock - actualBreakTime);

    const sessionData = {
      sessionId: `session_${Date.now()}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalFocusTime: actualFocusTime,
      totalBreakTime: actualBreakTime,
      breaks: finalBreaks,
      breaksCount: finalBreaks.length
    };
    setCurrentSession(sessionData); setShowLogModal(true);
    if (window.electronAPI?.deleteFile) window.electronAPI.deleteFile(TIMER_SESSION_FILE);
    else localStorage.removeItem('smartTimerSession');
  };

  const handleReset = () => {
    setIsRunning(false); setIsOnBreak(false); setStartTime(null); setBreaks([]);
    setPomodorosCompleted(0);
    setPomodoroPhaseStart(null);
    setShowPomodoroAlert(false);
    setShowSessionConfirm(false);
    pomodoroAlertFiredRef.current = false;
    if (window.electronAPI?.deleteFile) window.electronAPI.deleteFile(TIMER_SESSION_FILE);
    else localStorage.removeItem('smartTimerSession');
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  // --- PRESERVED LOGIC END ---

  // --- POMODORO COACHING LOGIC ---
  const activePreset = pomodoroPreset.id === 'custom'
    ? { ...pomodoroPreset, focusMin: customFocus, breakMin: customBreak }
    : pomodoroPreset;

  const sendNotification = useCallback((title: string, body: string, type: 'focus' | 'break') => {
    try {
      // Use Electron main process notification (reliable on Linux)
      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(title, body);
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') new Notification(title, { body });
        });
      }
      // Play sound
      const soundUrl = type === 'focus' ? FOCUS_END_SOUND : BREAK_END_SOUND;
      const audio = new Audio(soundUrl);
      audio.volume = 0.6;
      audio.play().catch(() => { });
    } catch (e) { console.error('Notification error:', e); }
  }, []);

  // Listen for notification click from main process → show in-app alert
  useEffect(() => {
    if (!window.electronAPI?.onNotificationClicked) return;
    const cleanup = window.electronAPI.onNotificationClicked(() => {
      setShowPomodoroAlert(true);
    });
    return cleanup;
  }, []);

  // Start pomodoro phase tracking when enabled or phase changes
  const handlePomodoroToggle = useCallback((enabled: boolean) => {
    setPomodoroEnabled(enabled);
    if (enabled && isRunning) {
      setPomodoroPhase(isOnBreak ? 'break' : 'focus');
      setPomodoroPhaseStart(Date.now());
      pomodoroAlertFiredRef.current = false;
      setShowPomodoroAlert(false);
      // Request notification permission early
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    if (!enabled) {
      setShowPomodoroAlert(false);
      setPomodoroPhaseStart(null);
    }
  }, [isRunning, isOnBreak]);

  // Sync pomodoro phase with break/focus state
  useEffect(() => {
    if (!pomodoroEnabled || !isRunning) return;
    const newPhase = isOnBreak ? 'break' : 'focus';
    if (newPhase !== pomodoroPhase) {
      // Keep alert guard ON during this render to prevent stale threshold re-fire
      pomodoroAlertFiredRef.current = true;
      setPomodoroPhase(newPhase);
      setPomodoroPhaseStart(Date.now());
      setShowPomodoroAlert(false);
      // When returning from break to focus, ask user to confirm session completion
      if (newPhase === 'focus') {
        setShowSessionConfirm(true);
      }
      // Defer unlocking the alert guard until next tick (after state settles)
      setTimeout(() => { pomodoroAlertFiredRef.current = false; }, 500);
    }
  }, [isOnBreak, pomodoroEnabled, isRunning]);

  // Check if pomodoro threshold reached
  const pomodoroElapsed = pomodoroPhaseStart ? Math.floor((Date.now() - pomodoroPhaseStart) / 1000) : 0;
  const pomodoroThreshold = pomodoroPhase === 'focus'
    ? activePreset.focusMin * 60
    : activePreset.breakMin * 60;
  const pomodoroRemaining = Math.max(0, pomodoroThreshold - pomodoroElapsed);

  useEffect(() => {
    if (!pomodoroEnabled || !isRunning || !pomodoroPhaseStart) return;
    if (pomodoroAlertFiredRef.current) return;
    if (pomodoroElapsed >= pomodoroThreshold) {
      pomodoroAlertFiredRef.current = true;
      if (pomodoroPhase === 'focus') {
        setPomodoroAlertType('break');
        sendNotification('⏰ Focus time is up!', `${activePreset.focusMin} min completed. Time for a ${activePreset.breakMin} min break!`, 'focus');
      } else {
        setPomodoroAlertType('resume');
        sendNotification('☕ Break is over!', `Your ${activePreset.breakMin} min break is done. Ready to focus?`, 'break');
      }
      setShowPomodoroAlert(true);
    }
  }, [pomodoroElapsed, pomodoroThreshold, pomodoroEnabled, isRunning, pomodoroPhaseStart, pomodoroPhase, activePreset, sendNotification]);

  // Check if target sessions reached
  useEffect(() => {
    if (pomodoroEnabled && pomodorosCompleted >= targetSessions && targetSessions > 0) {
      toast.success(`🎉 Target reached! ${pomodorosCompleted}/${targetSessions} Pomodoros completed!`);
    }
  }, [pomodorosCompleted, targetSessions, pomodoroEnabled]);

  // Reminder if user doesn't interact with alert within 3 minutes
  const [pomodoroReminder, setPomodoroReminder] = useState(false);
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }
    if (showPomodoroAlert) {
      setPomodoroReminder(false);
      reminderTimeoutRef.current = setTimeout(() => {
        setPomodoroReminder(true);
        // Play reminder sound
        try {
          const audio = new Audio(FOCUS_END_SOUND);
          audio.volume = 0.7;
          audio.play().catch(() => { });
        } catch (_) { }
        // Send reminder notification
        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification(
            '👋 Still there?',
            pomodoroAlertType === 'break'
              ? 'You\'ve been working for 3 extra minutes. Your brain needs a break!'
              : 'Break extended by 3 minutes. Time to get back to work!'
          );
        }
      }, 3 * 60 * 1000); // 3 minutes
    } else {
      setPomodoroReminder(false);
    }
    return () => {
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
    };
  }, [showPomodoroAlert, pomodoroAlertType]);

  const playAcceptSound = () => {
    try {
      const audio = new Audio(ACCEPT_SOUND);
      audio.volume = 0.4;
      audio.play().catch(() => { });
    } catch (_) { }
  };

  const handlePomodoroTakeBreak = () => {
    setShowPomodoroAlert(false);
    playAcceptSound();
    handleBreak();
  };

  const handlePomodoroResume = () => {
    setShowPomodoroAlert(false);
    playAcceptSound();
    handleResume();
  };

  const handlePomodoroExtend = () => {
    setShowPomodoroAlert(false);
    pomodoroAlertFiredRef.current = false;
    // Shift phase start forward by 5 minutes so countdown resets with +5 min
    setPomodoroPhaseStart(prev => prev ? prev + 5 * 60 * 1000 : Date.now());
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Visual Props
  const progress = displayFocusTime > 0 ? (displayFocusTime % 60) * 1.66 : 0;

  return (
    <>
      <div className="relative">
        <FluxCapacitor
          progress={progress}
          mode={isOnBreak ? 'break' : 'focus'}
          isActive={isRunning}
          timeDisplay={formatTime(isOnBreak ? displayBreakTime : displayFocusTime)}
          label={isRunning ? (isOnBreak ? 'On Break' : 'Working') : 'Ready'}
        />

        {/* Pomodoro Alert Banner with Dark Overlay */}
        <AnimatePresence>
          {showPomodoroAlert && (
            <>
              {/* Dark backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPomodoroAlert(false)}
                className="fixed inset-0 bg-black/70 z-40"
                style={{ backdropFilter: 'blur(2px)' }}
              />
              {/* Alert card */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`relative z-50 mb-4 p-4 rounded-xl border bg-[rgba(20,10,5,0.95)] shadow-[0_0_30px_rgba(251,146,60,0.15)] ${pomodoroReminder ? 'border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-orange-500/60'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className={`w-5 h-5 animate-bounce ${pomodoroReminder ? 'text-red-400' : 'text-orange-400'}`} />
                    <span className={`text-base font-bold ${pomodoroReminder ? 'text-red-300' : 'text-orange-300'}`}>
                      {pomodoroReminder
                        ? '👋 Hey! You still haven\'t decided!'
                        : pomodoroAlertType === 'break' ? '⏰ Focus time is up!' : '☕ Break is over!'
                      }
                    </span>
                  </div>
                  <button onClick={() => setShowPomodoroAlert(false)} className="text-[var(--neptune-text-muted)] hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[var(--neptune-text-secondary)] mb-3">
                  {pomodoroReminder
                    ? pomodoroAlertType === 'break'
                      ? 'You\'ve been working 3 extra minutes past your limit. Take a break — your focus quality drops without rest!'
                      : 'Your break has been going on for a while. Ready to jump back in?'
                    : pomodoroAlertType === 'break'
                      ? `${activePreset.focusMin} min focus completed. Take a ${activePreset.breakMin} min break?`
                      : `Your ${activePreset.breakMin} min break is done. Ready to focus again?`
                  }
                </p>
                <div className="flex gap-2">
                  {pomodoroAlertType === 'break' ? (
                    <>
                      <Button size="sm" onClick={handlePomodoroTakeBreak} className="flex-1 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-400 text-sm h-9 font-bold">
                        <Coffee className="mr-1.5 h-4 w-4" /> Take Break
                      </Button>
                      <Button size="sm" onClick={handlePomodoroExtend} variant="outline" className="flex-1 border-orange-500/50 hover:bg-orange-500/20 text-orange-400 text-sm h-9">
                        +5 min
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={handlePomodoroResume} className="flex-1 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-400 text-sm h-9 font-bold">
                        <Play className="mr-1.5 h-4 w-4" /> Resume Focus
                      </Button>
                      <Button size="sm" onClick={handlePomodoroExtend} variant="outline" className="flex-1 border-orange-500/50 hover:bg-orange-500/20 text-orange-400 text-sm h-9">
                        +5 min
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Session Completion Confirmation */}
        <AnimatePresence>
          {showSessionConfirm && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowSessionConfirm(false); }}
                className="fixed inset-0 bg-black/70 z-40"
                style={{ backdropFilter: 'blur(2px)' }}
              />
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="relative z-50 mb-4 p-4 rounded-xl border border-blue-500/60 bg-[rgba(5,10,20,0.95)] shadow-[0_0_30px_rgba(59,130,246,0.15)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <span className="text-base font-bold text-blue-300">Session completed?</span>
                </div>
                <p className="text-xs text-[var(--neptune-text-secondary)] mb-3">
                  Did you fully complete this Pomodoro session? Only count it if you stayed focused the entire time.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setPomodorosCompleted(p => p + 1);
                      setShowSessionConfirm(false);
                      playAcceptSound();
                    }}
                    className="flex-1 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-400 text-sm h-9 font-bold"
                  >
                    ✅ Yes, count it!
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowSessionConfirm(false)}
                    variant="outline"
                    className="flex-1 border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.05)] text-[var(--neptune-text-secondary)] text-sm h-9"
                  >
                    ❌ No, skip
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Start / Resume */}
          {!isRunning || isOnBreak ? (
            <Button onClick={!isRunning ? handleStart : handleResume} className="neptune-glass-panel bg-emerald-500/20 border-emerald-500/80 hover:bg-emerald-500/40 text-emerald-400 font-bold tracking-wider">
              <Play className="mr-2 h-4 w-4" /> Start
            </Button>
          ) : (
            <Button onClick={handleBreak} variant="outline" className="neptune-glass-panel border-yellow-500/50 hover:bg-yellow-500/20 text-yellow-400">
              <Coffee className="mr-2 h-4 w-4" /> Take Break
            </Button>
          )}

          {/* Stop */}
          <Button onClick={handleFinish} variant="destructive" className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50">
            <StopCircle className="mr-2 h-4 w-4" /> Finish
          </Button>
        </div>

        <div className="text-center mb-4">
          <button onClick={handleReset} className="text-[10px] text-[var(--neptune-text-muted)] hover:text-white uppercase tracking-widest">
            Reset Timer
          </button>
        </div>

        {/* --- POMODORO COACHING PANEL --- */}
        <div className="border-t border-[rgba(255,255,255,0.05)] pt-4">
          {/* Toggle Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🍅</span>
              <span className="text-xs font-bold text-[var(--neptune-text-primary)] uppercase tracking-wider">Pomodoro Mode</span>
            </div>
            <button
              onClick={() => handlePomodoroToggle(!pomodoroEnabled)}
              className={`relative w-10 h-5 rounded-full transition-all duration-300 ${pomodoroEnabled
                ? 'bg-orange-500/40 border-orange-500/80'
                : 'bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)]'
                } border`}
            >
              <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-300 ${pomodoroEnabled
                ? 'left-[22px] bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]'
                : 'left-[2px] bg-[rgba(255,255,255,0.4)]'
                }`} />
            </button>
          </div>

          {/* Pomodoro Content (visible when enabled) */}
          <AnimatePresence>
            {pomodoroEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {/* Preset Selector */}
                <div className="mb-3">
                  <button
                    onClick={() => setShowPresetSelector(!showPresetSelector)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] transition-all"
                  >
                    <span className="text-xs text-[var(--neptune-text-secondary)]">
                      {activePreset.emoji} {activePreset.label} — {activePreset.focusMin}/{activePreset.breakMin} min
                      {activePreset.recommended && <span className="ml-1 text-yellow-400">⭐</span>}
                    </span>
                    <ChevronRight className={`w-3 h-3 text-[var(--neptune-text-muted)] transition-transform ${showPresetSelector ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showPresetSelector && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.4)]"
                      >
                        {POMODORO_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setPomodoroPreset(preset);
                              setShowPresetSelector(false);
                              // Reset phase tracking with new preset
                              if (isRunning) {
                                setPomodoroPhaseStart(Date.now());
                                pomodoroAlertFiredRef.current = false;
                                setShowPomodoroAlert(false);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.05)] transition-all ${pomodoroPreset.id === preset.id ? 'bg-orange-500/10 text-orange-300' : 'text-[var(--neptune-text-secondary)]'
                              }`}
                          >
                            <span>
                              {preset.emoji} {preset.label}
                              {preset.recommended && <span className="ml-1 text-yellow-400 text-[10px]">⭐ Recommended</span>}
                            </span>
                            <span className="text-[var(--neptune-text-muted)]">{preset.focusMin}/{preset.breakMin}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Custom preset inputs */}
                  {pomodoroPreset.id === 'custom' && (
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <label className="text-[9px] text-[var(--neptune-text-muted)] uppercase tracking-wider">Focus (min)</label>
                        <input
                          type="number" min={1} max={180} value={customFocus}
                          onChange={e => setCustomFocus(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full mt-1 px-2 py-1 text-xs rounded bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.1)] text-white focus:border-orange-500/50 outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-[var(--neptune-text-muted)] uppercase tracking-wider">Break (min)</label>
                        <input
                          type="number" min={1} max={60} value={customBreak}
                          onChange={e => setCustomBreak(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full mt-1 px-2 py-1 text-xs rounded bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.1)] text-white focus:border-orange-500/50 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pomodoro Status */}
                {isRunning && pomodoroPhaseStart && (
                  <div className="space-y-2">
                    {/* Countdown */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                      <span className="text-[10px] text-[var(--neptune-text-muted)] uppercase tracking-wider">
                        {pomodoroPhase === 'focus' ? '🎯 Next break in' : '☕ Break ends in'}
                      </span>
                      <span className={`text-sm font-mono font-bold tabular-nums ${pomodoroRemaining <= 60 ? 'text-orange-400' : 'text-[var(--neptune-text-primary)]'
                        }`}>
                        {pomodoroRemaining > 0 ? formatCountdown(pomodoroRemaining) : '0:00'}
                      </span>
                    </div>

                    {/* Session Pips with Target */}
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[9px] text-[var(--neptune-text-muted)] mr-2">
                        {pomodorosCompleted}/{targetSessions}:
                      </span>
                      {[...Array(targetSessions)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${i < pomodorosCompleted
                            ? 'bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.5)]'
                            : 'bg-[rgba(255,255,255,0.1)]'
                            }`}
                        />
                      ))}
                    </div>

                    {/* Target Sessions Selector */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                      <span className="text-[10px] text-[var(--neptune-text-muted)] uppercase tracking-wider">🎯 Target Sessions</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTargetSessions(Math.max(1, targetSessions - 1))}
                          className="w-5 h-5 rounded flex items-center justify-center text-xs text-[var(--neptune-text-muted)] hover:bg-[rgba(255,255,255,0.1)] transition-all"
                        >−</button>
                        <span className="text-xs font-mono font-bold text-[var(--neptune-text-primary)] w-6 text-center tabular-nums">{targetSessions}</span>
                        <button
                          onClick={() => setTargetSessions(Math.min(12, targetSessions + 1))}
                          className="w-5 h-5 rounded flex items-center justify-center text-xs text-[var(--neptune-text-muted)] hover:bg-[rgba(255,255,255,0.1)] transition-all"
                        >+</button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showLogModal && currentSession && (
        <DailyLogModal
          isOpen={showLogModal}
          onClose={() => setShowLogModal(false)}
          timerData={currentSession}
          bounties={bounties}
          goals={goals}
          notes={notes}
          snippets={snippets}
          onLogSaved={() => {
            handleReset();
            setShowLogModal(false);
          }}
        />
      )}
    </>
  );
};

/* --- MAIN EXPORT --- */
interface StudyTimerProps {
  onSessionComplete?: (minutes: number) => void;
  bounties?: Bounty[];
  goals?: Goal[];
  notes?: Note[];
  snippets?: Snippet[];
}

export const StudyTimer = ({ onSessionComplete = () => { }, bounties = [], goals = [], notes = [], snippets = [] }: StudyTimerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      /* FIXED: Removed h-full, added min-h but allowed natural height */
      className="neptune-glass-panel rounded-xl p-6 border border-[var(--neptune-primary-dim)] relative flex flex-col items-center justify-center bg-[rgba(0,0,0,0.6)] min-h-[500px]"
    >
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-[var(--neptune-primary)]" />
        <h3 className="font-display tracking-widest text-sm uppercase text-[var(--neptune-text-primary)]">Focus Timer</h3>
      </div>

      <Tabs defaultValue="smart" className="w-full mt-8">
        <TabsList className="w-full bg-[rgba(0,0,0,0.3)] mb-6 border border-[rgba(255,255,255,0.05)] grid grid-cols-2">
          <TabsTrigger value="smart" className="data-[state=active]:bg-[var(--neptune-primary-dim)] data-[state=active]:text-[var(--neptune-primary)]">Smart Mode</TabsTrigger>
          <TabsTrigger value="pomodoro" className="data-[state=active]:bg-[var(--neptune-primary-dim)] data-[state=active]:text-[var(--neptune-primary)]">Pomodoro</TabsTrigger>
        </TabsList>
        <TabsContent value="smart">
          <SmartTimer onSessionComplete={() => { }} bounties={bounties} goals={goals} notes={notes} snippets={snippets} />
        </TabsContent>
        <TabsContent value="pomodoro">
          <PomodoroTimer onSessionComplete={onSessionComplete} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default StudyTimer;