import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ExternalLink, Star, Search, Filter,
  Youtube, FileText, Globe, GraduationCap, Code, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Resource {
  id: number;
  title: string;
  description: string;
  url: string;
  type: 'article' | 'video' | 'course' | 'tool' | 'documentation' | 'ctf';
  category: 'solidity' | 'security' | 'defi' | 'tools' | 'basics' | 'bounty';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isFavorite?: boolean;
}

const defaultResources: Resource[] = [
  {
    id: 1,
    title: 'CryptoZombies',
    description: 'Interactive Solidity lessons. Learn blockchain development by building games.',
    url: 'https://cryptozombies.io/',
    type: 'course',
    category: 'solidity',
    difficulty: 'beginner',
  },
  {
    id: 2,
    title: 'Damn Vulnerable DeFi',
    description: 'CTF challenges to learn DeFi security vulnerabilities.',
    url: 'https://www.damnvulnerabledefi.xyz/',
    type: 'ctf',
    category: 'security',
    difficulty: 'intermediate',
  },
  {
    id: 3,
    title: 'Ethernaut',
    description: 'Solidity security training by OpenZeppelin.',
    url: 'https://ethernaut.openzeppelin.com/',
    type: 'ctf',
    category: 'security',
    difficulty: 'intermediate',
  },
  {
    id: 4,
    title: 'Solidity by Example',
    description: 'Learn Solidity through practical examples.',
    url: 'https://solidity-by-example.org/',
    type: 'documentation',
    category: 'solidity',
    difficulty: 'beginner',
  },
  {
    id: 5,
    title: 'Smart Contract Security',
    description: 'Consensys smart contract security best practices.',
    url: 'https://consensys.github.io/smart-contract-best-practices/',
    type: 'documentation',
    category: 'security',
    difficulty: 'intermediate',
  },
  {
    id: 6,
    title: 'Foundry Book',
    description: 'Smart contract development and testing with Foundry.',
    url: 'https://book.getfoundry.sh/',
    type: 'documentation',
    category: 'tools',
    difficulty: 'intermediate',
  },
  {
    id: 7,
    title: 'DeFi MOOC',
    description: 'Berkeley DeFi course - advanced level.',
    url: 'https://defi-learning.org/',
    type: 'course',
    category: 'defi',
    difficulty: 'advanced',
  },
  {
    id: 8,
    title: 'Immunefi Bug Bounty',
    description: 'Bug bounty platform for Web3 security researchers.',
    url: 'https://immunefi.com/',
    type: 'tool',
    category: 'bounty',
    difficulty: 'intermediate',
  },
  {
    id: 9,
    title: 'Code4rena',
    description: 'Audit competitions and bug bounty platform.',
    url: 'https://code4rena.com/',
    type: 'tool',
    category: 'bounty',
    difficulty: 'advanced',
  },
  {
    id: 10,
    title: 'Sherlock',
    description: 'Audit competition platform - high rewards.',
    url: 'https://www.sherlock.xyz/',
    type: 'tool',
    category: 'bounty',
    difficulty: 'advanced',
  },
  {
    id: 11,
    title: 'Blockchain Basics',
    description: 'Learn blockchain fundamentals - beginner level.',
    url: 'https://www.coursera.org/learn/blockchain-basics',
    type: 'course',
    category: 'basics',
    difficulty: 'beginner',
  },
  {
    id: 12,
    title: 'Patrick Collins YouTube',
    description: 'Comprehensive Solidity and Web3 tutorial videos.',
    url: 'https://www.youtube.com/@PatrickAlphaC',
    type: 'video',
    category: 'solidity',
    difficulty: 'beginner',
  },
];

const typeIcons = {
  article: FileText,
  video: Youtube,
  course: GraduationCap,
  tool: Code,
  documentation: BookOpen,
  ctf: Shield,
};

const categoryColors = {
  solidity: 'bg-[rgba(168,85,247,0.1)] text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
  security: 'bg-[rgba(239,68,68,0.1)] text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  defi: 'bg-[rgba(34,197,94,0.1)] text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
  tools: 'bg-[rgba(59,130,246,0.1)] text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
  basics: 'bg-[rgba(6,182,212,0.1)] text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
  bounty: 'bg-[rgba(249,115,22,0.1)] text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
};

const difficultyColors = {
  beginner: 'text-green-400',
  intermediate: 'text-orange-400',
  advanced: 'text-red-400',
};

export const ResourceLibrary = () => {
  const [resources, setResources] = useState<Resource[]>(defaultResources);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const categories = ['solidity', 'security', 'defi', 'tools', 'basics', 'bounty'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const filteredResources = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || r.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || r.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const toggleFavorite = (id: number) => {
    setResources(resources.map(r =>
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
  };

  const favoriteResources = resources.filter(r => r.isFavorite);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden">
        {/* Background Grid Decoration */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[rgba(var(--neptune-primary-rgb),0.1)] border border-[var(--neptune-primary)] flex items-center justify-center shadow-[0_0_15px_rgba(var(--neptune-primary-rgb),0.3)]">
            <BookOpen className="w-6 h-6 text-[var(--neptune-primary)]" />
          </div>
          <div>
            <h3 className="font-bold text-xl font-display text-white tracking-wider">Resource Library</h3>
            <p className="text-xs font-mono text-[var(--neptune-text-muted)]">Learning Resources</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-6 mb-8 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neptune-text-muted)] group-focus-within:text-[var(--neptune-primary)] transition-colors" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="pl-10 h-11 bg-[#0a0f16] border border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] font-mono text-xs placeholder:text-[var(--neptune-text-muted)] focus:border-[var(--neptune-primary)] focus:ring-[var(--neptune-primary)] transition-all rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)] mr-2">Category:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={`h-7 text-[10px] font-mono border ${selectedCategory === null
                  ? 'bg-[var(--neptune-primary)] text-black border-[var(--neptune-primary)]'
                  : 'bg-transparent border-[var(--neptune-text-muted)] text-[var(--neptune-text-muted)] hover:border-white hover:text-white'}`}
              >
                ALL
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`h-7 text-[10px] font-mono border transition-all ${selectedCategory === cat
                    ? 'bg-[rgba(var(--neptune-primary-rgb),0.1)] text-[var(--neptune-primary)] border-[var(--neptune-primary)] shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.3)]'
                    : 'bg-transparent border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] hover:border-[var(--neptune-text-muted)] hover:text-white'}`}
                >
                  {cat.toUpperCase()}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)] mr-2">Level:</span>
              {difficulties.map((diff) => (
                <Button
                  key={diff}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? null : diff)}
                  className={`h-7 text-[10px] font-mono border transition-all ${selectedDifficulty === diff
                    ? 'bg-white/10 text-white border-white'
                    : `bg-transparent border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] hover:border-${diff === 'beginner' ? 'green' : diff === 'intermediate' ? 'orange' : 'red'}-400`}`}
                >
                  {diff === 'beginner' ? '🌱 BEGINNER' : diff === 'intermediate' ? '🌿 INTERMEDIATE' : '🌳 ADVANCED'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Favorites */}
        {favoriteResources.length > 0 && (
          <div className="mb-8 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl" />
            <h4 className="text-xs font-mono font-bold mb-3 flex items-center gap-2 text-yellow-500 uppercase tracking-widest relative z-10">
              <Star className="w-3 h-3 fill-yellow-500" />
              Favorites ({favoriteResources.length})
            </h4>
            <div className="flex flex-wrap gap-2 relative z-10">
              {favoriteResources.map((r) => (
                <Badge key={r.id} variant="outline" className="cursor-pointer bg-[#0a0f16] border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500 transition-all font-mono text-[10px] py-1">
                  {r.title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Resources Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredResources.map((resource, i) => {
              const Icon = typeIcons[resource.type];
              return (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#0a0f16] border border-[rgba(255,255,255,0.05)] rounded-xl p-5 hover:border-[var(--neptune-primary)] hover:shadow-[0_0_20px_rgba(var(--neptune-primary-rgb),0.1)] transition-all duration-300 group relative overflow-hidden"
                >
                  {/* Hover Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgba(var(--neptune-primary-rgb),0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="flex items-start justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                        <Icon className="w-4 h-4 text-[var(--neptune-text-secondary)] group-hover:text-white transition-colors" />
                      </div>
                      <Badge variant="outline" className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${categoryColors[resource.category]}`}>
                        {resource.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-[rgba(255,255,255,0.1)] rounded-full"
                      onClick={() => toggleFavorite(resource.id)}
                    >
                      <Star className={`w-4 h-4 transition-all ${resource.isFavorite ? 'text-yellow-500 fill-yellow-500 scale-110 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'text-[var(--neptune-text-muted)] group-hover:text-white'}`} />
                    </Button>
                  </div>

                  <h4 className="font-bold font-display text-lg mb-2 text-white group-hover:text-[var(--neptune-primary)] transition-colors relative z-10 tracking-wide">
                    {resource.title}
                  </h4>
                  <p className="text-xs text-[var(--neptune-text-secondary)] mb-4 line-clamp-2 font-mono leading-relaxed relative z-10">
                    {resource.description}
                  </p>

                  <div className="flex items-center justify-between relative z-10 border-t border-[rgba(255,255,255,0.05)] pt-3">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${difficultyColors[resource.difficulty]}`}>
                      {resource.difficulty === 'beginner' ? '🌱 LEVEL 1' :
                        resource.difficulty === 'intermediate' ? '🌿 LEVEL 2' : '🌳 LEVEL 3'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(resource.url, '_blank')}
                      className="h-7 text-[10px] font-mono text-[var(--neptune-text-primary)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent hover:border-[var(--neptune-primary-dim)]"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open Link
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredResources.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]">
            <Globe className="w-12 h-12 mx-auto mb-4 text-[var(--neptune-text-muted)] opacity-50" />
            <p className="text-sm font-code text-[var(--neptune-text-secondary)]">No resources found matching your search</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
