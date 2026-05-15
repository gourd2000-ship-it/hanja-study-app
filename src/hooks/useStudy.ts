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
    { day: 12, new: 3, review: 9, extra: 0 }, // G10 + 연수 + G5
    { day: 13, new: 3, review: 9, extra: 0 }, 
    { day: 14, new: 3, review: 9, extra: 0 },
    { day: 15, new: 3, review: 9, extra: 0 },
    { day: 16, new: 0, review: 20, extra: 0 }, // reinforcement
    { day: 17, new: 0, review: 20, extra: 0 },
    { day: 18, new: 0, review: 30, extra: 0 },
    { day: 19, new: 0, review: 30, extra: 0 },
    { day: 20, new: 0, review: 30, extra: 0 },
];

const LEVEL_SEQUENCE: ('8급' | '7급A' | '7급B' | '6급A' | '6급B' | '6급C')[] = ['8급', '7급A', '7급B', '6급A', '6급B', '6급C'];


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
        '6급A': LevelProgress;
        '6급B': LevelProgress;
        '6급C': LevelProgress;
    };
    settings: {
        dailyCount: number;
        studyDays: string[];
        userName: string;
    };
    selectedLevel: '8급' | '7급A' | '7급B' | '6급A' | '6급B' | '6급C';
}

const createLevelTemplate = (): LevelProgress => ({
    dailyQuests: [],
    currentStudyDay: 1,
    weakHanjaIds: []
});

export const useStudy = () => {
    const [progress, setProgress] = useState<UserProgress>(() => {
        const defaultState: UserProgress = {
            levels: {
                '8급': createLevelTemplate(),
                '7급A': createLevelTemplate(),
                '7급B': createLevelTemplate(),
                '6급A': createLevelTemplate(),
                '6급B': createLevelTemplate(),
                '6급C': createLevelTemplate()
            },
            settings: {
                dailyCount: 5,
                studyDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                userName: '학생',
            },
            selectedLevel: '8급'
        };

        try {
            const saved = localStorage.getItem('hanja_maro_v4');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 마이그레이션: 기존 데이터에 새로운 급수가 없는 경우 추가
                LEVEL_SEQUENCE.forEach(lv => {
                    if (!parsed.levels[lv]) {
                        parsed.levels[lv] = createLevelTemplate();
                    }
                });
                return parsed;
            }
            return defaultState;
        } catch (e) {
            return defaultState;
        }
    });

    useEffect(() => {
        localStorage.setItem('hanja_maro_v4', JSON.stringify(progress));
    }, [progress]);

    const getCurrentLevelData = () => {
        // 급수 데이터가 없는 경우를 대비한 안전 장치
        return progress.levels[progress.selectedLevel] || createLevelTemplate();
    };

    const getCurrentDate = () => {
        return new Date();
    };

    const isStudyDay = (date: Date) => {
        const day = date.getDay();
        return day !== 0 && day !== 6;
    };

    const getTodayWords = (day?: number) => {
        const levelData = getCurrentLevelData();
        const studyDay = day || levelData.currentStudyDay;
        const schedule = STUDY_SCHEDULE.find(s => s.day === studyDay);
        if (!schedule) return { new: [], review: [], extraMix: [], schedule: null, currentStudyDay: studyDay };

        let levelHanja: Hanja[] = [];
        if (progress.selectedLevel === '8급') levelHanja = hanjaData.slice(0, 50);
        else if (progress.selectedLevel === '7급A') levelHanja = hanjaData.slice(50, 100);
        else if (progress.selectedLevel === '7급B') levelHanja = hanjaData.slice(100, 150);
        else if (progress.selectedLevel === '6급A') levelHanja = hanjaData.slice(150, 200);
        else if (progress.selectedLevel === '6급B') levelHanja = hanjaData.slice(200, 250);
        else if (progress.selectedLevel === '6급C') levelHanja = hanjaData.slice(250, 300);

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

        return { new: newWords, review: baseReviewWords, extraMix, schedule, studyDay };
    };

    const completeStudy = (type: 'learn' | 'quiz', day: number) => {
        const todayStr = getCurrentDate().toISOString().split('T')[0];

        setProgress(prev => {
            const currentLv = prev.selectedLevel;
            const lvData = prev.levels[currentLv];
            const studyDay = day;
            const progressDay = lvData.currentStudyDay;

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

            // Only advance day if both are done AND it's the current progress day
            const targetQuest = newQuests.find(q => q.studyDay === studyDay);
            const shouldAdvance = targetQuest?.learned && targetQuest?.quizDone;

            let nextDay = progressDay;
            let nextLevel = currentLv;

            if (shouldAdvance && studyDay === progressDay) {
                if (progressDay < 20) {
                    nextDay = progressDay + 1;
                } else {
                    // Day 20 is done, move to next level
                    const currentIndex = LEVEL_SEQUENCE.indexOf(currentLv);
                    if (currentIndex < LEVEL_SEQUENCE.length - 1) {
                        nextLevel = LEVEL_SEQUENCE[currentIndex + 1];
                        nextDay = 1;
                        alert(`축하합니다! ${currentLv} 과정을 모두 마쳤습니다. 다음 단계인 ${nextLevel}을 시작합니다!`);
                    } else {
                        alert(`축하합니다! 모든 급수 과정을 완료하셨습니다!`);
                    }
                }
            }

            return {
                ...prev,
                selectedLevel: nextLevel,
                levels: {
                    ...prev.levels,
                    [currentLv]: {
                        ...lvData,
                        dailyQuests: newQuests,
                        currentStudyDay: nextDay
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

    const resetProgress = (level?: '8급' | '7급A' | '7급B' | '6급A' | '6급B' | '6급C') => {
        const targetLevel = level || progress.selectedLevel;
        setProgress(prev => ({
            ...prev,
            levels: {
                ...prev.levels,
                [targetLevel]: createLevelTemplate()
            }
        }));
    };

    const setLevel = (level: '8급' | '7급A' | '7급B' | '6급A' | '6급B' | '6급C') => {
        setProgress(prev => ({
            ...prev,
            selectedLevel: level
        }));
    };

    const updateUserName = (name: string) => {
        setProgress(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                userName: name
            }
        }));
    };

    const fullReset = () => {
        setProgress({
            levels: {
                '8급': createLevelTemplate(),
                '7급A': createLevelTemplate(),
                '7급B': createLevelTemplate(),
                '6급A': createLevelTemplate(),
                '6급B': createLevelTemplate(),
                '6급C': createLevelTemplate()
            },
            settings: {
                dailyCount: 5,
                studyDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                userName: '학생',
            },
            selectedLevel: '8급'
        });
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
        updateUserName,
        fullReset,
        getCurrentDate,
        isStudyDay
    };
};
