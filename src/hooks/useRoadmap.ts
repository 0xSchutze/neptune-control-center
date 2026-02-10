// useRoadmap.ts - AI Learning Roadmap State Management
import { useState, useEffect, useCallback } from 'react';
import type { RoadmapMilestone, UserRoadmap } from '@/types';
import { generateLearningRoadmap } from '@/services/aiAnalysisService';

const STORAGE_KEY = 'neptune_user_roadmap';
const ROADMAP_FILE = 'user_roadmap.json';

interface UseRoadmapReturn {
    roadmap: UserRoadmap | null;
    isGenerating: boolean;
    generationProgress: string;
    error: string | null;
    generateRoadmap: (goal: string, apiKey: string) => Promise<void>;
    toggleMilestone: (id: number) => void;
    deleteMilestone: (id: number) => void;
    updateMilestone: (id: number, updates: Partial<RoadmapMilestone>) => void;
    addCustomMilestone: (milestone: Omit<RoadmapMilestone, 'id' | 'isCompleted'>) => void;
    clearRoadmap: () => void;
    reorderMilestones: (newOrder: number[]) => void;
    moveMilestone: (id: number, direction: 'up' | 'down') => void;
}

export const useRoadmap = (): UseRoadmapReturn => {
    const [roadmap, setRoadmap] = useState<UserRoadmap | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Load from file on mount
    useEffect(() => {
        const loadRoadmap = async () => {
            try {
                if (window.electronAPI?.readFile) {
                    const result = await window.electronAPI.readFile(ROADMAP_FILE);
                    if (result.success && result.data) {
                        setRoadmap(result.data);
                    }
                } else {
                    // Fallback to localStorage
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        setRoadmap(JSON.parse(saved));
                    }
                }
            } catch (err) {
                console.error('Failed to load roadmap:', err);
            }
        };
        loadRoadmap();
    }, []);

    // Save roadmap to storage
    const saveRoadmap = useCallback(async (newRoadmap: UserRoadmap | null) => {
        try {
            if (window.electronAPI?.saveFile) {
                await window.electronAPI.saveFile(ROADMAP_FILE, newRoadmap);
            } else {
                // Fallback to localStorage
                if (newRoadmap) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRoadmap));
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (err) {
            console.error('Failed to save roadmap:', err);
        }
    }, []);

    // Generate new roadmap via AI
    const generateRoadmap = useCallback(async (goal: string, apiKey: string) => {
        if (!goal.trim()) {
            setError('Please enter a learning goal');
            return;
        }

        if (!apiKey) {
            setError('API key required. Set it in Settings.');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGenerationProgress('Starting...');

        try {
            const response = await generateLearningRoadmap(
                goal,
                apiKey,
                (progress) => setGenerationProgress(progress)
            );

            // Transform AI response to RoadmapMilestone format
            const milestones: RoadmapMilestone[] = response.milestones.map((m, i) => ({
                id: Date.now() + i,
                title: m.title,
                description: m.description,
                topics: m.topics,
                resources: m.resources,
                estimatedHours: m.estimatedHours,
                isCompleted: false
            }));

            const newRoadmap: UserRoadmap = {
                goal,
                generatedAt: new Date().toISOString(),
                milestones
            };

            setRoadmap(newRoadmap);
            await saveRoadmap(newRoadmap);
            setGenerationProgress('');
        } catch (err: any) {
            console.error('Roadmap generation failed:', err);
            setError(err.message || 'Failed to generate roadmap');
        } finally {
            setIsGenerating(false);
        }
    }, [saveRoadmap]);

    // Toggle milestone completion
    const toggleMilestone = useCallback((id: number) => {
        if (!roadmap) return;

        const updatedMilestones = roadmap.milestones.map(m =>
            m.id === id
                ? {
                    ...m,
                    isCompleted: !m.isCompleted,
                    completedAt: !m.isCompleted ? new Date().toISOString() : undefined
                }
                : m
        );

        const newRoadmap = { ...roadmap, milestones: updatedMilestones };
        setRoadmap(newRoadmap);
        saveRoadmap(newRoadmap);
    }, [roadmap, saveRoadmap]);

    // Delete milestone
    const deleteMilestone = useCallback((id: number) => {
        if (!roadmap) return;

        const updatedMilestones = roadmap.milestones.filter(m => m.id !== id);
        const newRoadmap = { ...roadmap, milestones: updatedMilestones };
        setRoadmap(newRoadmap);
        saveRoadmap(newRoadmap);
    }, [roadmap, saveRoadmap]);

    // Add custom milestone
    const addCustomMilestone = useCallback((milestone: Omit<RoadmapMilestone, 'id' | 'isCompleted'>) => {
        if (!roadmap) return;

        const newMilestone: RoadmapMilestone = {
            ...milestone,
            id: Date.now(),
            isCompleted: false
        };

        const newRoadmap = {
            ...roadmap,
            milestones: [...roadmap.milestones, newMilestone]
        };
        setRoadmap(newRoadmap);
        saveRoadmap(newRoadmap);
    }, [roadmap, saveRoadmap]);

    // Clear roadmap
    const clearRoadmap = useCallback(() => {
        setRoadmap(null);
        saveRoadmap(null);
    }, [saveRoadmap]);

    // Reorder milestones
    const reorderMilestones = useCallback((newOrder: number[]) => {
        if (!roadmap) return;

        const reordered = newOrder.map(id =>
            roadmap.milestones.find(m => m.id === id)!
        ).filter(Boolean);

        const newRoadmap = { ...roadmap, milestones: reordered };
        setRoadmap(newRoadmap);
        saveRoadmap(newRoadmap);
    }, [roadmap, saveRoadmap]);

    // Update milestone
    const updateMilestone = useCallback((id: number, updates: Partial<RoadmapMilestone>) => {
        if (!roadmap) return;

        const updatedMilestones = roadmap.milestones.map(m =>
            m.id === id ? { ...m, ...updates } : m
        );

        const newRoadmap = { ...roadmap, milestones: updatedMilestones };
        setRoadmap(newRoadmap);
        saveRoadmap(newRoadmap);
    }, [roadmap, saveRoadmap]);

    // Move milestone up or down
    const moveMilestone = useCallback((id: number, direction: 'up' | 'down') => {
        if (!roadmap) return;

        const currentIndex = roadmap.milestones.findIndex(m => m.id === id);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= roadmap.milestones.length) return;

        const newMilestones = [...roadmap.milestones];
        [newMilestones[currentIndex], newMilestones[newIndex]] =
            [newMilestones[newIndex], newMilestones[currentIndex]];

        const newRoadmap = { ...roadmap, milestones: newMilestones };
        setRoadmap(newRoadmap);
        saveRoadmap(newRoadmap);
    }, [roadmap, saveRoadmap]);

    return {
        roadmap,
        isGenerating,
        generationProgress,
        error,
        generateRoadmap,
        toggleMilestone,
        deleteMilestone,
        updateMilestone,
        addCustomMilestone,
        clearRoadmap,
        reorderMilestones,
        moveMilestone
    };
};
