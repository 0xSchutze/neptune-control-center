// LearningRoadmap.tsx - AI-Powered Dynamic Learning Roadmap
import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map, Check, ExternalLink, BookOpen, Video, Code,
  Sparkles, Loader2, Trash2, Plus, RefreshCw, Target,
  Clock, Github, GraduationCap, AlertCircle, X, Edit3,
  ChevronUp, ChevronDown, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';
import type { RoadmapMilestone, RoadmapResource } from '@/types';

interface LearningRoadmapProps {
  roadmap: {
    goal: string;
    generatedAt: string;
    milestones: RoadmapMilestone[];
  } | null;
  isGenerating: boolean;
  generationProgress: string;
  error: string | null;
  apiKey: string;
  onGenerate: (goal: string, apiKey: string) => Promise<void>;
  onToggleMilestone: (id: number) => void;
  onDeleteMilestone: (id: number) => void;
  onUpdateMilestone: (id: number, updates: Partial<RoadmapMilestone>) => void;
  onMoveMilestone: (id: number, direction: 'up' | 'down') => void;
  onAddMilestone: (milestone: Omit<RoadmapMilestone, 'id' | 'isCompleted'>) => void;
  onClearRoadmap: () => void;
}

const resourceIcons: Record<RoadmapResource['type'], any> = {
  docs: BookOpen,
  video: Video,
  interactive: Code,
  github: Github,
  course: GraduationCap,
};

const resourceColors: Record<RoadmapResource['type'], string> = {
  docs: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  video: 'text-red-400 border-red-500/30 bg-red-500/10',
  interactive: 'text-green-400 border-green-500/30 bg-green-500/10',
  github: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  course: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
};

export const LearningRoadmap = memo(({
  roadmap,
  isGenerating,
  generationProgress,
  error,
  apiKey,
  onGenerate,
  onToggleMilestone,
  onDeleteMilestone,
  onUpdateMilestone,
  onMoveMilestone,
  onAddMilestone,
  onClearRoadmap,
}: LearningRoadmapProps) => {
  const [goalInput, setGoalInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<RoadmapMilestone | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    topics: [''],
    resources: [] as RoadmapResource[],
    estimatedHours: 5
  });

  const completedCount = roadmap?.milestones?.filter(m => m.isCompleted).length || 0;
  const totalCount = roadmap?.milestones?.length || 0;
  const totalProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const totalHours = roadmap?.milestones?.reduce((acc, m) => acc + m.estimatedHours, 0) || 0;

  const handleGenerate = () => {
    if (goalInput.trim()) {
      onGenerate(goalInput.trim(), apiKey);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !isGenerating) {
      handleGenerate();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(var(--neptune-primary-rgb),0.1)] border border-[var(--neptune-primary)] flex items-center justify-center shadow-[0_0_15px_rgba(var(--neptune-primary-rgb),0.3)]">
            <Map className="w-6 h-6 text-[var(--neptune-primary)]" />
          </div>
          <div>
            <h3 className="font-bold text-xl font-display text-white tracking-wider flex items-center gap-2">
              AI LEARNING ROADMAP
              <Sparkles className="w-4 h-4 text-[var(--neptune-secondary)]" />
            </h3>
            <p className="text-xs font-mono text-[var(--neptune-text-muted)]">
              {roadmap ? `PROGRESS: ${totalProgress.toFixed(0)}%` : 'DESCRIBE YOUR LEARNING GOAL'}
            </p>
          </div>
        </div>
        {roadmap && (
          <div className="text-right">
            <div className="text-3xl font-display font-bold text-[var(--neptune-primary)] drop-shadow-[0_0_10px_var(--neptune-primary)]">
              {completedCount}<span className="text-lg text-[var(--neptune-text-muted)]">/{totalCount}</span>
            </div>
            <div className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-widest">
              Milestones • {totalHours}h Total
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar (only if roadmap exists) */}
      {roadmap && (
        <div className="mb-6 relative z-10">
          <div className="h-2 w-full bg-[#0a0f16] rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-[var(--neptune-primary-dim)] via-[var(--neptune-primary)] to-[var(--neptune-secondary)] shadow-[0_0_15px_var(--neptune-primary)]"
            />
          </div>
        </div>
      )}

      {/* Goal Input Section (when no roadmap or regenerating) */}
      {(!roadmap || isGenerating) && (
        <div className="space-y-4 mb-6 relative z-10">
          <Textarea
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to learn... (e.g., 'I want to become a smart contract auditor' or 'Learn Solidity and DeFi security')"
            className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] focus:border-[var(--neptune-primary)] focus:ring-[var(--neptune-primary)] min-h-[100px] font-mono text-sm resize-none"
            disabled={isGenerating}
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !(goalInput || '').trim() || !apiKey}
              className="flex-1 gap-2 bg-gradient-to-r from-[var(--neptune-primary)] to-[var(--neptune-secondary)] text-black font-bold font-mono uppercase tracking-wider hover:shadow-[0_0_30px_rgba(var(--neptune-primary-rgb),0.5)] transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {generationProgress || 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate AI Roadmap
                </>
              )}
            </Button>

            {!apiKey && (
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
                <AlertCircle className="w-4 h-4" />
                Set API key in Settings
              </div>
            )}
          </div>

          <p className="text-[10px] text-[var(--neptune-text-muted)] font-mono text-center">
            Ctrl+Enter to generate • Powered by GPT OSS 120B
          </p>
        </div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roadmap Content */}
      {roadmap && !isGenerating && (
        <>
          {/* Current Goal Display */}
          <div className="mb-4 p-3 rounded-lg bg-[rgba(var(--neptune-primary-rgb),0.05)] border border-[var(--neptune-primary-dim)] relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-[var(--neptune-primary)]" />
                  <span className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase">Current Goal</span>
                </div>
                <p className="text-sm text-[var(--neptune-text-primary)] font-medium">{roadmap.goal}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGoalInput(roadmap.goal);
                    onClearRoadmap();
                  }}
                  className="h-8 px-3 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)]"
                  title="Regenerate with new goal"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Milestones List */}
          <NeptuneScrollbar maxHeight="500px" className="space-y-6 pr-4">
            {(roadmap.milestones || []).map((milestone, i) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative mb-4"
              >
                <div className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${milestone.isCompleted
                  ? 'bg-[rgba(34,197,94,0.05)] border-green-500/30'
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] hover:border-[var(--neptune-primary-dim)]'
                  }`}>
                  {/* Completion Toggle */}
                  <button
                    onClick={() => onToggleMilestone(milestone.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${milestone.isCompleted
                      ? 'bg-green-500/20 border border-green-500 text-green-400'
                      : 'bg-[#0a0f16] border border-[var(--neptune-text-muted)] text-[var(--neptune-text-muted)] hover:border-[var(--neptune-primary)] hover:text-[var(--neptune-primary)]'
                      }`}
                  >
                    {milestone.isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-mono font-bold">{i + 1}</span>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className={`font-bold font-display tracking-wide ${milestone.isCompleted ? 'text-green-400' : 'text-[var(--neptune-text-primary)]'
                        }`}>
                        {milestone.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono border-[var(--neptune-primary-dim)] text-[var(--neptune-text-muted)]">
                          <Clock className="w-3 h-3 mr-1" />
                          {milestone.estimatedHours}h
                        </Badge>
                        {showDeleteConfirm === milestone.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onDeleteMilestone(milestone.id);
                                setShowDeleteConfirm(null);
                              }}
                              className="h-6 px-2 text-red-400 hover:bg-red-500/20 text-[10px]"
                            >
                              Delete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(null)}
                              className="h-6 px-2 text-[var(--neptune-text-muted)] text-[10px]"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Move Up */}
                            {i > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onMoveMilestone(milestone.id, 'up')}
                                className="h-6 w-6 p-0 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)]"
                                title="Move Up"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                            )}
                            {/* Move Down */}
                            {i < (roadmap?.milestones?.length || 0) - 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onMoveMilestone(milestone.id, 'down')}
                                className="h-6 w-6 p-0 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)]"
                                title="Move Down"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            )}
                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMilestone(milestone)}
                              className="h-6 w-6 p-0 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-secondary)] hover:bg-[rgba(var(--neptune-secondary-rgb),0.1)]"
                              title="Edit Milestone"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(milestone.id)}
                              className="h-6 w-6 p-0 text-[var(--neptune-text-muted)] hover:text-red-400 hover:bg-red-500/10"
                              title="Delete Milestone"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[var(--neptune-text-muted)] mb-3">{milestone.description}</p>

                    {/* Topics */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {milestone.topics.map((topic, j) => (
                        <span
                          key={j}
                          className="text-[10px] font-mono px-2 py-0.5 rounded border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-[var(--neptune-text-secondary)]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    {/* Resources */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                      {milestone.resources.map((res, j) => {
                        const Icon = resourceIcons[res.type] || BookOpen;
                        const colorClass = resourceColors[res.type] || resourceColors.docs;
                        return (
                          <a
                            key={j}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border transition-all hover:scale-105 ${colorClass}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span className="font-mono truncate max-w-[120px]">{res.name}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </NeptuneScrollbar>

          {/* Add Milestone Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(true)}
            className="w-full mt-4 p-3 rounded-xl border border-dashed border-[var(--neptune-primary-dim)] bg-[rgba(var(--neptune-primary-rgb),0.05)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)] transition-all flex items-center justify-center gap-2 text-[var(--neptune-primary)] font-mono text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Custom Milestone
          </motion.button>

          {/* Generated At Footer */}
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)] text-center relative z-10">
            <p className="text-[10px] font-mono text-[var(--neptune-text-muted)]">
              Generated {new Date(roadmap.generatedAt).toLocaleDateString('en-US')} • Powered by GPT-OSS 120B
            </p>
          </div>
        </>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMilestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingMilestone(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0a0f16] border border-[var(--neptune-primary-dim)] rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold font-display text-white">Edit Milestone</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingMilestone(null)}
                  className="h-8 w-8 p-0 text-[var(--neptune-text-muted)]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Title</label>
                  <input
                    type="text"
                    value={editingMilestone.title}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-primary)] outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Description</label>
                  <Textarea
                    value={editingMilestone.description}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-primary)] outline-none min-h-[80px]"
                  />
                </div>

                {/* Estimated Hours */}
                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Estimated Hours</label>
                  <input
                    type="number"
                    value={editingMilestone.estimatedHours}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-32 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-primary)] outline-none"
                    min="1"
                  />
                </div>

                {/* Topics */}
                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Topics (comma separated)</label>
                  <input
                    type="text"
                    value={editingMilestone.topics.join(', ')}
                    onChange={(e) => setEditingMilestone({
                      ...editingMilestone,
                      topics: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-primary)] outline-none"
                    placeholder="Topic 1, Topic 2, Topic 3"
                  />
                </div>

                {/* Resources */}
                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-2 block">Resources</label>
                  <div className="space-y-2">
                    {editingMilestone.resources.map((res, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={res.type}
                          onChange={(e) => {
                            const newResources = [...editingMilestone.resources];
                            newResources[idx] = { ...res, type: e.target.value as RoadmapResource['type'] };
                            setEditingMilestone({ ...editingMilestone, resources: newResources });
                          }}
                          className="w-28 bg-[#0a0f16] border border-[var(--neptune-primary-dim)] rounded-lg px-2 py-1.5 text-[var(--neptune-primary)] text-xs cursor-pointer focus:border-[var(--neptune-primary)] focus:ring-1 focus:ring-[var(--neptune-primary)] outline-none appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2300b4d8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                        >
                          <option value="docs" className="bg-[#0a0f16] text-blue-400">📄 Docs</option>
                          <option value="video" className="bg-[#0a0f16] text-red-400">🎬 Video</option>
                          <option value="github" className="bg-[#0a0f16] text-purple-400">🔗 GitHub</option>
                          <option value="course" className="bg-[#0a0f16] text-yellow-400">🎓 Course</option>
                          <option value="interactive" className="bg-[#0a0f16] text-green-400">⚡ Interactive</option>
                        </select>
                        <input
                          type="text"
                          value={res.name}
                          onChange={(e) => {
                            const newResources = [...editingMilestone.resources];
                            newResources[idx] = { ...res, name: e.target.value };
                            setEditingMilestone({ ...editingMilestone, resources: newResources });
                          }}
                          placeholder="Name"
                          className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1.5 text-white text-xs"
                        />
                        <input
                          type="text"
                          value={res.url}
                          onChange={(e) => {
                            const newResources = [...editingMilestone.resources];
                            newResources[idx] = { ...res, url: e.target.value };
                            setEditingMilestone({ ...editingMilestone, resources: newResources });
                          }}
                          placeholder="URL"
                          className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1.5 text-white text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newResources = editingMilestone.resources.filter((_, i) => i !== idx);
                            setEditingMilestone({ ...editingMilestone, resources: newResources });
                          }}
                          className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMilestone({
                          ...editingMilestone,
                          resources: [...editingMilestone.resources, { type: 'docs', name: '', url: '' }]
                        });
                      }}
                      className="w-full h-8 text-[10px] text-[var(--neptune-primary)] border border-dashed border-[var(--neptune-primary-dim)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)]"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Resource
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => {
                    onUpdateMilestone(editingMilestone.id, {
                      title: editingMilestone.title,
                      description: editingMilestone.description,
                      estimatedHours: editingMilestone.estimatedHours,
                      topics: editingMilestone.topics,
                      resources: editingMilestone.resources
                    });
                    setEditingMilestone(null);
                  }}
                  className="flex-1 bg-[var(--neptune-primary)] hover:bg-[var(--neptune-primary-dim)] text-black font-bold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingMilestone(null)}
                  className="text-[var(--neptune-text-muted)]"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0a0f16] border border-[var(--neptune-secondary-dim)] rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold font-display text-white">Add New Milestone</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="h-8 w-8 p-0 text-[var(--neptune-text-muted)]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Title</label>
                  <input
                    type="text"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-secondary)] outline-none"
                    placeholder="Milestone title..."
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Description</label>
                  <Textarea
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-secondary)] outline-none min-h-[80px]"
                    placeholder="What will you learn in this milestone..."
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Estimated Hours</label>
                  <input
                    type="number"
                    value={newMilestone.estimatedHours}
                    onChange={(e) => setNewMilestone({ ...newMilestone, estimatedHours: parseInt(e.target.value) || 5 })}
                    className="w-32 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-secondary)] outline-none"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-1 block">Topics (comma separated)</label>
                  <input
                    type="text"
                    value={newMilestone.topics.join(', ')}
                    onChange={(e) => setNewMilestone({
                      ...newMilestone,
                      topics: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white focus:border-[var(--neptune-secondary)] outline-none"
                    placeholder="Topic 1, Topic 2, Topic 3"
                  />
                </div>

                {/* Resources */}
                <div>
                  <label className="text-xs font-mono text-[var(--neptune-text-muted)] mb-2 block">Resources</label>
                  <div className="space-y-2">
                    {newMilestone.resources.map((res, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={res.type}
                          onChange={(e) => {
                            const newResources = [...newMilestone.resources];
                            newResources[idx] = { ...res, type: e.target.value as RoadmapResource['type'] };
                            setNewMilestone({ ...newMilestone, resources: newResources });
                          }}
                          className="w-28 bg-[#0a0f16] border border-[var(--neptune-secondary-dim)] rounded-lg px-2 py-1.5 text-[var(--neptune-secondary)] text-xs cursor-pointer focus:border-[var(--neptune-secondary)] focus:ring-1 focus:ring-[var(--neptune-secondary)] outline-none appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2390e0ef' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                        >
                          <option value="docs" className="bg-[#0a0f16] text-blue-400">📄 Docs</option>
                          <option value="video" className="bg-[#0a0f16] text-red-400">🎬 Video</option>
                          <option value="github" className="bg-[#0a0f16] text-purple-400">🔗 GitHub</option>
                          <option value="course" className="bg-[#0a0f16] text-yellow-400">🎓 Course</option>
                          <option value="interactive" className="bg-[#0a0f16] text-green-400">⚡ Interactive</option>
                        </select>
                        <input
                          type="text"
                          value={res.name}
                          onChange={(e) => {
                            const newResources = [...newMilestone.resources];
                            newResources[idx] = { ...res, name: e.target.value };
                            setNewMilestone({ ...newMilestone, resources: newResources });
                          }}
                          placeholder="Name"
                          className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1.5 text-white text-xs"
                        />
                        <input
                          type="text"
                          value={res.url}
                          onChange={(e) => {
                            const newResources = [...newMilestone.resources];
                            newResources[idx] = { ...res, url: e.target.value };
                            setNewMilestone({ ...newMilestone, resources: newResources });
                          }}
                          placeholder="URL"
                          className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1.5 text-white text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newResources = newMilestone.resources.filter((_, i) => i !== idx);
                            setNewMilestone({ ...newMilestone, resources: newResources });
                          }}
                          className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewMilestone({
                          ...newMilestone,
                          resources: [...newMilestone.resources, { type: 'docs', name: '', url: '' }]
                        });
                      }}
                      className="w-full h-8 text-[10px] text-[var(--neptune-secondary)] border border-dashed border-[var(--neptune-secondary-dim)] hover:bg-[rgba(var(--neptune-secondary-rgb),0.1)]"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Resource
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => {
                    if (newMilestone.title.trim()) {
                      onAddMilestone({
                        title: newMilestone.title,
                        description: newMilestone.description,
                        estimatedHours: newMilestone.estimatedHours,
                        topics: newMilestone.topics.filter(Boolean),
                        resources: newMilestone.resources.filter(r => r.name && r.url)
                      });
                      setNewMilestone({ title: '', description: '', topics: [''], resources: [], estimatedHours: 5 });
                      setShowAddForm(false);
                    }
                  }}
                  disabled={!newMilestone.title.trim()}
                  className="flex-1 bg-[var(--neptune-secondary)] hover:bg-[var(--neptune-secondary-dim)] text-black font-bold disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                  className="text-[var(--neptune-text-muted)]"
                >
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!roadmap && !isGenerating && (
        <div className="text-center py-8 relative z-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(var(--neptune-primary-rgb),0.1)] border border-[var(--neptune-primary-dim)] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[var(--neptune-primary)] opacity-50" />
          </div>
          <p className="text-[var(--neptune-text-muted)] font-mono text-sm">
            Enter your learning goal above to generate<br />
            a personalized AI roadmap
          </p>
        </div>
      )}
    </motion.div>
  );
});

LearningRoadmap.displayName = 'LearningRoadmap';
