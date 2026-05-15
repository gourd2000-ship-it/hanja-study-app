import { renderHook, act } from '@testing-library/react';
import { useStudy } from '../useStudy';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.alert
window.alert = vi.fn();

describe('useStudy Hook - Level Transition Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should transition from 7급B to 6급A after completing Day 20', () => {
        const { result } = renderHook(() => useStudy());

        // Force set level to 7급B and Day 20
        act(() => {
            result.current.setLevel('7급B');
        });

        // Set Day 20
        act(() => {
            // We need a way to set currentStudyDay directly for testing, 
            // but since it's internal, we simulate progress if needed.
            // For this test, let's assume we can set it via a reset or similar if implemented,
            // otherwise we have to complete days 1-20.
            // Let's use the fullReset to ensure a clean state, then manually adjust if we can.
        });

        // Actually, the completeStudy logic advances if studyDay === progressDay.
        // Let's mock the state to be at 7급B Day 20.
        act(() => {
            const savedProgress = JSON.parse(localStorage.getItem('hanja_maro_v4') || '{}');
            savedProgress.selectedLevel = '7급B';
            savedProgress.levels['7급B'].currentStudyDay = 20;
            localStorage.setItem('hanja_maro_v4', JSON.stringify(savedProgress));
        });

        // Re-render to pick up localStorage
        const { result: reResult } = renderHook(() => useStudy());
        expect(reResult.current.progress.selectedLevel).toBe('7급B');
        expect(reResult.current.progress.currentStudyDay).toBe(20);

        // Complete Day 20
        act(() => {
            reResult.current.completeStudy('learn', 20);
            reResult.current.completeStudy('quiz', 20);
        });

        // Verify transition to 6급A
        expect(reResult.current.progress.selectedLevel).toBe('6급A');
        expect(reResult.current.progress.currentStudyDay).toBe(1);
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('6급A'));
    });

    it('should transition from 6급A to 6급B after completing Day 20', () => {
        act(() => {
            const progress = {
                levels: {
                    '8급': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '7급A': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '7급B': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '6급A': { dailyQuests: [], currentStudyDay: 20, weakHanjaIds: [] },
                    '6급B': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '6급C': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] }
                },
                settings: { dailyCount: 5, studyDays: [], userName: '' },
                selectedLevel: '6급A'
            };
            localStorage.setItem('hanja_maro_v4', JSON.stringify(progress));
        });

        const { result } = renderHook(() => useStudy());
        
        act(() => {
            result.current.completeStudy('learn', 20);
            result.current.completeStudy('quiz', 20);
        });

        expect(result.current.progress.selectedLevel).toBe('6급B');
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('6급B'));
    });

    it('should show final completion message after 6급C Day 20', () => {
        act(() => {
            const progress = {
                levels: {
                    '8급': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '7급A': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '7급B': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '6급A': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '6급B': { dailyQuests: [], currentStudyDay: 1, weakHanjaIds: [] },
                    '6급C': { dailyQuests: [], currentStudyDay: 20, weakHanjaIds: [] }
                },
                settings: { dailyCount: 5, studyDays: [], userName: '' },
                selectedLevel: '6급C'
            };
            localStorage.setItem('hanja_maro_v4', JSON.stringify(progress));
        });

        const { result } = renderHook(() => useStudy());
        
        act(() => {
            result.current.completeStudy('learn', 20);
            result.current.completeStudy('quiz', 20);
        });

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('모든 급수 과정을 완료'));
    });
});
