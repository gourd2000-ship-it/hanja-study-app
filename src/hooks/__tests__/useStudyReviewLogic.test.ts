import { renderHook, act } from '@testing-library/react';
import { useStudy } from '../useStudy';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hanjaData } from '../../data/hanja';

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

describe('useStudy Hook - Level 6 Cumulative Review Logic Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    const testLevelReview = (level: '6급A' | '6급B' | '6급C', offset: number) => {
        describe(`Review Logic for ${level}`, () => {
            it('should have correct word counts and review words on Day 3 (1차 누적)', () => {
                const { result } = renderHook(() => useStudy());
                
                act(() => {
                    result.current.setLevel(level);
                });

                const todayData = result.current.getTodayWords(3);
                // Day 3: New(4) + Review(Day 1: 5) = 9
                expect(todayData.new.length).toBe(4);
                expect(todayData.review.length).toBe(5);
                
                // Day 1 words should be in review
                const day1StartId = offset + 1;
                const day1EndId = offset + 5;
                todayData.review.forEach(h => {
                    expect(h.id).toBeGreaterThanOrEqual(day1StartId);
                    expect(h.id).toBeLessThanOrEqual(day1EndId);
                });
            });

            it('should have correct word counts on Day 5 (1차+2차 누적)', () => {
                const { result } = renderHook(() => useStudy());
                
                act(() => {
                    result.current.setLevel(level);
                });

                const todayData = result.current.getTodayWords(5);
                // Day 5: New(3) + Review(Day 3: 4 + Day 1: 5) = 12 (Wait, schedule says 9 review on Day 5)
                // Let's check STUDY_SCHEDULE: { day: 5, new: 3, review: 9, extra: 0 }
                expect(todayData.new.length).toBe(3);
                expect(todayData.review.length).toBe(9);
            });

            it('should have correct word counts on Day 8 (1차+2차+3차 누적)', () => {
                const { result } = renderHook(() => useStudy());
                
                act(() => {
                    result.current.setLevel(level);
                });

                const todayData = result.current.getTodayWords(8);
                // Day 8: New(3) + Review(Day 6: 3 + Day 4: 4 + Day 1: 5) = 12
                // Let's check STUDY_SCHEDULE: { day: 8, new: 3, review: 12, extra: 0 }
                expect(todayData.new.length).toBe(3);
                expect(todayData.review.length).toBe(12);
                
                // Check if Day 1 words are included in Day 8 review (D-7)
                const day1StartId = offset + 1;
                const hasDay1 = todayData.review.some(h => h.id === day1StartId);
                expect(hasDay1).toBe(true);
            });
        });
    };

    // Level 6A starts at ID 151 (index 150)
    testLevelReview('6급A', 150);
    // Level 6B starts at ID 201 (index 200)
    testLevelReview('6급B', 200);
    // Level 6C starts at ID 251 (index 250)
    testLevelReview('6급C', 250);
});
