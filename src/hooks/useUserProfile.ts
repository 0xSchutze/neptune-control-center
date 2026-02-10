// useUserProfile.ts - Hook for UserProfile data management
import { useState, useEffect, useCallback } from 'react';
import { UserProfile, createDefaultUserProfile, mergeUserProfileUpdates } from '../types/userProfile';
import type { UserProfileUpdates } from '../types/aiAnalysis';
import '../types/electron'; // Global ElectronAPI type

const USER_PROFILE_FILE = 'UserProfile.json';

interface UseUserProfileReturn {
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    updateFromAI: (updates: UserProfileUpdates) => Promise<void>;
    reload: () => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load profile from file
    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Check if running in Electron
            if (window.electronAPI?.readFile) {
                const result = await window.electronAPI.readFile(USER_PROFILE_FILE);

                if (result.success && result.data) {
                    setProfile(result.data);
                } else {
                    // File doesn't exist, create default
                    const defaultProfile = createDefaultUserProfile();
                    await window.electronAPI.saveFile?.(USER_PROFILE_FILE, defaultProfile);
                    setProfile(defaultProfile);
                }
            } else {
                // Browser fallback - use localStorage
                const stored = localStorage.getItem(USER_PROFILE_FILE);
                if (stored) {
                    setProfile(JSON.parse(stored));
                } else {
                    const defaultProfile = createDefaultUserProfile();
                    localStorage.setItem(USER_PROFILE_FILE, JSON.stringify(defaultProfile));
                    setProfile(defaultProfile);
                }
            }
        } catch (err) {
            console.error('Failed to load UserProfile:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            // Create default on error
            setProfile(createDefaultUserProfile());
        } finally {
            setLoading(false);
        }
    }, []);

    // Save profile to file
    const saveProfile = useCallback(async (newProfile: UserProfile) => {
        try {
            if (window.electronAPI?.saveFile) {
                await window.electronAPI.saveFile(USER_PROFILE_FILE, newProfile);
            } else {
                localStorage.setItem(USER_PROFILE_FILE, JSON.stringify(newProfile));
            }
        } catch (err) {
            console.error('Failed to save UserProfile:', err);
            throw err;
        }
    }, []);

    // Update profile with partial updates
    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        if (!profile) return;

        const merged = mergeUserProfileUpdates(profile, updates);
        setProfile(merged);
        await saveProfile(merged);
    }, [profile, saveProfile]);

    // Update profile from AI analysis response
    const updateFromAI = useCallback(async (updates: UserProfileUpdates) => {
        if (!profile) return;

        // Build partial profile from AI updates
        const partialProfile: Partial<UserProfile> = {};

        if (updates.skillLevels) {
            partialProfile.skillLevels = { ...profile.skillLevels, ...updates.skillLevels };
        }

        if (updates.learning) {
            // Safe array access with fallbacks
            const existingCompleted = Array.isArray(profile.learning?.completedTopics) ? profile.learning.completedTopics : [];
            const newCompleted = Array.isArray(updates.learning.completedTopics) ? updates.learning.completedTopics : [];
            const existingWantsToLearn = Array.isArray(profile.learning?.wantsToLearn) ? profile.learning.wantsToLearn : [];
            const newWantsToLearn = Array.isArray(updates.learning.wantsToLearn) ? updates.learning.wantsToLearn : [];
            const existingStrugglingWith = Array.isArray(profile.learning?.strugglingWith) ? profile.learning.strugglingWith : [];
            const newStrugglingWith = Array.isArray(updates.learning.strugglingWith) ? updates.learning.strugglingWith : [];

            partialProfile.learning = {
                ...profile.learning,
                ...updates.learning,
                // Merge arrays instead of replacing
                completedTopics: [...new Set([...existingCompleted, ...newCompleted])],
                strugglingWith: [...new Set([...existingStrugglingWith, ...newStrugglingWith])],
                wantsToLearn: [...new Set([...existingWantsToLearn, ...newWantsToLearn])]
            };
        }

        if (updates.mentalState) {
            partialProfile.mentalState = { ...profile.mentalState, ...updates.mentalState };
        }

        if (updates.traits) {
            // Safe array access with fallbacks
            const existingStrengths = Array.isArray(profile.traits?.strengths) ? profile.traits.strengths : [];
            const newStrengths = Array.isArray(updates.traits.strengths) ? updates.traits.strengths : [];
            const existingAreasToImprove = Array.isArray(profile.traits?.areasToImprove) ? profile.traits.areasToImprove : [];
            const newAreasToImprove = Array.isArray(updates.traits.areasToImprove) ? updates.traits.areasToImprove : [];

            partialProfile.traits = {
                ...profile.traits,
                ...updates.traits,
                // Merge arrays
                strengths: [...new Set([...existingStrengths, ...newStrengths])],
                areasToImprove: [...new Set([...existingAreasToImprove, ...newAreasToImprove])]
            };
        }

        // Update meta
        partialProfile.meta = {
            ...profile.meta,
            lastUpdated: new Date().toISOString(),
            totalLogsAnalyzed: (profile.meta?.totalLogsAnalyzed || 0) + 1
        };

        const merged = mergeUserProfileUpdates(profile, partialProfile);
        setProfile(merged);
        await saveProfile(merged);
    }, [profile, saveProfile]);

    // Initial load
    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    return {
        profile,
        loading,
        error,
        updateProfile,
        updateFromAI,
        reload: loadProfile
    };
};

export default useUserProfile;
