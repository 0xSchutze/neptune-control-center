import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import './neptune/neptune-design.css';
import { useEffect, useState, memo } from 'react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description: string;
  gradient: 'primary' | 'success' | 'warning' | 'danger';
  delay?: number;
}

const statusColors = {
  primary: 'var(--neptune-primary)',
  success: '#10B981', // Emerald for success
  warning: '#F59E0B', // Amber for warning
  danger: '#EF4444',  // Red for danger
};

/**
 * OPTIMIZED: Memoized StatsCard to prevent unnecessary re-renders
 */
export const StatsCard = memo(({
  icon: Icon,
  label,
  value,
  description,
  gradient,
  delay = 0,
}: StatsCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const color = statusColors[gradient];

  // OPTIMIZED: Number rolling animation with proper cleanup
  useEffect(() => {
    if (typeof value === 'number') {
      let animationId: number;
      const end = value;
      const duration = 1500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out expo
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        setDisplayValue(Math.floor(end * ease));

        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        }
      };

      animationId = requestAnimationFrame(animate);

      // Cleanup: Cancel animation on unmount or value change
      return () => cancelAnimationFrame(animationId);
    }
  }, [value]);

  const renderedValue = typeof value === 'number' ? displayValue : value;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`
        neptune-glass-panel rounded-xl p-5 relative overflow-hidden group
        hover:border-[color:var(--highlight-color)] transition-colors duration-300
      `}
      style={{ '--highlight-color': color } as React.CSSProperties}
    >
      {/* Background Decor */}
      <div
        className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-xl transition-all duration-500 group-hover:opacity-20"
        style={{ backgroundColor: color }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-mono tracking-widest text-[var(--neptune-text-muted)] uppercase">
            {label}
          </span>
          <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] text-[var(--neptune-text-primary)]">
            <Icon size={16} />
          </div>
        </div>

        {/* Value */}
        <div className="text-3xl font-display text-[var(--neptune-text-primary)] mb-1 tabular-nums group-hover:neptune-text-glow transition-all">
          {renderedValue}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1 flex-1 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: delay + 0.2, duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <span className="text-[9px] text-[var(--neptune-text-secondary)] font-mono opacity-80 truncate max-w-[50%]">
            {description}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
StatsCard.displayName = 'StatsCard';
