import { motion } from 'framer-motion';
import { Upload, Download, Settings, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

interface HeaderProps {
  currentWeek: number;
  onExport: () => void;
  onImport: (file: File) => void;
  onSettingsClick: () => void;
}

export const Header = ({ currentWeek, onExport, onImport, onSettingsClick }: HeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="gradient-primary rounded-2xl p-6 mb-6 glow-primary relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm"
          >
            <Shield className="w-8 h-8" />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              Bug Hunter Command Center
              <Zap className="w-6 h-6 text-yellow-300" />
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Your learning journey • Week {currentWeek} of 24
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleImportClick}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            <Upload className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExport}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            <Download className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
};
