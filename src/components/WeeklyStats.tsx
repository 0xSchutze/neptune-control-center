import { motion } from 'framer-motion';
import { memo } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock } from 'lucide-react';
import { DailyLog } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import './neptune/neptune-design.css';

interface WeeklyStatsProps {
  dailyLogs: DailyLog[];
  studyHours: { morning: number; evening: number; night: number };
}

/**
 * OPTIMIZED: Memoized WeeklyStats with useMemo for expensive calculations
 */
export const WeeklyStats = memo(({ dailyLogs, studyHours }: WeeklyStatsProps) => {
  // Get last 7 days data - SUM all logs for each day
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    // Filter ALL logs for this date
    const logsForDay = dailyLogs.filter(l => l.date === dateStr);
    // Sum hours from all logs for this day
    const totalHoursForDay = logsForDay.reduce((sum, log) => sum + log.hours, 0);
    // Average mood from all logs for this day
    const avgMoodForDay = logsForDay.length > 0
      ? logsForDay.reduce((sum, log) => sum + log.mood, 0) / logsForDay.length
      : 0;
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      hours: totalHoursForDay,
      mood: avgMoodForDay,
    };
  });

  // Time slot distribution data
  const timeSlotData = [
    { name: 'Morning', hours: studyHours.morning, color: '#FDBA74' }, // Orange dim
    { name: 'Evening', hours: studyHours.evening, color: '#C084FC' }, // Purple dim
    { name: 'Night', hours: studyHours.night, color: '#00B4D8' },   // Neptune Primary
  ];

  const totalHours = studyHours.morning + studyHours.evening + studyHours.night;
  const weeklyHours = last7Days.reduce((sum, d) => sum + d.hours, 0);

  // Get all logs from last 7 days for mood calculation (same as header)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const last7DaysLogs = dailyLogs.filter(log => new Date(log.date) >= sevenDaysAgo);
  const avgMood = last7DaysLogs.length > 0
    ? last7DaysLogs.reduce((sum, log) => sum + log.mood, 0) / last7DaysLogs.length
    : 0;

  const activeDays = last7Days.filter(d => d.hours > 0).length;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--neptune-void-bg)] border border-[var(--neptune-primary-dim)] p-2 rounded shadow-[0_0_10px_rgba(0,0,0,0.5)]">
          <p className="text-[var(--neptune-text-secondary)] font-mono text-xs mb-1">{label}</p>
          <p className="text-[var(--neptune-primary)] font-bold text-sm">
            {payload[0].value} hrs
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 text-[var(--neptune-text-primary)]">
        <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-[var(--neptune-secondary)]" />
        </div>
        <div>
          <h3 className="font-display tracking-widest text-lg">Weekly Stats</h3>
          <p className="text-xs text-[var(--neptune-text-muted)] font-mono">Last 7 days</p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: 'Weekly Total Hours', value: `${weeklyHours}h`, sub: 'this week' },
          { icon: Calendar, label: 'Active Days', value: `${activeDays}/7`, sub: 'logged' },
          { icon: TrendingUp, label: 'All Time', value: `${totalHours}h`, sub: 'total' },
          { icon: () => <span className="text-lg">⚡</span>, label: 'Avg Mood', value: avgMood.toFixed(1), sub: 'average' },
        ].map((stat, i) => (
          <div key={i} className="neptune-glass-panel p-4 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
              <stat.icon className="w-12 h-12 text-[var(--neptune-primary)]" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] text-[var(--neptune-text-muted)] font-mono mb-1">{stat.label}</p>
              <div className="text-2xl font-display text-[var(--neptune-text-primary)] group-hover:neptune-text-glow transition-all">
                {stat.value}
              </div>
              <p className="text-[9px] text-[var(--neptune-text-secondary)] mt-1 opacity-70">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Container */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Area Chart */}
        <div className="neptune-glass-panel p-6 rounded-xl">
          <h4 className="text-xs font-mono text-[var(--neptune-text-muted)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--neptune-primary)]" />
            Daily Activity
          </h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--neptune-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--neptune-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#49687C' }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--neptune-primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart (Vertical) */}
        <div className="neptune-glass-panel p-6 rounded-xl">
          <h4 className="text-xs font-mono text-[var(--neptune-text-muted)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--neptune-secondary)]" />
            Time Distribution
          </h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSlotData} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 9, fill: '#49687C', fontFamily: 'monospace' }}
                  width={60}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ payload, label }) => {
                    if (payload && payload.length) {
                      return (
                        <div className="bg-[var(--neptune-void-bg)] border border-[var(--neptune-primary-dim)] p-2 rounded">
                          <p className="text-[var(--neptune-text-primary)] font-bold text-xs">{label}: {payload[0].value}H</p>
                        </div>
                      )
                    }
                    return null;
                  }}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={20}>
                  {timeSlotData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
});
WeeklyStats.displayName = 'WeeklyStats';

