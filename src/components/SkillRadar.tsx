import { motion } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import { Shield, Code, Zap, Bug, BookOpen, Brain, Crosshair, Wrench, Target, Cpu } from 'lucide-react';
import { Progress, UserProfile } from '@/types';
import './neptune/neptune-design.css';

interface SkillRadarProps {
  progress: Progress;
}

interface Skill {
  name: string;
  sub: string;
  icon: React.ComponentType<any>;
  level: number;
  maxLevel: number;
  color: string;
}

// 4 Core Skills (Always shown)
const CORE_SKILLS = ['solidity', 'security', 'defi', 'auditing'];

// Icon mapping for skills
const skillIcons: Record<string, React.ComponentType<any>> = {
  solidity: Code,
  security: Shield,
  defi: Zap,
  auditing: Bug,
  frontend: Cpu,
  testing: Wrench,
  theory: BookOpen,
  practice: Brain,
  default: Target,
};

// Color mapping for skills
const skillColors: Record<string, string> = {
  solidity: 'var(--neptune-primary)',
  security: '#EF4444',
  defi: '#10B981',
  auditing: '#F59E0B',
  frontend: '#8B5CF6',
  testing: '#3B82F6',
  default: '#8B5CF6', // Purple for dynamic skills - premium look
};

// Level to numeric value (0/5, 1/5, 3/5, 5/5)
const levelToNumber: Record<string, number> = {
  'not started': 0,
  beginner: 1,
  intermediate: 3,
  advanced: 5,
};

/**
 * OPTIMIZED: Memoized SkillRadar with UserProfile integration
 */
export const SkillRadar = memo(({ progress }: SkillRadarProps) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load UserProfile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      if (window.electronAPI?.readFile) {
        try {
          const result = await window.electronAPI.readFile('UserProfile.json');
          if (result.success && result.data) {
            setUserProfile(result.data);
          }
        } catch (error) {
          console.error('Failed to load UserProfile:', error);
        }
      }
    };
    loadUserProfile();
  }, []);

  // Build skills array from UserProfile
  const skills: Skill[] = (() => {
    const skillLevels = userProfile?.skillLevels || {};
    const resultSkills: Skill[] = [];

    // Helper to add skill
    const addSkill = (name: string, levelStr: string) => {
      const normalizedName = name.toLowerCase().replace(/[-_\s]/g, '');
      const level = levelToNumber[levelStr?.toLowerCase()] ?? 0;
      const icon = skillIcons[normalizedName] || skillIcons.default;
      const color = skillColors[normalizedName] || skillColors.default;

      resultSkills.push({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/[-_]/g, ' '),
        sub: levelStr || 'Unknown',
        icon,
        level,
        maxLevel: 5,
        color,
      });
    };

    // 1. Add Core Skills (always shown, even if not in userProfile)
    for (const coreSkill of CORE_SKILLS) {
      const found = Object.entries(skillLevels).find(
        ([key]) => key.toLowerCase().replace(/[-_\s]/g, '') === coreSkill
      );
      if (found) {
        addSkill(coreSkill, found[1] as string);
      } else {
        // Not started - show as 0/5 if skill not in userProfile
        addSkill(coreSkill, 'not started');
      }
    }

    // 2. Add top 2 Dynamic Skills (from userProfile, not in core)
    const dynamicSkills = Object.entries(skillLevels)
      .filter(([key]) => !CORE_SKILLS.includes(key.toLowerCase().replace(/[-_\s]/g, '')))
      .sort((a, b) => (levelToNumber[b[1] as string] || 0) - (levelToNumber[a[1] as string] || 0))
      .slice(0, 2);

    for (const [name, level] of dynamicSkills) {
      addSkill(name, level as string);
    }

    return resultSkills;
  })();

  const totalSkillPoints = skills.reduce((sum, s) => sum + s.level, 0);
  const maxSkillPoints = skills.reduce((sum, s) => sum + s.maxLevel, 0);
  const overallLevel = Math.floor(totalSkillPoints / skills.length);

  const getLevelTitle = (level: number) => {
    if (level <= 1) return 'ROOKIE';
    if (level <= 2) return 'APPRENTICE';
    if (level <= 3) return 'HUNTER';
    if (level <= 4) return 'SPECIALIST';
    return 'LEGEND';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="neptune-glass-panel rounded-xl p-6 relative overflow-hidden h-full flex flex-col"
    >
      {/* Background Radar Effect */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-[var(--neptune-primary)] rounded-full opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-[var(--neptune-primary)] rounded-full opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-[var(--neptune-primary)] origin-center opacity-50 animate-spin" style={{ animationDuration: '30s' }} />
      </div>

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--neptune-primary-dim)] flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-[var(--neptune-primary)]" />
          </div>
          <div>
            <h3 className="font-display tracking-widest text-lg text-[var(--neptune-text-primary)] uppercase">Skill Overview</h3>
            <p className="text-[10px] font-mono text-[var(--neptune-text-secondary)]">
              Level: <span className="text-[var(--neptune-primary)]">{getLevelTitle(overallLevel)}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display text-[var(--neptune-primary)] neptune-text-glow">{totalSkillPoints}</div>
          <div className="text-[9px] font-mono text-[var(--neptune-text-muted)]">/ {maxSkillPoints} Points</div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-2 gap-3 relative z-10 flex-1">
        {skills.map((skill, i) => {
          const Icon = skill.icon;
          const percentage = (skill.level / skill.maxLevel) * 100;

          return (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.05)] rounded-lg p-3 hover:border-[var(--neptune-primary)] transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 rounded bg-[rgba(255,255,255,0.05)]" style={{ color: skill.color }}>
                  <Icon size={14} />
                </div>
                <div>
                  <div className="font-display text-xs text-[var(--neptune-text-primary)]">{skill.name}</div>
                  <div className="font-mono text-[8px] text-[var(--neptune-text-muted)]">{skill.sub}</div>
                </div>
              </div>

              {/* Tech Progress Bar */}
              <div className="h-1.5 w-full bg-[rgba(0,0,0,0.5)] rounded-full overflow-hidden flex gap-[1px]">
                {[...Array(5)].map((_, lvl) => (
                  <div
                    key={lvl}
                    className={`flex-1 transition-all duration-500 ${lvl < skill.level ? 'opacity-100 shadow-[0_0_5px_currentColor]' : 'opacity-20'}`}
                    style={{ backgroundColor: skill.color }}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Overall Progress Footer */}
      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] relative z-10">
        <div className="flex justify-between text-[10px] font-mono text-[var(--neptune-text-muted)] mb-1">
          <span>Overall Progress</span>
          <span>{Math.round((totalSkillPoints / maxSkillPoints) * 100)}%</span>
        </div>
        <div className="h-1 w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalSkillPoints / maxSkillPoints) * 100}%` }}
            className="h-full bg-[var(--neptune-primary)] shadow-[0_0_10px_var(--neptune-primary)]"
          />
        </div>
      </div>
    </motion.div>
  );
});
SkillRadar.displayName = 'SkillRadar';
