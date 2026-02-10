import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Code, Plus, Copy, Trash2, Search, Star, Tag, Terminal, Database, Shield, Eye, Maximize2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Snippet } from '@/types';
import { Button } from '@/components/ui/button';
import { SnippetDetailModal } from './SnippetDetailModal';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SnippetsTabProps {
  snippets: Snippet[];
  onAddSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt'>) => void;
  onUpdateSnippet: (id: number, updates: Partial<Snippet>) => void;
  onDeleteSnippet: (id: number) => void;
}

const languages = [
  { value: 'solidity', label: 'Solidity' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
];

const categories = [
  { value: 'security', label: '🔒 Security' },
  { value: 'gas', label: '⛽ Gas Optimization' },
  { value: 'pattern', label: '📐 Design Pattern' },
  { value: 'test', label: '🧪 Testing' },
  { value: 'defi', label: '💰 DeFi' },
  { value: 'other', label: '📁 Other' },
];

export const SnippetsTab = memo(({
  snippets,
  onAddSnippet,
  onUpdateSnippet,
  onDeleteSnippet,
}: SnippetsTabProps) => {
  const [newSnippet, setNewSnippet] = useState({
    title: '',
    code: '',
    language: 'solidity',
    category: 'security',
    notes: '',
    isFavorite: false,
    tags: [] as string[],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const openSnippetDetail = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setIsDetailModalOpen(true);
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !newSnippet.tags.includes(newTagInput.trim())) {
      setNewSnippet({ ...newSnippet, tags: [...newSnippet.tags, newTagInput.trim()] });
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewSnippet({ ...newSnippet, tags: newSnippet.tags.filter(tag => tag !== tagToRemove) });
  };

  const handleSubmit = () => {
    if (!newSnippet.title || !newSnippet.code) {
      toast.error('Please enter a title and code');
      return;
    }

    onAddSnippet(newSnippet);
    setNewSnippet({
      title: '',
      code: '',
      language: 'solidity',
      category: 'security',
      notes: '',
      isFavorite: false,
      tags: [],
    });
    toast.success('Snippet saved!');
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard!');
  };

  const filteredSnippets = snippets.filter((snippet) => {
    const matchesSearch =
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === 'all' || snippet.category === filterCategory;
    const matchesFavorite = !showFavoritesOnly || snippet.isFavorite;
    return matchesSearch && matchesCategory && matchesFavorite;
  });

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add Snippet Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider relative z-10">
            <Terminal className="w-5 h-5 text-[var(--neptune-primary)]" />
            Code Snippets
          </h2>

          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Title</Label>
              <Input
                value={newSnippet.title}
                onChange={(e) =>
                  setNewSnippet({ ...newSnippet, title: e.target.value })
                }
                placeholder="e.g. Reentrancy Guard V2"
                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono focus:border-[var(--neptune-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Language</Label>
                <Select
                  value={newSnippet.language}
                  onValueChange={(v) =>
                    setNewSnippet({ ...newSnippet, language: v })
                  }
                >
                  <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value} className="text-xs font-mono">
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Category</Label>
                <Select
                  value={newSnippet.category}
                  onValueChange={(v) =>
                    setNewSnippet({ ...newSnippet, category: v })
                  }
                >
                  <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs font-mono">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Code</Label>
              <div className="relative">
                <div className="absolute top-0 right-0 p-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  </div>
                </div>
                <Textarea
                  value={newSnippet.code}
                  onChange={(e) =>
                    setNewSnippet({ ...newSnippet, code: e.target.value })
                  }
                  placeholder="// Paste your code here..."
                  rows={8}
                  className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] font-mono text-xs focus:border-[var(--neptune-primary)] pt-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Add tag..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono focus:border-[var(--neptune-primary)]"
                />
                <Button type="button" variant="outline" onClick={handleAddTag} className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] hover:border-[var(--neptune-primary)]">
                  <Tag className="w-3 h-3" />
                </Button>
              </div>
              {newSnippet.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newSnippet.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] font-mono cursor-pointer bg-[rgba(var(--neptune-primary-rgb),0.1)] border border-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all" onClick={() => handleRemoveTag(tag)}>
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Notes</Label>
              <Textarea
                value={newSnippet.notes}
                onChange={(e) =>
                  setNewSnippet({ ...newSnippet, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={2}
                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] font-mono text-xs focus:border-[var(--neptune-primary)]"
              />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-[var(--neptune-primary)] hover:bg-[var(--neptune-secondary)] text-black font-bold font-mono text-xs uppercase transition-all duration-300 shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.3)] hover:shadow-[0_0_20px_rgba(var(--neptune-secondary-rgb),0.5)]">
              <Plus className="w-4 h-4 mr-2" />
              Save Snippet
            </Button>
          </div>
        </motion.div>

        {/* Snippets List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider relative z-10">
            <Database className="w-5 h-5 text-[var(--neptune-secondary)]" />
            Saved Snippets
          </h2>

          {/* Search and Filter */}
          <div className="flex gap-3 mb-6 relative z-10">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neptune-text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search snippets..."
                className="pl-9 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono focus:border-[var(--neptune-primary)] rounded-lg"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                <SelectValue placeholder="FILTER" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                <SelectItem value="all" className="text-xs font-mono">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs font-mono">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`h-9 px-3 font-mono text-xs border-[var(--neptune-primary-dim)] ${showFavoritesOnly
                ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/50'
                : 'bg-[#0a0f16] text-[var(--neptune-text-muted)] hover:text-yellow-400 hover:border-yellow-400/30'
                }`}
            >
              <Star className={`w-3.5 h-3.5 mr-1.5 ${showFavoritesOnly ? 'fill-yellow-400' : ''}`} />
              Favorites
            </Button>
          </div>

          <NeptuneScrollbar maxHeight="600px" className="space-y-4 pr-6 relative z-10">
            {filteredSnippets.length > 0 ? (
              filteredSnippets.map((snippet, i) => (
                <motion.div
                  key={snippet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#0a0f16] border border-[rgba(255,255,255,0.05)] rounded-xl overflow-hidden hover:border-[var(--neptune-primary-dim)] transition-all group mb-3"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-white font-display tracking-wide flex items-center gap-2">
                          <Shield className="w-3 h-3 text-[var(--neptune-primary)]" />
                          {snippet.title}
                        </h4>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[9px] font-mono uppercase border-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] bg-[rgba(var(--neptune-primary-rgb),0.05)]">
                            {snippet.language}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] font-mono uppercase bg-[rgba(255,255,255,0.05)] text-[var(--neptune-text-secondary)]">
                            {
                              categories.find((c) => c.value === snippet.category)
                                ?.label
                            }
                          </Badge>
                        </div>
                        {snippet.tags && snippet.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {snippet.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[9px] border border-dashed border-[var(--neptune-text-muted)] text-[var(--neptune-text-secondary)] px-1.5 py-0">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openSnippetDetail(snippet)}
                          className="h-7 w-7 rounded-lg text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 rounded-lg ${snippet.isFavorite ? 'text-yellow-400 bg-yellow-400/5' : 'text-[var(--neptune-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}
                          onClick={() => onUpdateSnippet(snippet.id, { isFavorite: !snippet.isFavorite })}
                        >
                          <Star className={`w-3.5 h-3.5 ${snippet.isFavorite ? 'fill-yellow-400' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(snippet.code)}
                          className="h-7 w-7 rounded-lg text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteSnippet(snippet.id)}
                          className="h-7 w-7 rounded-lg text-[var(--neptune-text-muted)] hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Terminal Code Block - Click to expand */}
                    <div
                      className="bg-[#05080c] rounded-lg border border-[rgba(255,255,255,0.05)] overflow-hidden cursor-pointer hover:border-[var(--neptune-primary-dim)] transition-colors group/code"
                      onClick={() => openSnippetDetail(snippet)}
                    >
                      <div className="bg-[#0f1419] px-3 py-1.5 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500/20" />
                          <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                          <div className="w-2 h-2 rounded-full bg-green-500/20" />
                          <span className="ml-2 text-[9px] font-mono text-[var(--neptune-text-muted)] opacity-50">src/{snippet.language}/{snippet.category}.sol</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
                          <Maximize2 className="w-3 h-3 text-[var(--neptune-primary)]" />
                          <span className="text-[8px] font-mono text-[var(--neptune-text-muted)]">EXPAND</span>
                        </div>
                      </div>
                      <div className="p-3 text-xs font-mono overflow-hidden relative max-h-[140px]">
                        <SyntaxHighlighter
                          language={snippet.language === 'solidity' ? 'javascript' : snippet.language}
                          style={oneDark}
                          customStyle={{
                            background: 'transparent',
                            padding: 0,
                            margin: 0,
                            fontSize: '11px',
                            lineHeight: '1.5',
                          }}
                          codeTagProps={{
                            style: {
                              fontFamily: 'JetBrains Mono, Fira Code, monospace',
                            }
                          }}
                        >
                          {snippet.code.split('\n').slice(0, 6).join('\n')}
                        </SyntaxHighlighter>
                        {snippet.code.split('\n').length > 6 && (
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#05080c] to-transparent flex items-end justify-center pb-1">
                            <span className="text-[9px] font-mono text-[var(--neptune-text-muted)]">+{snippet.code.split('\n').length - 6} more lines</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {snippet.notes && (
                      <div className="mt-3 flex items-start gap-2 text-[10px] font-mono text-[var(--neptune-text-secondary)] bg-[rgba(255,255,255,0.02)] p-2 rounded border border-dashed border-[rgba(255,255,255,0.05)]">
                        <span className="text-[var(--neptune-primary)]">::</span>
                        {snippet.notes}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]">
                <Database className="w-8 h-8 text-[var(--neptune-text-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-display text-[var(--neptune-text-secondary)]">No snippets yet</p>
              </div>
            )}
          </NeptuneScrollbar>
        </motion.div>
      </div>

      {/* Snippet Detail Modal */}
      <SnippetDetailModal
        snippet={selectedSnippet}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSnippet(null);
        }}
        onToggleFavorite={(id, isFavorite) => onUpdateSnippet(id, { isFavorite })}
        onUpdate={onUpdateSnippet}
        onDelete={onDeleteSnippet}
      />
    </>
  );
});
SnippetsTab.displayName = 'SnippetsTab';
