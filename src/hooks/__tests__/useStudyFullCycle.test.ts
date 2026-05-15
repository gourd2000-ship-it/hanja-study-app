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

describe('useStudy Hook - Level 6 Full Lifecycle Trace (D+0 -> D+2 -> D+7)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    const runFullCycleTest = (level: '6급A' | '6급B' | '6급C', startId: number) => {
        it(`should correctly track every Hanja ID in ${level} through its full learning lifecycle`, () => {
            const { result } = renderHook(() => useStudy());
            
            act(() => {
                result.current.setLevel(level);
            });

            const lifecycleMap: Record<number, { newDay: number; d2ReviewDay: number; d4ReviewDay: number; d7ReviewDay: number }> = {};
            const totalHanja = 50;
            const endId = startId + totalHanja - 1;

            // 1. Collect New Learning Day for each Hanja
            for (let day = 1; day <= 20; day++) {
                const data = result.current.getTodayWords(day);
                data.new.forEach(h => {
                    lifecycleMap[h.id] = {
                        newDay: day,
                        d2ReviewDay: -1,
                        d4ReviewDay: -1,
                        d7ReviewDay: -1
                    };
                });
            }

            // 2. Verify all 50 Hanja were introduced
            const introducedIds = Object.keys(lifecycleMap).map(Number);
            expect(introducedIds.length).toBe(totalHanja);
            for (let id = startId; id <= endId; id++) {
                expect(introducedIds).toContain(id);
            }

            // 3. Trace Review Days
            for (let day = 1; day <= 20; day++) {
                const data = result.current.getTodayWords(day);
                data.review.forEach(h => {
                    if (lifecycleMap[h.id]) {
                        const info = lifecycleMap[h.id];
                        if (day === info.newDay + 2) info.d2ReviewDay = day;
                        if (day === info.newDay + 4) info.d4ReviewDay = day;
                        if (day === info.newDay + 7) info.d7ReviewDay = day;
                    }
                });
            }

            // 4. Final Validation: Each Hanja must follow the D+2, D+4, D+7 pattern (if within 20 days)
            console.log(`\n--- ${level} Lifecycle Trace Report ---`);
            let successCount = 0;
            for (let id = startId; id <= endId; id++) {
                const info = lifecycleMap[id];
                const expectedD2 = info.newDay + 2;
                const expectedD4 = info.newDay + 4;
                const expectedD7 = info.newDay + 7;

                // Check D+2
                if (expectedD2 <= 20) {
                    expect(info.d2ReviewDay).toBe(expectedD2);
                }
                // Check D+4
                if (expectedD4 <= 20) {
                    expect(info.d4ReviewDay).toBe(expectedD4);
                }
                // Check D+7
                if (expectedD7 <= 20) {
                    expect(info.d7ReviewDay).toBe(expectedD7);
                }
                
                successCount++;
            }
            console.log(`${level}: All ${successCount} Hanja followed the cumulative review pattern successfully.`);
        });
    };

    runFullCycleTest('6급A', 151);
    runFullCycleTest('6급B', 201);
    runFullCycleTest('6급C', 251);
});
