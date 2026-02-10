import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Coffee, Brain, Timer,
  Clock, Zap, History, StopCircle, Activity
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
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => { });
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

/* --- SMART TIMER (RE-SKINNED, SAME LOGIC) --- */
interface SmartTimerProps {
  onSessionComplete: (data: any) => void;
  bounties?: Bounty[];
  goals?: Goal[];
  notes?: Note[];
  snippets?: Snippet[];
}

const SmartTimer = ({ onSessionComplete, bounties = [], goals = [], notes = [], snippets = [] }: SmartTimerProps) => {
  // --- PRESERVED LOGIC START ---
  const [isRunning, setIsRunning] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [breaks, setBreaks] = useState<Array<{ id: string, start: Date, end?: Date, duration?: number }>>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const breakIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
          const now = new Date();
          const savedStart = new Date(savedSession.startTime);
          const diff = Math.floor((now.getTime() - savedStart.getTime()) / 1000);
          setStartTime(savedStart);
          setElapsedTime(savedSession.elapsedTime + diff);
          setIsRunning(true);
          setBreaks(savedSession.breaks || []);
          toast.info('⏱️ Session restored');
        }
      } catch (error) { console.error(error); }
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (startTime) {
      const session = {
        startTime, elapsedTime, breaks, status: isRunning ? 'running' : 'paused', lastUpdated: new Date().toISOString()
      };
      if (window.electronAPI?.saveFile) window.electronAPI.saveFile(TIMER_SESSION_FILE, session);
      else localStorage.setItem('smartTimerSession', JSON.stringify(session));
    }
  }, [startTime, elapsedTime, breaks, isRunning]);

  useEffect(() => {
    if (isRunning && !isOnBreak) {
      intervalRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
    } else if (isRunning && isOnBreak) {
      breakIntervalRef.current = setInterval(() => setBreakTime(p => p + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    };
  }, [isRunning, isOnBreak]);

  const handleStart = () => {
    if (!startTime) setStartTime(new Date());
    setIsRunning(true); setIsOnBreak(false);
  };

  const handleBreak = () => {
    if (!isRunning) return;
    setIsRunning(true); setIsOnBreak(true);
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
    // Prevent finishing if timer was never started
    if (!startTime) {
      toast.error('Start the timer first before finishing!');
      return;
    }

    setIsRunning(false); setIsOnBreak(false);
    let finalBreaks = [...breaks];
    if (finalBreaks.length > 0) {
      const last = finalBreaks[finalBreaks.length - 1];
      if (!last.end) {
        const now = new Date();
        finalBreaks[finalBreaks.length - 1] = { ...last, end: now, duration: Math.floor((now.getTime() - new Date(last.start).getTime()) / 1000) };
        setBreaks(finalBreaks);
      }
    }
    const endTime = new Date();
    const sessionData = {
      sessionId: `session_${Date.now()}`, startTime: startTime?.toISOString() || new Date().toISOString(),
      endTime: endTime.toISOString(), totalFocusTime: elapsedTime, totalBreakTime: breakTime, breaks: finalBreaks, breaksCount: finalBreaks.length
    };
    setCurrentSession(sessionData); setShowLogModal(true);
    if (window.electronAPI?.deleteFile) window.electronAPI.deleteFile(TIMER_SESSION_FILE);
    else localStorage.removeItem('smartTimerSession');
  };

  const handleReset = () => {
    setIsRunning(false); setIsOnBreak(false); setElapsedTime(0); setBreakTime(0); setStartTime(null); setBreaks([]);
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

  // Visual Props
  const progress = elapsedTime > 0 ? (elapsedTime % 60) * 1.66 : 0; // Just some visual movement

  return (
    <>
      <div className="relative">
        <FluxCapacitor
          progress={progress}
          mode={isOnBreak ? 'break' : 'focus'}
          isActive={isRunning}
          timeDisplay={formatTime(isOnBreak ? breakTime : elapsedTime)}
          label={isRunning ? (isOnBreak ? 'On Break' : 'Working') : 'Ready'}
        />

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

        <div className="text-center">
          <button onClick={handleReset} className="text-[10px] text-[var(--neptune-text-muted)] hover:text-white uppercase tracking-widest">
            Reset Timer
          </button>
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