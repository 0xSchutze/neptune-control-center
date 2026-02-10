import { useState, memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, TrendingUp, TrendingDown, Trash2, Trophy, Tag, AlertTriangle, X, Star, ImageIcon, Pencil } from 'lucide-react';
import { Transaction, Bounty } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';
import { FinancialGoal } from '@/types';
import ImageCropModal from './ImageCropModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface WalletTabProps {
  balance: number;
  earnings: number;
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: number) => void;
  bounties?: Bounty[];
  financialGoals?: FinancialGoal[];
  onAddFinancialGoal?: (goal: Omit<FinancialGoal, 'id' | 'createdAt'>) => void;
  onUpdateFinancialGoal?: (id: number, updates: Partial<FinancialGoal>) => void;
  onDeleteFinancialGoal?: (id: number) => void;
}

const categories = [
  { value: 'bounty', label: '🏆 Bounty Reward', color: 'text-orange-400' },
  { value: 'salary', label: '💼 Salary', color: 'text-blue-400' },
  { value: 'investment', label: '📈 Investment', color: 'text-green-400' },
  { value: 'expense', label: '💸 Expense', color: 'text-red-400' },
  { value: 'other', label: '📝 Other', color: 'text-[var(--neptune-text-muted)]' },
];

/**
 * OPTIMIZED: Memoized WalletTab with useCallback and useMemo
 */
export const WalletTab = memo(({
  balance,
  earnings,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  bounties = [],
  financialGoals = [],
  onAddFinancialGoal,
  onUpdateFinancialGoal,
  onDeleteFinancialGoal,
}: WalletTabProps) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);

  // Goal image cache - maps imagePath filename to dataUrl
  const [goalImages, setGoalImages] = useState<Record<string, string>>({});

  // Load goal images from media folder
  useEffect(() => {
    const loadGoalImages = async () => {
      if (!window.electronAPI?.readMedia) return;

      const newImages: Record<string, string> = {};
      for (const goal of financialGoals) {
        if (goal.imagePath && !goalImages[goal.imagePath]) {
          try {
            const result = await window.electronAPI.readMedia(goal.imagePath);
            if (result?.success && result.dataUrl) {
              newImages[goal.imagePath] = result.dataUrl;
            }
          } catch (err) {
            console.error('Failed to load goal image:', goal.imagePath, err);
          }
        }
      }
      if (Object.keys(newImages).length > 0) {
        setGoalImages(prev => ({ ...prev, ...newImages }));
      }
    };
    loadGoalImages();
  }, [financialGoals]);

  const [newTransaction, setNewTransaction] = useState<{
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    category: Transaction['category'];
    linkedBountyId?: number;
  }>({
    type: 'income',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other',
    linkedBountyId: undefined,
  });

  const handleSubmit = useCallback(() => {
    if (newTransaction.amount <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }

    onAddTransaction(newTransaction);
    setNewTransaction({
      type: 'income',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: 'other',
      linkedBountyId: undefined,
    });
    toast.success('Transaction recorded!');
  }, [newTransaction, onAddTransaction]);

  const confirmDelete = () => {
    if (deleteConfirmation !== null) {
      onDeleteTransaction(deleteConfirmation);
      setDeleteConfirmation(null);
      toast.success('Transaction deleted!');
    }
  };

  // Financial Goal State
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: 0,
    icon: '🎯',
    imagePath: '' as string,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const goalImageInputRef = useRef<HTMLInputElement>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null); // For crop modal

  // Edit goal state
  const [editingGoal, setEditingGoal] = useState<null | {
    id: number;
    title: string;
    targetAmount: number;
    icon: string;
    imagePath: string;
    newImageData: string; // For cropped image preview before save
  }>(null);
  const editGoalImageInputRef = useRef<HTMLInputElement>(null);
  const [editCropImageSrc, setEditCropImageSrc] = useState<string | null>(null);

  const goalEmojis = ['🎯', '✈️', '💻'];

  const handleAddGoal = useCallback(async () => {
    if (!newGoal.title.trim() || newGoal.targetAmount <= 0) {
      toast.error('Please enter a title and target amount');
      return;
    }
    if (!onAddFinancialGoal) return;

    const goalId = Date.now();
    let savedImagePath = '';

    // If there's an image, save it to media folder
    if (newGoal.imagePath && window.electronAPI?.saveMedia) {
      try {
        // Convert base64 to ArrayBuffer
        const base64Data = newGoal.imagePath.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const fileName = `goal_${goalId}.png`;
        const result = await window.electronAPI.saveMedia(fileName, bytes.buffer);
        if (result?.success) {
          savedImagePath = fileName;
        }
      } catch (err) {
        console.error('Failed to save goal image:', err);
      }
    }

    onAddFinancialGoal({
      title: newGoal.title,
      targetAmount: newGoal.targetAmount,
      icon: newGoal.imagePath ? '' : newGoal.icon, // Clear icon if using image
      imagePath: savedImagePath,
      isPinned: financialGoals.length === 0,
    });
    setNewGoal({ title: '', targetAmount: 0, icon: '🎯', imagePath: '' });
    toast.success('Financial goal added! 🎯');
  }, [newGoal, onAddFinancialGoal, financialGoals.length]);

  const handleToggleStar = useCallback((goalId: number) => {
    if (!onUpdateFinancialGoal) return;
    const goal = financialGoals.find(g => g.id === goalId);
    if (!goal) return;

    if (goal.isPinned) {
      // Unpin this goal
      onUpdateFinancialGoal(goalId, { isPinned: false });
      toast.success('Goal unpinned from Dashboard');
    } else {
      // Pin this goal (hook automatically unpins others)
      onUpdateFinancialGoal(goalId, { isPinned: true });
      toast.success('Goal starred to Dashboard! ⭐');
    }
  }, [financialGoals, onUpdateFinancialGoal]);

  // Auto-format date input with slashes (MM/DD/YYYY) and validate values
  const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    let month = digits.slice(0, 2);
    let day = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    if (month.length === 2 && parseInt(month) > 12) month = '12';
    if (day.length === 2 && parseInt(day) > 31) day = '31';
    if (digits.length <= 2) return month;
    if (digits.length <= 4) return `${month}/${day}`;
    return `${month}/${day}/${year}`;
  };

  const handleGoalImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    // Read file and open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (goalImageInputRef.current) goalImageInputRef.current.value = '';
  }, []);

  // Handle cropped image from modal
  const handleGoalCropComplete = useCallback((croppedBlob: Blob) => {
    setCropImageSrc(null);
    const reader = new FileReader();
    reader.onload = () => {
      setNewGoal(prev => ({ ...prev, icon: '', imagePath: reader.result as string }));
    };
    reader.readAsDataURL(croppedBlob);
  }, []);

  // Start editing a goal
  const startEditGoal = useCallback((goal: FinancialGoal) => {
    setEditingGoal({
      id: goal.id,
      title: goal.title,
      targetAmount: goal.targetAmount,
      icon: goal.icon || '🎯',
      imagePath: goal.imagePath || '',
      newImageData: '',
    });
  }, []);

  // Handle edit goal image select
  const handleEditGoalImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (editGoalImageInputRef.current) editGoalImageInputRef.current.value = '';
  }, []);

  // Handle edit crop complete
  const handleEditCropComplete = useCallback((croppedBlob: Blob) => {
    setEditCropImageSrc(null);
    const reader = new FileReader();
    reader.onload = () => {
      setEditingGoal(prev => prev ? { ...prev, icon: '', newImageData: reader.result as string } : null);
    };
    reader.readAsDataURL(croppedBlob);
  }, []);

  // Save edited goal
  const handleSaveEditGoal = useCallback(async () => {
    if (!editingGoal || !onUpdateFinancialGoal) return;

    let savedImagePath = editingGoal.imagePath;

    // If there's new image data, save it
    if (editingGoal.newImageData && window.electronAPI?.saveMedia) {
      try {
        const base64Data = editingGoal.newImageData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const fileName = `goal_${editingGoal.id}.png`;
        const result = await window.electronAPI.saveMedia(fileName, bytes.buffer);
        if (result?.success) {
          savedImagePath = fileName;
        }
      } catch (err) {
        console.error('Failed to save goal image:', err);
      }
    }

    onUpdateFinancialGoal(editingGoal.id, {
      title: editingGoal.title,
      targetAmount: editingGoal.targetAmount,
      icon: editingGoal.newImageData ? '' : editingGoal.icon,
      imagePath: savedImagePath,
    });

    setEditingGoal(null);
    toast.success('Goal updated! ✅');
  }, [editingGoal, onUpdateFinancialGoal]);


  return (
    <>
      {/* Financial Goals Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] mb-6 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-48 h-48 bg-[var(--neptune-primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider relative z-10">
          <span className="text-2xl">🎯</span>
          Financial Goals
        </h2>

        {/* Add Goal Form */}
        <div className="space-y-3 mb-4 relative z-10">
          <div className="grid grid-cols-12 gap-3">
            {/* Icon/Photo Selector - Inline */}
            <div className="col-span-3 flex items-center gap-1">
              {/* Current preview */}
              <div className="w-9 h-9 bg-[#0a0f16] border border-[var(--neptune-primary-dim)] rounded-md flex items-center justify-center text-xl overflow-hidden">
                {newGoal.imagePath ? (
                  <img src={newGoal.imagePath} alt="goal" className="w-full h-full object-cover" />
                ) : (
                  newGoal.icon || '🎯'
                )}
              </div>
              {/* Emoji buttons */}
              {goalEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewGoal({ ...newGoal, icon: emoji, imagePath: '' })}
                  className={`w-8 h-8 flex items-center justify-center rounded text-base transition-colors ${newGoal.icon === emoji && !newGoal.imagePath ? 'bg-[var(--neptune-primary)]/30 border border-[var(--neptune-primary)]' : 'bg-[#0a0f16] border border-[var(--neptune-primary-dim)] hover:bg-[rgba(255,255,255,0.05)]'}`}
                >
                  {emoji}
                </button>
              ))}
              {/* Photo upload button */}
              <button
                type="button"
                onClick={() => goalImageInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center rounded bg-[#0a0f16] border border-[var(--neptune-primary-dim)] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)]"
                title="Upload image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                ref={goalImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleGoalImageSelect}
                className="hidden"
              />
            </div>
            <div className="col-span-5">
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="Goal name (e.g. MacBook Pro)"
                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] h-9 text-xs font-mono"
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-center h-9 bg-[#0a0f16] border border-[var(--neptune-primary-dim)] rounded-md px-2">
                <span className="text-green-400 font-mono text-sm mr-1">$</span>
                <input
                  type="text"
                  value={newGoal.targetAmount ? newGoal.targetAmount.toLocaleString('en-US') : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '').replace(/\./g, '');
                    const numValue = parseInt(rawValue) || 0;
                    setNewGoal({ ...newGoal, targetAmount: numValue });
                  }}
                  placeholder="Target"
                  className="flex-1 bg-transparent text-green-400 font-mono text-xs outline-none"
                />
              </div>
            </div>
            <div className="col-span-2">
              <Button
                onClick={handleAddGoal}
                disabled={!onAddFinancialGoal}
                className="w-full h-9 bg-[var(--neptune-primary)] hover:bg-[var(--neptune-primary)]/80 text-black font-bold font-mono text-xs uppercase"
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>

        {/* Goals List */}
        <NeptuneScrollbar maxHeight="192px" className="space-y-4 relative z-10 pr-6">
          {financialGoals.length > 0 ? (
            financialGoals.map((goal) => {
              const progress = Math.min((balance / goal.targetAmount) * 100, 100);
              return (
                <div
                  key={goal.id}
                  className={`p-3 rounded-lg border transition-all group mb-3 ${goal.isPinned
                    ? 'bg-[rgba(0,180,216,0.1)] border-[var(--neptune-primary)]/50'
                    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)] hover:border-[var(--neptune-primary-dim)]'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {/* Goal Icon/Image */}
                      <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden bg-[rgba(0,0,0,0.3)]">
                        {goal.imagePath && goalImages[goal.imagePath] ? (
                          <img src={goalImages[goal.imagePath]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{goal.icon || '🎯'}</span>
                        )}
                      </div>
                      <span className="font-display text-sm text-[var(--neptune-text-primary)]">{goal.title}</span>
                      {goal.isPinned && (
                        <span className="text-[9px] bg-[var(--neptune-primary)]/20 text-[var(--neptune-primary)] px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> Dashboard
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        onClick={() => startEditGoal(goal)}
                        className="p-1 rounded text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit goal"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStar(goal.id)}
                        className={`p-1 rounded transition-colors ${goal.isPinned ? 'text-yellow-400 hover:text-yellow-300' : 'text-[var(--neptune-text-muted)] hover:text-yellow-400'}`}
                        title={goal.isPinned ? 'Unstar from Dashboard' : 'Star to Dashboard'}
                      >
                        <Star className={`w-4 h-4 ${goal.isPinned ? 'fill-current' : ''}`} />
                      </button>
                      {onDeleteFinancialGoal && (
                        <button
                          onClick={() => onDeleteFinancialGoal(goal.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[rgba(0,0,0,0.5)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--neptune-primary)] to-[var(--neptune-secondary)] shadow-[0_0_10px_var(--neptune-primary)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--neptune-text-secondary)]">
                      ${balance.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--neptune-primary)]">{progress.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-[var(--neptune-text-muted)] text-xs font-mono">
              No financial goals yet. Add one above! ☝️
            </div>
          )}
        </NeptuneScrollbar>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 relative">
        {/* Add Transaction */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider relative z-10">
            <DollarSign className="w-5 h-5 text-[var(--neptune-primary)]" />
            Wallet
          </h2>

          {/* Balance Card */}
          <div className="relative rounded-xl p-6 mb-6 overflow-hidden border border-green-500/30 group">
            <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors duration-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="text-xs font-mono text-green-400/80 mb-1 uppercase tracking-widest">Current Balance</div>
              <div className="text-4xl font-bold font-display text-white drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                ${balance.toLocaleString()}
              </div>
              <div className="text-xs font-mono text-white/50 mt-3 flex items-center gap-2">
                <span>Total Earnings:</span>
                <span className="text-green-400 font-bold">${earnings.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Transaction Type</Label>
                <Select
                  value={newTransaction.type}
                  onValueChange={(v) =>
                    setNewTransaction({ ...newTransaction, type: v as any })
                  }
                >
                  <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                    <SelectItem value="income" className="text-xs font-mono text-green-400">💰 Income</SelectItem>
                    <SelectItem value="expense" className="text-xs font-mono text-red-400">💸 Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Amount ($)</Label>
                <Input
                  type="text"
                  value={newTransaction.amount ? newTransaction.amount.toLocaleString('en-US') : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '').replace(/\./g, '');
                    const numValue = parseFloat(rawValue) || 0;
                    setNewTransaction({
                      ...newTransaction,
                      amount: numValue,
                    });
                  }}
                  className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono focus:border-[var(--neptune-primary)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Category</Label>
              <div className="flex gap-2">
                <Select
                  value={newTransaction.category}
                  onValueChange={(v) => setNewTransaction({ ...newTransaction, category: v as any })}
                >
                  <SelectTrigger className="flex-1 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs font-mono">
                        <span className={c.color}>{c.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {newTransaction.category === 'bounty' && bounties.length > 0 && (
                  <Select
                    value={newTransaction.linkedBountyId?.toString()}
                    onValueChange={(v) => {
                      const selectedBounty = bounties.find(b => b.id === parseInt(v));
                      setNewTransaction({
                        ...newTransaction,
                        linkedBountyId: parseInt(v),
                        amount: selectedBounty?.reward || newTransaction.amount,
                        description: selectedBounty ? `${selectedBounty.contest} reward` : newTransaction.description,
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                      <SelectValue placeholder="Link Bounty" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                      {bounties.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()} className="text-xs font-mono">
                          {b.contest} - ${b.reward}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Notes</Label>
              <Input
                value={newTransaction.description}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    description: e.target.value,
                  })
                }
                placeholder="Details..."
                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] h-9 text-xs font-mono focus:border-[var(--neptune-primary)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Date</Label>
              <DatePicker
                selected={newTransaction.date ? new Date(newTransaction.date) : null}
                onChange={(date: Date | null) => setNewTransaction({ ...newTransaction, date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0] })}
                onChangeRaw={(e) => {
                  const input = e?.target as HTMLInputElement;
                  if (input?.value) {
                    input.value = formatDateInput(input.value);
                  }
                }}
                dateFormat="MM/dd/yyyy"
                placeholderText="MM/DD/YYYY"
                className="w-full"
              />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-[var(--neptune-primary)] hover:bg-[var(--neptune-secondary)] text-black font-bold font-mono text-xs uppercase transition-all duration-300 shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.3)] hover:shadow-[0_0_20px_rgba(var(--neptune-secondary-rgb),0.5)]">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div >
        </motion.div >

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)]"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider">
            <Tag className="w-5 h-5 text-[var(--neptune-secondary)]" />
            Transaction History
          </h2>
          <NeptuneScrollbar maxHeight="500px" className="space-y-4 pr-6">
            {transactions && transactions.length > 0 ? (
              transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-xl border transition-all relative overflow-hidden group mb-3 ${tx.type === 'income'
                    ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/30'
                    : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      {tx.type === 'income' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className="font-mono text-xs text-[var(--neptune-text-secondary)]">{tx.date}</span>
                      {tx.category && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#0a0f16] border border-opacity-20 ${categories.find(c => c.value === tx.category)?.color || 'text-gray-400 border-gray-500'
                          }`}>
                          {categories.find(c => c.value === tx.category)?.label || tx.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold font-mono tracking-tighter ${tx.type === 'income' ? 'text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.3)]' : 'text-red-400'
                          }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}${tx.amount}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmation(tx.id)}
                        className="h-6 w-6 p-0 text-[var(--neptune-text-muted)] hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-[var(--neptune-text-secondary)] pl-6 border-l border-[var(--neptune-text-muted)] opacity-70">
                    {tx.description || 'No description'}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]">
                <DollarSign className="w-8 h-8 text-[var(--neptune-text-muted)] mx-auto mb-2" />
                <p className="text-sm font-display text-[var(--neptune-text-secondary)]">No transactions yet</p>
              </div>
            )}
          </NeptuneScrollbar>
        </motion.div >
      </div >

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmation(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="neptune-glass-panel w-full max-w-md p-6 rounded-2xl border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] relative overflow-hidden"
            >
              {/* Danger Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4 text-red-400">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display tracking-wide text-white">Delete Transaction?</h3>
                    <p className="text-xs text-red-300/70 font-mono">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--neptune-text-secondary)] mb-6 font-mono border-l-2 border-red-500/30 pl-3 py-1">
                  Are you sure you want to remove this record from your financial history?
                </p>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteConfirmation(null)}
                    className="hover:bg-white/5 text-[var(--neptune-text-muted)] hover:text-white font-mono text-xs uppercase"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDelete}
                    className="bg-red-500 hover:bg-red-600 text-white font-mono text-xs uppercase shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] transition-all"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Confirm Deletion
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteConfirmation(null)}
                className="absolute top-2 right-2 text-white/20 hover:text-white hover:bg-white/5 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Image Crop Modal */}
      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropComplete={handleGoalCropComplete}
          cropShape="rect"
        />
      )}

      {/* Edit Crop Modal */}
      {editCropImageSrc && (
        <ImageCropModal
          imageSrc={editCropImageSrc}
          onClose={() => setEditCropImageSrc(null)}
          onCropComplete={handleEditCropComplete}
          cropShape="rect"
        />
      )}

      {/* Edit Goal Modal */}
      <AnimatePresence>
        {editingGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditingGoal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-display text-[var(--neptune-text-primary)] mb-4">Edit Goal</h3>

              <div className="space-y-4">
                {/* Icon/Image Selector */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-lg bg-[#0a0f16] border border-[var(--neptune-primary-dim)] flex items-center justify-center overflow-hidden">
                    {editingGoal.newImageData ? (
                      <img src={editingGoal.newImageData} alt="" className="w-full h-full object-cover" />
                    ) : editingGoal.imagePath && goalImages[editingGoal.imagePath] ? (
                      <img src={goalImages[editingGoal.imagePath]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{editingGoal.icon}</span>
                    )}
                  </div>
                  {goalEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditingGoal({ ...editingGoal, icon: emoji, newImageData: '' })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${editingGoal.icon === emoji && !editingGoal.newImageData ? 'bg-[var(--neptune-primary)]/30 border border-[var(--neptune-primary)]' : 'bg-[#0a0f16] border border-[var(--neptune-primary-dim)] hover:bg-[rgba(255,255,255,0.05)]'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => editGoalImageInputRef.current?.click()}
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#0a0f16] border border-[var(--neptune-primary-dim)] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)]"
                    title="Upload image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    ref={editGoalImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditGoalImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)] block mb-1">Goal Name</label>
                  <Input
                    value={editingGoal.title}
                    onChange={e => setEditingGoal({ ...editingGoal, title: e.target.value })}
                    className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]"
                  />
                </div>

                {/* Target Amount */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)] block mb-1">Target Amount ($)</label>
                  <Input
                    type="text"
                    value={editingGoal.targetAmount ? editingGoal.targetAmount.toLocaleString('en-US') : ''}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/,/g, '').replace(/\./g, '');
                      setEditingGoal({ ...editingGoal, targetAmount: parseInt(rawValue) || 0 });
                    }}
                    className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-green-400 font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setEditingGoal(null)}
                    variant="outline"
                    className="flex-1 border-[var(--neptune-primary-dim)] text-[var(--neptune-text-muted)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEditGoal}
                    className="flex-1 bg-[var(--neptune-primary)] hover:bg-[var(--neptune-primary)]/80 text-black font-bold"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
WalletTab.displayName = 'WalletTab';
