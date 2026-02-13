import { useState, useEffect } from 'react';
import { hanjaData } from '../data/hanja';
import type { Hanja } from '../data/hanja';

const STUDY_SCHEDULE = [
    { day: 1, new: 5, review: 0, extra: 0 },
    { day: 2, new: 4, review: 0, extra: 0 },
    { day: 3, new: 4, review: 5, extra: 0 }, // G1
    { day: 4, new: 4, review: 4, extra: 0 }, // G2
    { day: 5, new: 3, review: 9, extra: 0 }, // G3 + G1
    { day: 6, new: 3, review: 8, extra: 0 }, // G4 + G2
    { day: 7, new: 3, review: 7, extra: 0 }, // G5 + G3
    { day: 8, new: 3, review: 12, extra: 0 }, // G6 + G4 + G1
    { day: 9, new: 3, review: 10, extra: 0 }, // G7 + G5 + G2
    { day: 10, new: 3, review: 10, extra: 0 }, // G8 + G6 + G3
    { day: 11, new: 3, review: 10, extra: 0 }, // G9 + G7 + G4
    { day: 12, new: 3, review: 9, extra: 0 }, // G10 + G8 + G5
    { day: 13, new: 3, review: 9, extra: 0 }, // G11 + G9 + G6
    { day: 14, new: 3, review: 9, extra: 0 }, // G12 + G10 + G7
    { day: 15, new: 3, review: 9, extra: 0 }, // G13 + G11 + G8
    { day: 16, new: 0, review: 20, extra: 0 }, // reinforcement
    { day: 17, new: 0, review: 20, extra: 0 },
    { day: 18, new: 0, review: 30, extra: 0 },
    { day: 19, new: 0, review: 30, extra: 0 },
    { day: 20, new: 0, review: 30, extra: 0 },
];

interface LevelProgress {
    dailyQuests: {
        date: string;
        learned: boolean;
        quizDone: boolean;
        studyDay: number;
    }[];
    currentStudyDay: number;
    weakHanjaIds: number[];
}

interface UserProgress {
    levels: {
        '8급': LevelProgress;
        '7급A': LevelProgress;
        '7급B': LevelProgress;
    };
    settings: {
        dailyCount: number;
        studyDays: string[];
        userName: string;
    };
    selectedLevel: '8급' | '7급A' | '7급B';
}

const createLevelTemplate = (): LevelProgress => ({
    dailyQuests: [],
    currentStudyDay: 1,
    weakHanjaIds: []
});

export const useStudy = () => {
    const [progress, setProgress] = useState<UserProgress>(() => {
        try {
            const saved = localStorage.getItem('hanja_maro_v4');
            if (saved) return JSON.parse(saved);

            return {
                levels: {
                    '8급': createLevelTemplate(),
                    '7급A': createLevelTemplate(),
                    '7급B': createLevelTemplate()
                },
                settings: {
                    dailyCount: 5,
                    studyDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    userName: '학생',
                },
                selectedLevel: '8급'
            };
        } catch (e) {
            return {
                levels: {
                    '8급': createLevelTemplate(),
                    '7급A': createLevelTemplate(),
                    '7급B': createLevelTemplate()
                },
                settings: {
                    dailyCount: 5,
                    studyDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    userName: '학생',
                },
                selectedLevel: '8급'
            };
        }
    });

    useEffect(() => {
        localStorage.setItem('hanja_maro_v4', JSON.stringify(progress));
    }, [progress]);

    const getCurrentLevelData = () => progress.levels[progress.selectedLevel];

    const getCurrentDate = () => {
        return new Date();
    };

    const isStudyDay = (date: Date) => {
        const day = date.getDay();
        return day !== 0 && day !== 6;
    };

    const getTodayWords = () => {
        const levelData = getCurrentLevelData();
        const studyDay = levelData.currentStudyDay;
        const schedule = STUDY_SCHEDULE.find(s => s.day === studyDay);
        if (!schedule) return { new: [], review: [], extraMix: [], schedule: null };

        let levelHanja: Hanja[] = [];
        if (progress.selectedLevel === '8급') levelHanja = hanjaData.slice(0, 50);
        else if (progress.selectedLevel === '7급A') levelHanja = hanjaData.slice(50, 100);
        else if (progress.selectedLevel === '7급B') levelHanja = hanjaData.slice(100, 150);

        let offset = 0;
        for (let i = 0; i < studyDay - 1; i++) {
            offset += STUDY_SCHEDULE[i].new;
        }
        const newWords = levelHanja.slice(offset, offset + schedule.new);

        const reviewOffsets = [2, 4, 7];
        const reviewTargetDays = reviewOffsets
            .map(off => studyDay - off)
            .filter(d => d >= 1);

        const baseReviewWords: Hanja[] = [];
        reviewTargetDays.forEach(d => {
            let dOffset = 0;
            for (let i = 0; i < d - 1; i++) dOffset += STUDY_SCHEDULE[i].new;
            const wordsOnThatDay = levelHanja.slice(dOffset, dOffset + STUDY_SCHEDULE[d - 1].new);
            baseReviewWords.push(...wordsOnThatDay);
        });

        const allStudiedSoFar = levelHanja.slice(0, offset + schedule.new);
        const existingIds = new Set([...newWords, ...baseReviewWords].map(w => w.id));

        const weakPool = levelData.weakHanjaIds
            .map(id => levelHanja.find(h => h.id === id))
            .filter((h): h is Hanja => !!h && !existingIds.has(h.id));

        let randomPool: Hanja[] = [];
        if (studyDay >= 18) {
            randomPool = levelHanja.filter(h => !existingIds.has(h.id));
        } else {
            randomPool = allStudiedSoFar.filter(h => !existingIds.has(h.id));
        }

        const extraMix = [...weakPool, ...randomPool.sort(() => Math.random() - 0.5)].slice(0, Math.max(0, schedule.review - baseReviewWords.length + schedule.extra));

        return { new: newWords, review: baseReviewWords, extraMix, schedule, currentStudyDay: studyDay };
    };

    const completeStudy = (type: 'learn' | 'quiz') => {
        const todayStr = getCurrentDate().toISOString().split('T')[0];

        setProgress(prev => {
            const currentLv = prev.selectedLevel;
            const lvData = prev.levels[currentLv];
            const studyDay = lvData.currentStudyDay;

            const existingIdx = lvData.dailyQuests.findIndex(q => q.studyDay === studyDay);
            let newQuests = [...lvData.dailyQuests];

            if (existingIdx >= 0) {
                newQuests[existingIdx] = {
                    ...newQuests[existingIdx],
                    learned: type === 'learn' ? true : newQuests[existingIdx].learned,
                    quizDone: type === 'quiz' ? true : newQuests[existingIdx].quizDone
                };
            } else {
                newQuests.push({
                    date: todayStr,
                    studyDay,
                    learned: type === 'learn',
                    quizDone: type === 'quiz'
                });
            }

            // Only advance day if both are done
            const targetQuest = newQuests.find(q => q.studyDay === studyDay);
            const shouldAdvance = targetQuest?.learned && targetQuest?.quizDone;

            return {
                ...prev,
                levels: {
                    ...prev.levels,
                    [currentLv]: {
                        ...lvData,
                        dailyQuests: newQuests,
                        currentStudyDay: shouldAdvance ? Math.min(20, studyDay + 1) : studyDay
                    }
                }
            };
        });
    };

    const addWeakness = (id: number) => {
        setProgress(prev => {
            const currentLv = prev.selectedLevel;
            const lvData = prev.levels[currentLv];
            const unique = Array.from(new Set([id, ...lvData.weakHanjaIds]));

            return {
                ...prev,
                levels: {
                    ...prev.levels,
                    [currentLv]: {
                        ...lvData,
                        weakHanjaIds: unique.slice(0, 10)
                    }
                }
            };
        });
    };

    const resetProgress = (level?: '8급' | '7급A' | '7급B') => {
        const targetLevel = level || progress.selectedLevel;
        setProgress(prev => ({
            ...prev,
            levels: {
                ...prev.levels,
                [targetLevel]: createLevelTemplate()
            }
        }));
    };

    const setLevel = (level: '8급' | '7급A' | '7급B') => {
        setProgress(prev => ({
            ...prev,
            selectedLevel: level
        }));
    };

    return {
        progress: {
            ...progress,
            dailyQuests: getCurrentLevelData().dailyQuests,
            currentStudyDay: getCurrentLevelData().currentStudyDay,
            weakHanjaIds: getCurrentLevelData().weakHanjaIds
        },
        getTodayWords,
        completeStudy,
        addWeakness,
        resetProgress,
        setLevel,
        getCurrentDate,
        isStudyDay
    };
};
