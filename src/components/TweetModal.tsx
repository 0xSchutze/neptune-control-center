// TweetModal.tsx - Modal for editing and sharing AI-generated tweets
import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { DailyLog } from '../types';
import type { UserProfile } from '../types/userProfile';
import { generateTweet, openTwitterIntent } from '../services/aiAnalysisService';

interface TweetModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: DailyLog;
    userProfile: UserProfile | null;
    apiKey: string;
    journeyDay: number; // Real day count from total logs
}

// Rotating progress messages
const PROGRESS_MESSAGES = [
    "🎨 AI is crafting your tweet...",
    "✨ Polishing your words...",
    "🚀 Adding rocket fuel...",
    "💫 Making it viral-worthy...",
    "🔥 Generating fire content...",
    "📝 Writing something epic...",
    "🎯 Targeting the algorithm...",
    "💡 Adding that special touch...",
];

const TweetModal: React.FC<TweetModalProps> = memo(({ isOpen, onClose, log, userProfile, apiKey, journeyDay }) => {
    const [tweet, setTweet] = useState('');
    const [hashtags, setHashtags] = useState<string[]>(['buildinpublic', 'web3']); // Default hashtags
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [charCount, setCharCount] = useState(0);
    const [progressMessage, setProgressMessage] = useState(PROGRESS_MESSAGES[0]);

    // Rotate progress messages during generation
    useEffect(() => {
        if (!isGenerating) return;

        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % PROGRESS_MESSAGES.length;
            setProgressMessage(PROGRESS_MESSAGES[index]);
        }, 1500);

        return () => clearInterval(interval);
    }, [isGenerating]);

    // Generate tweet when modal opens
    useEffect(() => {
        if (isOpen && apiKey && userProfile) {
            generateTweetContent();
        }
    }, [isOpen]);

    const generateTweetContent = async () => {
        if (!userProfile || !apiKey) {
            setError('API key or user profile not available');
            if (!apiKey) {
                toast.warning('🔑 Tweet generation requires an API key. Please add your Groq API key in Settings.', {
                    duration: 5000,
                });
            }
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const result = await generateTweet(log, userProfile, apiKey, journeyDay);
            setTweet(result.tweet || '');
            setHashtags(Array.isArray(result.hashtags) ? result.hashtags : ['buildinpublic', 'web3']);
            setCharCount((result.tweet || '').length);
        } catch (err) {
            console.error('Tweet generation error:', err);
            setError('Failed to generate tweet. You can still write your own!');
            // Fallback tweet
            setTweet(`Day ${journeyDay}: ${log.hours}h of productivity! 💪 #buildinpublic`);
            setHashtags(['buildinpublic', 'web3']);
            setCharCount(55);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTweetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newTweet = e.target.value;
        setTweet(newTweet);
        setCharCount(newTweet.length);
    };

    const handleShare = () => {
        openTwitterIntent(tweet, hashtags || []);
        onClose();
    };

    const handleRegenerate = () => {
        generateTweetContent();
    };

    const toggleHashtag = (tag: string) => {
        const currentHashtags = hashtags || [];
        setHashtags(
            currentHashtags.includes(tag)
                ? currentHashtags.filter(t => t !== tag)
                : [...currentHashtags, tag]
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="neptune-glass-panel w-full max-w-lg p-6 rounded-2xl border border-cyan-500/30"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300">Share on X</h3>
                                <p className="text-xs text-gray-400">Share your daily progress</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    {isGenerating ? (
                        <div className="flex flex-col items-center py-8">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
                            <p className="text-gray-400 text-sm transition-opacity duration-300">{progressMessage}</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Tweet textarea */}
                            <div className="relative mb-4">
                                <textarea
                                    value={tweet}
                                    onChange={handleTweetChange}
                                    rows={4}
                                    maxLength={280}
                                    className="w-full p-4 rounded-xl bg-gray-900/50 border border-cyan-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                                    placeholder="Write your tweet..."
                                />
                                <div className={`absolute bottom-2 right-3 text-xs ${charCount > 260 ? charCount > 280 ? 'text-red-400' : 'text-amber-400' : 'text-gray-500'}`}>
                                    {charCount}/280
                                </div>
                            </div>

                            {/* Hashtags */}
                            <div className="mb-6">
                                <p className="text-xs text-gray-400 mb-2">Suggested hashtags (click to toggle):</p>
                                <div className="flex flex-wrap gap-2">
                                    {['buildinpublic', 'web3', 'blockchain', 'solidity', 'smartcontracts', 'bugbounty', 'learning'].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleHashtag(tag)}
                                            className={`px-3 py-1 rounded-full text-xs transition-colors ${hashtags.includes(tag)
                                                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                                                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRegenerate}
                                    disabled={isGenerating || !apiKey}
                                    className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Regenerate
                                </button>
                                <button
                                    onClick={handleShare}
                                    disabled={charCount === 0 || charCount > 280}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    Post on X
                                </button>
                            </div>
                        </>
                    )}

                    {/* Footer note */}
                    <p className="mt-4 text-center text-xs text-gray-500">
                        This will open X in a new tab with your tweet pre-filled
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

TweetModal.displayName = 'TweetModal';

export default TweetModal;
