import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, CheckCircle, Clock, Pause, Trophy, Calendar, Bug, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Goal, Bounty, Finding, Milestone } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface GoalsTabProps {
  goals: Goal[];
  bounties: Bounty[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (id: number, updates: Partial<Goal>) => void;
  onDeleteGoal: (id: number) => void;
  onAddBounty: (bounty: Omit<Bounty, 'id' | 'createdAt'>) => void;
  onUpdateBounty: (id: number, updates: Partial<Bounty>) => void;
  onDeleteBounty: (id: number) => void;
  onAddFinding: (bountyId: number, finding: Omit<Finding, 'id' | 'createdAt'>) => void;
  onUpdateFinding: (bountyId: number, findingId: number, updates: Partial<Finding>) => void;
  onDeleteFinding: (bountyId: number, findingId: number) => void;
  onAddMilestone: (goalId: number, milestone: Omit<Milestone, 'id'>) => void;
  onUpdateMilestone: (goalId: number, milestoneId: number, updates: Partial<Milestone>) => void;
  onDeleteMilestone: (goalId: number, milestoneId: number) => void;
}

const platforms = [
  { value: 'code4rena', label: 'Code4rena' },
  { value: 'sherlock', label: 'Sherlock' },
  { value: 'immunefi', label: 'Immunefi' },
  { value: 'hackerone', label: 'HackerOne' },
  { value: 'cantina', label: 'Cantina' },
  { value: 'codehawks', label: 'CodeHawks' },
  { value: 'other', label: 'Other' },
];

const goalCategories = [
  { value: 'learning', label: '📚 Learning', color: 'text-blue-400' },
  { value: 'skill', label: '⚡ Skill', color: 'text-purple-400' },
  { value: 'other', label: '🎯 Other', color: 'text-gray-400' },
];

const priorityLevels = [
  { value: 'low', label: 'Low', color: 'text-gray-400 border-gray-500/30' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400 border-yellow-500/30' },
  { value: 'high', label: 'High', color: 'text-red-400 border-red-500/30' },
];

const statusColors = {
  active: 'bg-[rgba(var(--neptune-primary-rgb),0.1)] text-[var(--neptune-primary)] border-[var(--neptune-primary)] shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.2)]',
  completed: 'bg-green-500/10 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50',
  ongoing: 'bg-[rgba(var(--neptune-primary-rgb),0.1)] text-[var(--neptune-primary)] border-[var(--neptune-primary)]',
  submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/50',
  won: 'bg-green-500/10 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.4)]',
  lost: 'bg-red-500/10 text-red-400 border-red-500/50',
};

export const GoalsTab = memo(({
  goals,
  bounties,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddBounty,
  onUpdateBounty,
  onDeleteBounty,
  onAddFinding,
  onUpdateFinding,
  onDeleteFinding,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
}: GoalsTabProps) => {
  const [newGoal, setNewGoal] = useState({
    title: '',
    deadline: '',
    status: 'active' as const,
    progress: 0,
    category: 'learning' as 'learning' | 'skill' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const [newBounty, setNewBounty] = useState({
    platform: 'code4rena',
    contest: '',
    status: 'ongoing' as const,
    submission: '',
    reward: 0,
    url: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  // Expanded bounty state for Findings
  const [expandedBountyId, setExpandedBountyId] = useState<number | null>(null);
  const [newFinding, setNewFinding] = useState<{
    severity: Finding['severity'];
    title: string;
    status: Finding['status'];
  }>({
    severity: 'Medium',
    title: '',
    status: 'draft',
  });

  const severityColors = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
    High: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
    Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
    Low: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
    Informational: 'bg-gray-500/10 text-gray-500 border-gray-500/50',
  };

  const handleAddFinding = (bountyId: number) => {
    if (!newFinding.title.trim()) {
      toast.error('Finding title is required!');
      return;
    }
    onAddFinding(bountyId, newFinding);
    setNewFinding({ severity: 'Medium', title: '', status: 'draft' });
    toast.success('Finding added! 🐛');
  };

  // Milestone State
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  const [newMilestone, setNewMilestone] = useState('');

  const handleAddMilestone = (goalId: number) => {
    if (!newMilestone.trim()) {
      toast.error('Milestone title is required!');
      return;
    }
    onAddMilestone(goalId, { title: newMilestone, completed: false });
    setNewMilestone('');
    toast.success('Milestone added! ⛳');
  };

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) {
      toast.error('Goal title is required!');
      return;
    }
    onAddGoal(newGoal);
    setNewGoal({ title: '', deadline: '', status: 'active', progress: 0, category: 'learning', priority: 'medium' });
    toast.success('Goal added! 🎯');
  };

  // Auto-format date input with slashes (MM/DD/YYYY) and validate values
  const formatDateInput = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Extract and validate month/day
    let month = digits.slice(0, 2);
    let day = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    // Validate month (max 12)
    if (month.length === 2 && parseInt(month) > 12) {
      month = '12';
    }

    // Validate day (max 31)
    if (day.length === 2 && parseInt(day) > 31) {
      day = '31';
    }

    // Format with slashes
    if (digits.length <= 2) {
      return month;
    } else if (digits.length <= 4) {
      return `${month}/${day}`;
    } else {
      return `${month}/${day}/${year}`;
    }
  };

  const handleAddBounty = () => {
    if (!newBounty.contest.trim()) {
      toast.error('Contest name is required!');
      return;
    }
    onAddBounty(newBounty);
    setNewBounty({ platform: 'code4rena', contest: '', status: 'ongoing', submission: '', reward: 0, url: '', startDate: '', endDate: '', notes: '' });
    toast.success('Bounty added! 🏆');
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalRewards = bounties.filter(b => b.status === 'won').reduce((sum, b) => sum + b.reward, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neptune-glass-panel rounded-xl p-4 border border-[var(--neptune-primary-dim)] text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--neptune-primary-rgb),0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <Target className="w-6 h-6 mx-auto mb-2 text-[var(--neptune-primary)] drop-shadow-[0_0_8px_var(--neptune-primary)]" />
          <div className="text-3xl font-display font-bold text-white drop-shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.5)]">{activeGoals.length}</div>
          <div className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-widest mt-1">Active Goals</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neptune-glass-panel rounded-xl p-4 border border-[rgba(var(--neptune-secondary-rgb),0.3)] text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--neptune-secondary-rgb),0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <CheckCircle className="w-6 h-6 mx-auto mb-2 text-[var(--neptune-secondary)] drop-shadow-[0_0_8px_var(--neptune-secondary)]" />
          <div className="text-3xl font-display font-bold text-white drop-shadow-[0_0_10px_rgba(var(--neptune-secondary-rgb),0.5)]">{completedGoals.length}</div>
          <div className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-widest mt-1">Completed</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="neptune-glass-panel rounded-xl p-4 border border-orange-500/30 text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <Trophy className="w-6 h-6 mx-auto mb-2 text-orange-500 drop-shadow-[0_0_8px_orange]" />
          <div className="text-3xl font-display font-bold text-white drop-shadow-[0_0_10px_orange]">{bounties.length}</div>
          <div className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-widest mt-1">Active Bounties</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="neptune-glass-panel rounded-xl p-4 border border-green-500/30 text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="text-3xl font-display font-bold text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)] mb-1">${totalRewards}</div>
          <div className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-widest">Total Bounty</div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Goals Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)]"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider">
            <Target className="w-5 h-5 text-[var(--neptune-primary)]" />
            GOALS
          </h2>

          {/* Add Goal Form */}
          <div className="space-y-3 mb-6 p-4 bg-[rgba(0,0,0,0.3)] rounded-xl border border-[rgba(255,255,255,0.05)]">
            {/* Title - Full width */}
            <div>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="Goal title..."
                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] focus:border-[var(--neptune-primary)] focus:ring-[var(--neptune-primary)] h-9 text-xs font-mono"
              />
            </div>

            {/* Category - Full width */}
            <div>
              <span className="text-[9px] text-[var(--neptune-text-muted)] uppercase mb-1 block font-mono">Category</span>
              <Select
                value={newGoal.category}
                onValueChange={(v: 'learning' | 'skill' | 'other') => setNewGoal({ ...newGoal, category: v })}
              >
                <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                  {goalCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value} className={`text-xs font-mono ${c.color}`}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority - Full width */}
            <div>
              <span className="text-[9px] text-[var(--neptune-text-muted)] uppercase mb-1 block font-mono">Priority</span>
              <Select
                value={newGoal.priority}
                onValueChange={(v: 'low' | 'medium' | 'high') => setNewGoal({ ...newGoal, priority: v })}
              >
                <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                  {priorityLevels.map((p) => (
                    <SelectItem key={p.value} value={p.value} className={`text-xs font-mono ${p.color}`}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline - Full width */}
            <div>
              <span className="text-[9px] text-[var(--neptune-text-muted)] uppercase mb-1 block font-mono">Deadline</span>
              <DatePicker
                selected={newGoal.deadline ? new Date(newGoal.deadline) : null}
                onChange={(date: Date | null) => setNewGoal({ ...newGoal, deadline: date ? date.toISOString().split('T')[0] : '' })}
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

            {/* Add Button - Full width */}
            <Button onClick={handleAddGoal} className="w-full bg-[var(--neptune-primary)] hover:bg-[var(--neptune-secondary)] text-black font-bold font-mono text-xs uppercase transition-all duration-300 h-9">
              <Plus className="w-4 h-4 mr-1" /> Add Goal
            </Button>
          </div>

          {/* Goals List */}
          <NeptuneScrollbar maxHeight="400px" className="space-y-3 pr-6">
            {goals.length > 0 ? (
              goals.map((goal, i) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.05)] hover:border-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.05)] transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[var(--neptune-text-primary)] font-display tracking-wide">{goal.title}</h4>
                        {goal.category && (
                          <Badge variant="outline" className={`text-[9px] uppercase font-mono px-1.5 py-0 rounded border-transparent ${goalCategories.find(c => c.value === goal.category)?.color || 'text-gray-400'}`}>
                            {goalCategories.find(c => c.value === goal.category)?.label || goal.category}
                          </Badge>
                        )}
                        {goal.priority && (
                          <Badge variant="outline" className={`text-[9px] uppercase font-mono px-1.5 py-0 rounded ${priorityLevels.find(p => p.value === goal.priority)?.color || 'text-gray-400 border-gray-500/30'}`}>
                            {goal.priority}
                          </Badge>
                        )}
                      </div>
                      {goal.deadline && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--neptune-text-muted)] mt-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          Deadline: {new Date(goal.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${statusColors[goal.status]}`}>
                        {goal.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        onClick={() => onDeleteGoal(goal.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--neptune-primary)] shadow-[0_0_10px_var(--neptune-primary)]" style={{ width: `${goal.progress}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold text-[var(--neptune-primary)] w-10 text-right">{goal.progress}%</span>
                  </div>

                  {/* Goal Actions & Milestones Toggle */}
                  <div className="flex justify-between items-center mt-3 border-t border-[rgba(255,255,255,0.05)] pt-3">
                    <button
                      onClick={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                      className="flex items-center gap-2 text-xs text-[var(--neptune-secondary)] hover:text-white transition-colors font-mono uppercase"
                    >
                      <Target className="w-3 h-3" />
                      <span>Sub-Tasks ({goal.milestones?.length || 0})</span>
                      {expandedGoalId === goal.id ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] font-mono border-[var(--neptune-primary-dim)] hover:border-[var(--neptune-primary)] text-[var(--neptune-text-secondary)] hover:text-white bg-transparent"
                        onClick={() => onUpdateGoal(goal.id, { progress: Math.min(100, goal.progress + 10) })}
                      >
                        +10%
                      </Button>
                      {goal.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] font-mono border-green-500/30 hover:border-green-500 text-green-500 hover:text-green-400 hover:bg-green-500/10 bg-transparent"
                          onClick={() => onUpdateGoal(goal.id, { status: 'completed', progress: 100 })}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> COMPLETE
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Milestones Section */}
                  <AnimatePresence>
                    {expandedGoalId === goal.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 pl-2 border-l border-[var(--neptune-primary-dim)]">
                          {/* Add Milestone Form */}
                          <div className="flex gap-2 items-center mb-2">
                            <Input
                              value={newMilestone}
                              onChange={(e) => setNewMilestone(e.target.value)}
                              placeholder="New sub-task..."
                              className="h-6 text-[10px] flex-1 bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] font-mono"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone(goal.id)}
                            />
                            <Button
                              size="sm"
                              className="h-6 w-6 p-0 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-white"
                              onClick={() => handleAddMilestone(goal.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Milestones List */}
                          {goal.milestones && goal.milestones.length > 0 ? (
                            goal.milestones.map((milestone) => (
                              <div key={milestone.id} className="flex items-center gap-2 group p-1 hover:bg-[rgba(255,255,255,0.02)] rounded">
                                <button
                                  onClick={() => onUpdateMilestone(goal.id, milestone.id, { completed: !milestone.completed })}
                                  className={`flex-shrink-0 w-3 h-3 rounded flex items-center justify-center transition-colors border ${milestone.completed
                                    ? 'bg-green-500 border-green-500 text-black'
                                    : 'border-[var(--neptune-text-muted)] hover:border-[var(--neptune-primary)] bg-transparent'
                                    }`}
                                >
                                  {milestone.completed && <CheckCircle className="w-2.5 h-2.5" />}
                                </button>
                                <span className={`text-[10px] font-mono flex-1 transition-colors ${milestone.completed ? 'line-through text-[var(--neptune-text-muted)]' : 'text-[var(--neptune-text-secondary)]'
                                  }`}>
                                  {milestone.title}
                                </span >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                                  onClick={() => onDeleteMilestone(goal.id, milestone.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-[var(--neptune-text-muted)] py-1 font-mono italic">No sub-tasks defined.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]">
                <Target className="w-8 h-8 text-[var(--neptune-text-muted)] mx-auto mb-2" />
                <p className="text-sm font-display text-[var(--neptune-text-secondary)]">No goals yet</p>
              </div>
            )}
          </NeptuneScrollbar>
        </motion.div>

        {/* Bounties Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)]"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider">
            <Trophy className="w-5 h-5 text-orange-500" />
            BUG BOUNTIES
          </h2>

          {/* Add Bounty Form */}
          <div className="space-y-3 mb-6 p-4 bg-[rgba(0,0,0,0.3)] rounded-xl border border-[rgba(255,255,255,0.05)]">
            <div className="grid grid-cols-4 gap-3">
              <Select
                value={newBounty.platform}
                onValueChange={(v) => setNewBounty({ ...newBounty, platform: v })}
              >
                <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                  {platforms.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs font-mono">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newBounty.contest}
                onChange={(e) => setNewBounty({ ...newBounty, contest: e.target.value })}
                placeholder="Protocol Name..."
                className="col-span-2 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] focus:border-orange-500 focus:ring-orange-500 h-9 text-xs font-mono"
              />
              <Input
                type="text"
                value={newBounty.reward ? newBounty.reward.toLocaleString('en-US') : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/,/g, '').replace(/\./g, '');
                  setNewBounty({ ...newBounty, reward: Number(rawValue) || 0 });
                }}
                placeholder="Reward $"
                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-green-400 placeholder:text-[var(--neptune-text-muted)] focus:border-green-500 focus:ring-green-500 h-9 text-xs font-mono"
              />
              <div className="col-span-4">
                <Input
                  value={newBounty.url}
                  onChange={(e) => setNewBounty({ ...newBounty, url: e.target.value })}
                  placeholder="https://... (Contest URL)"
                  className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] focus:border-orange-500 focus:ring-orange-500 h-9 text-xs font-mono"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-[10px] text-[var(--neptune-text-muted)] whitespace-nowrap">Start:</span>
                <DatePicker
                  selected={newBounty.startDate ? new Date(newBounty.startDate) : null}
                  onChange={(date: Date | null) => setNewBounty({ ...newBounty, startDate: date ? date.toISOString().split('T')[0] : '' })}
                  onChangeRaw={(e) => {
                    const input = e?.target as HTMLInputElement;
                    if (input?.value) {
                      input.value = formatDateInput(input.value);
                    }
                  }}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="MM/DD/YYYY"
                  className="flex-1"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-[10px] text-[var(--neptune-text-muted)] whitespace-nowrap">End:</span>
                <DatePicker
                  selected={newBounty.endDate ? new Date(newBounty.endDate) : null}
                  onChange={(date: Date | null) => setNewBounty({ ...newBounty, endDate: date ? date.toISOString().split('T')[0] : '' })}
                  onChangeRaw={(e) => {
                    const input = e?.target as HTMLInputElement;
                    if (input?.value) {
                      input.value = formatDateInput(input.value);
                    }
                  }}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="MM/DD/YYYY"
                  className="flex-1"
                />
              </div>
              <div className="col-span-4">
                <textarea
                  value={newBounty.notes}
                  onChange={(e) => setNewBounty({ ...newBounty, notes: e.target.value })}
                  placeholder="Notes about this contest..."
                  rows={2}
                  className="w-full bg-[#0a0f16] border border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] focus:border-orange-500 focus:ring-orange-500 text-xs font-mono rounded-md px-3 py-2 resize-none"
                />
              </div>
            </div>
            <Button onClick={handleAddBounty} className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold font-mono text-xs uppercase transition-all duration-300">
              <Plus className="w-4 h-4 mr-1" /> Add Bounty
            </Button>
          </div>

          {/* Bounties List */}
          <NeptuneScrollbar maxHeight="400px" className="space-y-3 pr-6" style={{ overflowX: 'hidden' }}>
            {bounties.length > 0 ? (
              bounties.map((bounty, i) => (
                <motion.div
                  key={bounty.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.05)] hover:border-orange-500 hover:bg-[rgba(249,115,22,0.05)] transition-all duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-[#0a0f16] border-gray-700 text-gray-400 font-mono uppercase">
                          {platforms.find(p => p.value === bounty.platform)?.label}
                        </Badge>
                        <h4 className="font-bold text-[var(--neptune-text-primary)] font-display tracking-wide">{bounty.contest}</h4>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-sm text-[var(--neptune-text-muted)] font-mono">$</span>
                        <input
                          type="number"
                          value={bounty.reward || 0}
                          onChange={(e) => onUpdateBounty(bounty.id, { reward: Number(e.target.value) || 0 })}
                          className="w-20 bg-transparent border-b border-transparent hover:border-green-500/50 focus:border-green-500 text-lg font-bold text-green-400 font-mono drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] outline-none transition-colors"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${statusColors[bounty.status]}`}>
                        {bounty.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        onClick={() => onDeleteBounty(bounty.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Bounty Details: URL, Dates, Notes */}
                  <div className="mt-2 space-y-1">
                    {bounty.url && (
                      <a
                        href={bounty.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-mono truncate"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{bounty.url}</span>
                      </a>
                    )}
                    {(bounty.startDate || bounty.endDate) && (
                      <div className="flex items-center gap-2 text-[10px] text-[var(--neptune-text-muted)] font-mono">
                        <Calendar className="w-3 h-3" />
                        {bounty.startDate && <span>{new Date(bounty.startDate).toLocaleDateString()}</span>}
                        {bounty.startDate && bounty.endDate && <span>→</span>}
                        {bounty.endDate && <span>{new Date(bounty.endDate).toLocaleDateString()}</span>}
                      </div>
                    )}
                    {bounty.notes && (
                      <p className="text-[10px] text-[var(--neptune-text-muted)] font-mono italic line-clamp-2">
                        {bounty.notes}
                      </p>
                    )}
                  </div>

                  {/* Findings Toggle Button */}
                  <div className="mt-3 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-3">
                    <button
                      onClick={() => setExpandedBountyId(expandedBountyId === bounty.id ? null : bounty.id)}
                      className="flex items-center gap-2 text-xs text-[var(--neptune-secondary)] hover:text-white transition-colors font-mono uppercase"
                    >
                      <Bug className="w-3 h-3" />
                      <span>Findings ({bounty.findings?.length || 0})</span>
                      {expandedBountyId === bounty.id ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {/* Status Update Buttons */}
                    <div className="flex gap-1">
                      {bounty.status === 'ongoing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] font-mono border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400 bg-transparent"
                          onClick={() => onUpdateBounty(bounty.id, { status: 'submitted' })}
                        >
                          Submit Report
                        </Button>
                      )}
                      {bounty.status === 'submitted' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] font-mono border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-400 bg-transparent"
                            onClick={() => onUpdateBounty(bounty.id, { status: 'won' })}
                          >
                            Won
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] font-mono border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 bg-transparent"
                            onClick={() => onUpdateBounty(bounty.id, { status: 'lost' })}
                          >
                            Lost
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Findings Section - Expanded */}
                  <AnimatePresence>
                    {expandedBountyId === bounty.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 pl-2 border-l border-orange-500/30">
                          {/* Add Finding Form */}
                          <div className="flex gap-2 items-center">
                            <select
                              value={newFinding.severity}
                              onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value as Finding['severity'] })}
                              className="text-[10px] bg-[#0a0f16] border border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] rounded px-1 py-1 font-mono uppercase focus:outline-none focus:border-orange-500"
                            >
                              <option value="Critical">Critical</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                              <option value="Informational">Info</option>
                            </select>
                            <Input
                              value={newFinding.title}
                              onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
                              placeholder="Bug Title..."
                              className="h-6 text-[10px] flex-1 bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] font-mono"
                            />
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-orange-500/20 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-500/50"
                              onClick={() => handleAddFinding(bounty.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Findings List */}
                          {bounty.findings && bounty.findings.length > 0 ? (
                            bounty.findings.map((finding) => (
                              <div
                                key={finding.id}
                                className="flex items-center justify-between bg-[rgba(0,0,0,0.2)] rounded-lg p-2 border border-[rgba(255,255,255,0.02)]"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-[9px] uppercase font-mono px-1.5 py-0 rounded ${severityColors[finding.severity]}`}>
                                    {finding.severity}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-[var(--neptune-text-secondary)]">{finding.title}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <select
                                    value={finding.status}
                                    onChange={(e) => onUpdateFinding(bounty.id, finding.id, { status: e.target.value as Finding['status'] })}
                                    className={`text-[9px] bg-[#0a0f16] border rounded px-1 py-0.5 font-mono uppercase cursor-pointer focus:outline-none ${finding.status === 'accepted' ? 'border-green-500 text-green-500' :
                                      finding.status === 'rejected' ? 'border-red-500 text-red-500' :
                                        finding.status === 'duplicate' ? 'border-orange-500 text-orange-500' :
                                          finding.status === 'submitted' ? 'border-blue-500 text-blue-500' :
                                            'border-[var(--neptune-text-muted)] text-[var(--neptune-text-muted)]'
                                      }`}
                                  >
                                    <option value="draft">Draft</option>
                                    <option value="submitted">Sent</option>
                                    <option value="accepted">Valid</option>
                                    <option value="rejected">Reject</option>
                                    <option value="duplicate">Dup</option>
                                  </select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-red-500 opacity-50 hover:opacity-100 transition-opacity"
                                    onClick={() => onDeleteFinding(bounty.id, finding.id)}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-[var(--neptune-text-muted)] py-1 font-mono italic">No vulnerabilities recorded.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]">
                <Trophy className="w-8 h-8 text-[var(--neptune-text-muted)] mx-auto mb-2" />
                <p className="text-sm font-display text-[var(--neptune-text-secondary)]">No bounties yet</p>
              </div>
            )}
          </NeptuneScrollbar>
        </motion.div>
      </div>
    </div>
  );
});
GoalsTab.displayName = 'GoalsTab';
