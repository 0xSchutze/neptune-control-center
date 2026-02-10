import { useState, useEffect, useCallback, useRef } from 'react';
import { Progress, DailyLog, Snippet, Transaction, Note, Goal, Bounty, Milestone } from '@/types';
import { checkAchievements } from '@/services/AchievementService';
import '@/types/electron'; // Global ElectronAPI type

// ================== FILENAMES ==================
const FILES = {
  PROGRESS: 'progress.json',
  SETTINGS: 'settings.json',
};

const FOLDERS = {
  NOTES: 'notes',
  SNIPPETS: 'snippets',
  GOALS: 'goals',
  BOUNTIES: 'bounties',
  WALLET: 'wallet',
};

// ================== DEFAULT VALUES ==================
const defaultGeneralProgress = {
  studyHours: {
    morning: 0,
    evening: 0,
    night: 0,
  },
  earnings: 0,
  bugs: 0,
  currentWeek: 1,
  completedRoadmapWeeks: [] as number[],
};

const defaultWallet = {
  balance: 0,
  transactions: [] as Transaction[],
  financialGoals: [] as import('@/types').FinancialGoal[],
};

// ================== HOOK ==================
export const useProgress = () => {
  // Separate states
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [wallet, setWallet] = useState(defaultWallet);
  const [generalProgress, setGeneralProgress] = useState(defaultGeneralProgress);
  const [isLoading, setIsLoading] = useState(true);

  // Ref for debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ================== ELECTRON HELPER ==================
  const isElectron = () => !!window.electronAPI?.listFolder;

  // ================== LOAD FUNCTIONS ==================
  const loadFromElectron = async () => {
    try {
      // Load Notes
      const notesResult = await window.electronAPI!.listFolder!(FOLDERS.NOTES);
      if (notesResult.success && notesResult.data) {
        setNotes(notesResult.data);
      }

      // Load Snippets
      const snippetsResult = await window.electronAPI!.listFolder!(FOLDERS.SNIPPETS);
      if (snippetsResult.success && snippetsResult.data) {
        setSnippets(snippetsResult.data);
      }

      // Load Goals
      const goalsResult = await window.electronAPI!.listFolder!(FOLDERS.GOALS);
      if (goalsResult.success && goalsResult.data) {
        setGoals(goalsResult.data);
      }

      // Load Bounties
      const bountiesResult = await window.electronAPI!.listFolder!(FOLDERS.BOUNTIES);
      if (bountiesResult.success && bountiesResult.data) {
        setBounties(bountiesResult.data);
      }

      // General Progress (studyHours, roadmap) - wallet separate
      const progressResult = await window.electronAPI!.readFile!(FILES.PROGRESS);
      if (progressResult.success && progressResult.data) {
        // Only get known fields (don't include extras like dailyLogs)
        const { studyHours, earnings, bugs, currentWeek, completedRoadmapWeeks } = progressResult.data;
        setGeneralProgress(prev => ({
          ...prev,
          studyHours: studyHours || prev.studyHours,
          earnings: earnings || prev.earnings,
          bugs: bugs || prev.bugs,
          currentWeek: currentWeek || prev.currentWeek,
          completedRoadmapWeeks: completedRoadmapWeeks || prev.completedRoadmapWeeks,
        }));
      }

      // Wallet - separate file
      const walletResult = await window.electronAPI!.readFile!('wallet/wallet.json');
      if (walletResult.success && walletResult.data) {
        setWallet(walletResult.data);
      }

      // DailyLogs - BasicLogs.json'dan (mevcut sistem)
      const logsResult = await window.electronAPI!.readFile!('BasicLogs.json');
      if (logsResult.success && logsResult.data?.dailyLogs) {
        setDailyLogs(logsResult.data.dailyLogs);
      }

    } catch (error) {
      console.error('Electron load error:', error);
    }
  };

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('bug-hunter-progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDailyLogs(parsed.dailyLogs || []);
        setNotes(parsed.notes || []);
        setSnippets(parsed.snippets || []);
        setGoals(parsed.goals || []);
        setBounties(parsed.bounties || []);
        setWallet(parsed.wallet || defaultWallet);
        setGeneralProgress(prev => ({
          ...prev,
          studyHours: parsed.studyHours || prev.studyHours,
          earnings: parsed.earnings || 0,
          bugs: parsed.bugs || 0,
          currentWeek: parsed.currentWeek || 1,
          completedRoadmapWeeks: parsed.completedRoadmapWeeks || [],
        }));
      } catch (e) {
        console.error('localStorage parse error:', e);
      }
    }
  };

  // Fetch data on initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (isElectron()) {
        await loadFromElectron();
      } else {
        loadFromLocalStorage();
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // When DailyLogs are loaded, calculate studyHours from existing logs
  useEffect(() => {
    if (isLoading || dailyLogs.length === 0) return;

    const calculatedHours = dailyLogs.reduce(
      (acc, log) => {
        const slot = log.timeSlot as 'morning' | 'evening' | 'night';
        return {
          ...acc,
          [slot]: acc[slot] + (log.hours || 0),
        };
      },
      { morning: 0, evening: 0, night: 0 }
    );

    setGeneralProgress(prev => ({
      ...prev,
      studyHours: calculatedHours,
    }));
  }, [dailyLogs, isLoading]);

  // ================== SAVE FUNCTIONS ==================
  const saveGeneralProgress = useCallback(async () => {
    const data = {
      ...generalProgress,
      // wallet is now in separate file
    };

    if (isElectron()) {
      await window.electronAPI!.saveFile!(FILES.PROGRESS, data);
    } else {
      // localStorage fallback
      const fullProgress = {
        dailyLogs,
        notes,
        snippets,
        goals,
        bounties,
        wallet,
        ...generalProgress,
      };
      localStorage.setItem('bug-hunter-progress', JSON.stringify(fullProgress));
    }
  }, [generalProgress, wallet, dailyLogs, notes, snippets, goals, bounties]);

  // Save when GeneralProgress changes (debounced)
  useEffect(() => {
    if (isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveGeneralProgress();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [generalProgress, wallet, saveGeneralProgress, isLoading]);

  // ================== REFRESH FUNCTIONS ==================
  // Refresh dailyLogs from disk (for when returning to Dashboard)
  const refreshDailyLogs = useCallback(async () => {
    if (isElectron() && window.electronAPI?.readFile) {
      try {
        const logsResult = await window.electronAPI.readFile('BasicLogs.json');
        if (logsResult.success && logsResult.data?.dailyLogs) {
          setDailyLogs(logsResult.data.dailyLogs);
        }
      } catch (error) {
        console.error('❌ Refresh dailyLogs error:', error);
      }
    }
  }, []);

  // ================== DAILY LOGS ==================
  // DailyLogs in BasicLogs.json - DailyLogTab.tsx already manages this
  // Only for state synchronization
  const addDailyLog = (log: Omit<DailyLog, 'id'>) => {
    const newLog: DailyLog = { ...log, id: Date.now() };
    setDailyLogs(prev => [newLog, ...prev]);
    setGeneralProgress(prev => ({
      ...prev,
      studyHours: {
        ...prev.studyHours,
        [log.timeSlot]: prev.studyHours[log.timeSlot] + log.hours,
      },
    }));
  };

  // ================== NOTES ==================
  const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      ...note,
      id: Date.now(),
      createdAt: now,
      updatedAt: now,
    };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.NOTES, `note_${newNote.id}.json`, newNote);
    }

    setNotes(prev => [newNote, ...prev]);
  };

  const updateNote = async (id: number, updates: Partial<Note>) => {
    const updatedNote = notes.find(n => n.id === id);
    if (!updatedNote) return;

    const newNote = { ...updatedNote, ...updates, updatedAt: new Date().toISOString() };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.NOTES, `note_${id}.json`, newNote);
    }

    setNotes(prev => prev.map(n => n.id === id ? newNote : n));
  };

  const deleteNote = async (id: number) => {
    if (isElectron()) {
      await window.electronAPI!.deleteFromFolder!(FOLDERS.NOTES, `note_${id}.json`);
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // ================== SNIPPETS ==================
  const addSnippet = async (snippet: Omit<Snippet, 'id' | 'createdAt'>) => {
    const newSnippet: Snippet = {
      ...snippet,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.SNIPPETS, `snippet_${newSnippet.id}.json`, newSnippet);
    }

    setSnippets(prev => [newSnippet, ...prev]);
  };

  const updateSnippet = async (id: number, updates: Partial<Snippet>) => {
    const existingSnippet = snippets.find(s => s.id === id);
    if (!existingSnippet) return;

    const updatedSnippet = { ...existingSnippet, ...updates };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.SNIPPETS, `snippet_${id}.json`, updatedSnippet);
    }
    setSnippets(prev => prev.map(s => s.id === id ? updatedSnippet : s));
  };

  const deleteSnippet = async (id: number) => {
    if (isElectron()) {
      await window.electronAPI!.deleteFromFolder!(FOLDERS.SNIPPETS, `snippet_${id}.json`);
    }
    setSnippets(prev => prev.filter(s => s.id !== id));
  };

  // ================== GOALS ==================
  const addGoal = async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goal,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.GOALS, `goal_${newGoal.id}.json`, newGoal);
    }

    setGoals(prev => [newGoal, ...prev]);
  };

  const updateGoal = async (id: number, updates: Partial<Goal>) => {
    const existingGoal = goals.find(g => g.id === id);
    if (!existingGoal) return;

    const updatedGoal = { ...existingGoal, ...updates };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.GOALS, `goal_${id}.json`, updatedGoal);
    }

    setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));

    // Check achievements when goal status changes to completed
    if (updates.status === 'completed') {
      const progressSnapshot = {
        dailyLogs,
        goals: goals.map(g => g.id === id ? updatedGoal : g),
        bounties,
        snippets: [],
        notes: [],
        studyHours: { morning: 0, evening: 0, night: 0 },
        wallet: wallet || { balance: 0, transactions: [], financialGoals: [] },
        earnings: 0,
        bugs: 0,
        currentWeek: 1,
        completedRoadmapWeeks: [],
      } as unknown as Progress;
      checkAchievements(progressSnapshot, wallet as any, bounties);
    }
  };

  const deleteGoal = async (id: number) => {
    if (isElectron()) {
      await window.electronAPI!.deleteFromFolder!(FOLDERS.GOALS, `goal_${id}.json`);
    }
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const addMilestone = async (goalId: number, milestone: Omit<Milestone, 'id'>) => {
    const newMilestone: Milestone = {
      ...milestone,
      id: Date.now(),
      completed: false,
    };

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedGoal = {
      ...goal,
      milestones: [...(goal.milestones || []), newMilestone]
    };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.GOALS, `goal_${goalId}.json`, updatedGoal);
    }

    setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
  };

  const updateMilestone = async (goalId: number, milestoneId: number, updates: Partial<Milestone>) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = (goal.milestones || []).map(m =>
      m.id === milestoneId ? { ...m, ...updates } : m
    );

    const updatedGoal = { ...goal, milestones: updatedMilestones };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.GOALS, `goal_${goalId}.json`, updatedGoal);
    }
    setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
  };

  const deleteMilestone = async (goalId: number, milestoneId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = (goal.milestones || []).filter(m => m.id !== milestoneId);
    const updatedGoal = { ...goal, milestones: updatedMilestones };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.GOALS, `goal_${goalId}.json`, updatedGoal);
    }

    setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
  };

  // ================== BOUNTIES ==================
  const addBounty = async (bounty: Omit<Bounty, 'id' | 'createdAt'>) => {
    const newBounty: Bounty = {
      ...bounty,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.BOUNTIES, `bounty_${newBounty.id}.json`, newBounty);
    }

    setBounties(prev => [newBounty, ...prev]);
  };

  const updateBounty = async (id: number, updates: Partial<Bounty>) => {
    const updatedBounties = bounties.map(b =>
      b.id === id ? { ...b, ...updates } : b
    );
    const updatedBounty = updatedBounties.find(b => b.id === id);

    if (isElectron() && updatedBounty) {
      await window.electronAPI!.saveToFolder!(FOLDERS.BOUNTIES, `bounty_${id}.json`, updatedBounty);
    }

    setBounties(updatedBounties);
  };

  const deleteBounty = async (id: number) => {
    if (isElectron()) {
      await window.electronAPI!.deleteFromFolder!(FOLDERS.BOUNTIES, `bounty_${id}.json`);
    }
    setBounties(prev => prev.filter(b => b.id !== id));
  };

  // ================== FINDINGS (Bugs inside Bounty) ==================
  const addFinding = async (bountyId: number, finding: Omit<import('@/types').Finding, 'id' | 'createdAt'>) => {
    const newFinding: import('@/types').Finding = {
      ...finding,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const updatedBounties = bounties.map(b => {
      if (b.id === bountyId) {
        return { ...b, findings: [...(b.findings || []), newFinding] };
      }
      return b;
    });

    const updatedBounty = updatedBounties.find(b => b.id === bountyId);
    if (isElectron() && updatedBounty) {
      await window.electronAPI!.saveToFolder!(FOLDERS.BOUNTIES, `bounty_${bountyId}.json`, updatedBounty);
    }

    setBounties(updatedBounties);
    return newFinding;
  };

  const updateFinding = async (bountyId: number, findingId: number, updates: Partial<import('@/types').Finding>) => {
    const updatedBounties = bounties.map(b => {
      if (b.id === bountyId) {
        return {
          ...b,
          findings: b.findings?.map(f =>
            f.id === findingId ? { ...f, ...updates } : f
          )
        };
      }
      return b;
    });

    const updatedBounty = updatedBounties.find(b => b.id === bountyId);
    if (isElectron() && updatedBounty) {
      await window.electronAPI!.saveToFolder!(FOLDERS.BOUNTIES, `bounty_${bountyId}.json`, updatedBounty);
    }

    setBounties(updatedBounties);

    // Check achievements when finding status changes to accepted
    if (updates.status === 'accepted') {
      const progressSnapshot = {
        dailyLogs,
        goals,
        bounties: updatedBounties,
        snippets: [],
        notes: [],
        studyHours: { morning: 0, evening: 0, night: 0 },
        wallet: wallet || { balance: 0, transactions: [], financialGoals: [] },
        earnings: 0,
        bugs: 0,
        currentWeek: 1,
        completedRoadmapWeeks: [],
      } as unknown as Progress;
      checkAchievements(progressSnapshot, wallet as any, updatedBounties);
    }
  };

  const deleteFinding = async (bountyId: number, findingId: number) => {
    const updatedBounties = bounties.map(b => {
      if (b.id === bountyId) {
        return { ...b, findings: b.findings?.filter(f => f.id !== findingId) };
      }
      return b;
    });

    const updatedBounty = updatedBounties.find(b => b.id === bountyId);
    if (isElectron() && updatedBounty) {
      await window.electronAPI!.saveToFolder!(FOLDERS.BOUNTIES, `bounty_${bountyId}.json`, updatedBounty);
    }

    setBounties(updatedBounties);
  };

  // ================== WALLET ==================
  const saveWallet = async (walletData: typeof wallet) => {
    if (isElectron()) {
      await window.electronAPI!.saveToFolder!(FOLDERS.WALLET, 'wallet.json', walletData);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: Date.now() };
    const currentBalance = wallet?.balance || 0;
    const currentTransactions = wallet?.transactions || [];

    const newBalance =
      transaction.type === 'income'
        ? currentBalance + transaction.amount
        : currentBalance - transaction.amount;

    const newWallet = {
      balance: newBalance,
      transactions: [newTransaction, ...currentTransactions],
      financialGoals: wallet?.financialGoals || [],
    };

    setWallet(newWallet);
    await saveWallet(newWallet);

    if (transaction.type === 'income') {
      setGeneralProgress(prev => ({
        ...prev,
        earnings: prev.earnings + transaction.amount,
      }));

      // Check achievements when bounty income is added
      if (transaction.category === 'bounty') {
        const progressSnapshot = {
          dailyLogs,
          goals,
          bounties,
          snippets: [],
          notes: [],
          studyHours: { morning: 0, evening: 0, night: 0 },
          wallet: newWallet,
          earnings: 0,
          bugs: 0,
          currentWeek: 1,
          completedRoadmapWeeks: [],
        } as unknown as Progress;
        checkAchievements(progressSnapshot, newWallet as any, bounties);
      }
    }
  };

  const deleteTransaction = async (id: number) => {
    const currentTransactions = wallet?.transactions || [];
    const txToDelete = currentTransactions.find(t => t.id === id);
    if (!txToDelete) return;

    // Fix balance
    const balanceAdjust = txToDelete.type === 'income'
      ? -txToDelete.amount
      : txToDelete.amount;

    const newWallet = {
      balance: (wallet?.balance || 0) + balanceAdjust,
      transactions: currentTransactions.filter(t => t.id !== id),
      financialGoals: wallet?.financialGoals || [],
    };

    setWallet(newWallet);
    await saveWallet(newWallet);

    // Update earnings (if income deleted)
    if (txToDelete.type === 'income') {
      setGeneralProgress(prev => ({
        ...prev,
        earnings: prev.earnings - txToDelete.amount,
      }));
    }
  };

  // ================== FINANCIAL GOALS ==================
  const addFinancialGoal = async (goal: Omit<import('@/types').FinancialGoal, 'id' | 'createdAt'>) => {
    const currentGoals = wallet?.financialGoals || [];
    const newGoal: import('@/types').FinancialGoal = {
      ...goal,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const newWallet = {
      ...wallet,
      balance: wallet?.balance || 0,
      transactions: wallet?.transactions || [],
      financialGoals: [...currentGoals, newGoal],
    };

    setWallet(newWallet);
    await saveWallet(newWallet);
  };

  const updateFinancialGoal = async (id: number, updates: Partial<import('@/types').FinancialGoal>) => {
    const currentGoals = wallet?.financialGoals || [];

    // If setting isPinned to true, unpin all others first
    let updatedGoals = currentGoals;
    if (updates.isPinned === true) {
      updatedGoals = currentGoals.map(g => ({
        ...g,
        isPinned: g.id === id, // Only the target goal gets pinned
      }));
    } else {
      // Normal update
      updatedGoals = currentGoals.map(g => g.id === id ? { ...g, ...updates } : g);
    }

    const newWallet = {
      ...wallet,
      balance: wallet?.balance || 0,
      transactions: wallet?.transactions || [],
      financialGoals: updatedGoals,
    };

    setWallet(newWallet);
    await saveWallet(newWallet);
  };

  const deleteFinancialGoal = async (id: number) => {
    const currentGoals = wallet?.financialGoals || [];
    const newWallet = {
      ...wallet,
      balance: wallet?.balance || 0,
      transactions: wallet?.transactions || [],
      financialGoals: currentGoals.filter(g => g.id !== id),
    };

    setWallet(newWallet);
    await saveWallet(newWallet);
  };

  // ================== MODULES & TOOLS (REMOVED - not used) ==================
  // toggleModule and toggleTool removed as these fields are no longer tracked

  // ================== ROADMAP ==================
  const toggleRoadmapWeek = (week: number) => {
    setGeneralProgress(prev => {
      const isCompleted = prev.completedRoadmapWeeks.includes(week);
      const newCompleted = isCompleted
        ? prev.completedRoadmapWeeks.filter(w => w !== week)
        : [...prev.completedRoadmapWeeks, week];

      const maxCompleted = Math.max(...newCompleted, 0);
      const newCurrentWeek = Math.min(maxCompleted + 1, 8);

      return {
        ...prev,
        completedRoadmapWeeks: newCompleted,
        currentWeek: newCurrentWeek,
      };
    });
  };

  // ================== EXPORT / IMPORT ==================
  const exportData = () => {
    const data = {
      dailyLogs,
      notes,
      snippets,
      goals,
      bounties,
      wallet,
      ...generalProgress,
      exportDate: new Date().toISOString(),
      version: '5.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bug-hunter-progress-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        // Load into states
        if (data.dailyLogs) setDailyLogs(data.dailyLogs);
        if (data.notes) setNotes(data.notes);
        if (data.snippets) setSnippets(data.snippets);
        if (data.goals) setGoals(data.goals);
        if (data.bounties) setBounties(data.bounties);
        if (data.wallet) setWallet(data.wallet);

        // Update GeneralProgress
        setGeneralProgress(prev => ({
          ...prev,
          studyHours: data.studyHours || prev.studyHours,
          earnings: data.earnings || prev.earnings,
          bugs: data.bugs || prev.bugs,
          currentWeek: data.currentWeek || prev.currentWeek,
          completedRoadmapWeeks: data.completedRoadmapWeeks || prev.completedRoadmapWeeks,
        }));

        // Electron'a kaydet
        if (isElectron()) {
          // Notes
          for (const note of (data.notes || [])) {
            await window.electronAPI!.saveToFolder!(FOLDERS.NOTES, `note_${note.id}.json`, note);
          }
          // Snippets
          for (const snippet of (data.snippets || [])) {
            await window.electronAPI!.saveToFolder!(FOLDERS.SNIPPETS, `snippet_${snippet.id}.json`, snippet);
          }
          // Goals
          for (const goal of (data.goals || [])) {
            await window.electronAPI!.saveToFolder!(FOLDERS.GOALS, `goal_${goal.id}.json`, goal);
          }
          // Bounties
          for (const bounty of (data.bounties || [])) {
            await window.electronAPI!.saveToFolder!(FOLDERS.BOUNTIES, `bounty_${bounty.id}.json`, bounty);
          }
        }

      } catch (error) {
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  // ================== PROGRESS OBJECT (for legacy API compatibility) ==================
  const progress: Progress = {
    dailyLogs,
    notes,
    snippets,
    goals,
    bounties,
    wallet,
    studyHours: generalProgress.studyHours,
    earnings: generalProgress.earnings,
    bugs: generalProgress.bugs,
    currentWeek: generalProgress.currentWeek,
    completedRoadmapWeeks: generalProgress.completedRoadmapWeeks,
  };

  return {
    progress,
    isLoading,
    setProgress: () => { }, // Legacy API compatibility - no longer used
    addDailyLog,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    addTransaction,
    deleteTransaction,
    addNote,
    updateNote,
    deleteNote,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addBounty,
    updateBounty,
    deleteBounty,
    addFinding,
    updateFinding,
    deleteFinding,
    addFinancialGoal,
    updateFinancialGoal,
    deleteFinancialGoal,
    toggleRoadmapWeek,
    exportData,
    importData,
    refreshDailyLogs,
  };
};
