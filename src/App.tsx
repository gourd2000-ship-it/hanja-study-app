import { useState, useEffect } from 'react';
import { useStudy } from './hooks/useStudy';
import { hanjaData } from './data/hanja';
import './index.css';

// Helpers
const shuffleArr = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

// Components
// Sound utility using Web Audio API
const playSound = (type: 'correct' | 'complete') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'complete') {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
        g.gain.setValueAtTime(0.1, audioCtx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.4);
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.5);
      });
    }
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
};

const LearningMode = ({ words, studyDay, onComplete }: any) => {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const current = words[index];

  const speak = (text: string, count: number = 1) => {
    return new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const koVoices = voices.filter(v => v.lang.includes('ko'));
      const naturalVoice = koVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || koVoices[0];
      if (naturalVoice) utter.voice = naturalVoice;
      utter.lang = 'ko-KR';
      utter.rate = 0.85;
      utter.pitch = 1.0;
      let remaining = count;
      utter.onend = () => {
        remaining -= 1;
        if (remaining > 0) setTimeout(() => window.speechSynthesis.speak(utter), 300);
        else resolve();
      };
      window.speechSynthesis.speak(utter);
    });
  };

  const playSequence = async () => {
    if (!current || isPlaying) return;
    setIsPlaying(true);
    window.speechSynthesis.cancel();
    await speak(`${current.meaning} ${current.sound}`, 3);
    await speak(current.word1, 1);
    await speak(current.word2, 1);
    setIsPlaying(false);
  };

  useEffect(() => {
    playSequence();
    return () => window.speechSynthesis.cancel();
  }, [index, words]);

  useEffect(() => {
    if (words.length === 0) {
      onComplete();
    }
  }, [words]);

  if (!current) return <div className="fade-in">오늘 학습할 한자가 없습니다!</div>;

  return (
    <div className="fade-in">
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            Day {studyDay} 학습 ({index + 1}/{words.length})
          </h2>
          <span style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: current.learningType === 'new' ? 'var(--primary)' : '#f1f5f9',
            color: current.learningType === 'new' ? 'white' : 'var(--text-muted)',
            fontWeight: 'bold'
          }}>
            {current.learningType === 'new' ? '신규' : '복습'}
          </span>
        </div>

        <div style={{ fontSize: '100px', margin: '15px 0', color: 'var(--primary)', fontWeight: 'bold' }}>{current.character}</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{current.meaning} {current.sound}</div>

        <div style={{ marginTop: '30px', textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ marginBottom: '8px' }}><strong>단어 1:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{current.word1}</span> ({current.word1Meaning})</p>
          <p><strong>단어 2:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{current.word2}</span> ({current.word2Meaning})</p>
        </div>

        <button
          className="btn btn-outline"
          style={{ marginTop: '20px', padding: '10px 20px', fontSize: '14px', borderRadius: '30px' }}
          disabled={isPlaying}
          onClick={playSequence}
        >
          {isPlaying ? '🔊 듣는 중...' : '▶️ 다시 듣기'}
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        {index < words.length - 1 ? (
          <button
            className="btn btn-primary"
            style={{ width: '100%', height: '50px', fontSize: '18px' }}
            disabled={isPlaying}
            onClick={() => setIndex(index + 1)}
          >
            {isPlaying ? '소리를 듣고 있어요...' : '다음 한자'}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%', height: '50px', fontSize: '18px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
            disabled={isPlaying}
            onClick={onComplete}
          >
            {isPlaying ? '소리를 듣고 있어요...' : '학습 완료!'}
          </button>
        )}
      </div>
    </div>
  );
};

const QuizMode = ({ todayData, onExit, onWrong }: any) => {
  const [session, setSession] = useState<{ questions: any[] } | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    if (!todayData || !todayData.schedule) return;

    const { new: newWords, review, extraMix, schedule } = todayData;

    // 1. Create Question Pools
    const createQuestions = (wordPool: any[], count: number) => {
      const qs: any[] = [];
      if (wordPool.length === 0 || count === 0) return qs;

      const types = ['basic', 'reverse', 'word-hanja', 'common-hanja'];

      for (let i = 0; i < count; i++) {
        const hanja = wordPool[i % wordPool.length];
        const type = types[Math.floor(Math.random() * types.length)];
        let questionData: any = { type, hanja };

        if (type === 'basic') {
          questionData.q = hanja.character;
          questionData.sub = "이 한자의 훈(뜻)과 음을 맞추세요.";
          questionData.correct = `${hanja.meaning} ${hanja.sound}`;
          questionData.options = hanjaData.filter(h => h.id !== hanja.id).map(h => `${h.meaning} ${h.sound}`);
        } else if (type === 'reverse') {
          questionData.q = `${hanja.meaning} ${hanja.sound}`;
          questionData.sub = "이 훈음과 맞는 한자를 고르세요.";
          questionData.correct = hanja.character;
          questionData.options = hanjaData.filter(h => h.id !== hanja.id).map(h => h.character);
        } else if (type === 'word-hanja') {
          const word = Math.random() > 0.5 ? hanja.word1 : hanja.word2;
          questionData.q = word;
          questionData.sub = `단어 '${word}'에 들어간 한자 중 하나를 고르세요.`;
          questionData.correct = hanja.character;
          questionData.options = hanjaData.filter(h => h.id !== hanja.id).map(h => h.character);
        } else if (type === 'common-hanja') {
          const w1 = hanja.word1.replace(hanja.character, '(  )');
          const w2 = hanja.word2.replace(hanja.character, '(  )');
          questionData.q = `${w1}, ${w2}`;
          questionData.sub = "괄호 안에 공통으로 들어갈 한자는?";
          questionData.correct = hanja.character;
          questionData.options = hanjaData.filter(h => h.id !== hanja.id).map(h => h.character);
        }

        const distractions = shuffleArr(questionData.options).slice(0, 3);
        questionData.choices = shuffleArr([questionData.correct, ...distractions]);
        qs.push(questionData);
      }
      return qs;
    };

    const newQs = createQuestions(newWords, schedule.new);
    const reviewQs = createQuestions(review, review.length);
    const extraQs = createQuestions(extraMix, extraMix.length);

    // 2. Round-Robin / 교차 출제 Logic
    // Interleave them so same character doesn't appear consecutively
    let allQs = [...newQs, ...reviewQs, ...extraQs];
    let interleaved: any[] = [];

    // Simple interleaving: take one from each non-empty pool until done
    const pools = [newQs, reviewQs, extraQs].filter(p => p.length > 0);
    let poolIndices = pools.map(() => 0);

    while (interleaved.length < allQs.length) {
      for (let i = 0; i < pools.length; i++) {
        if (poolIndices[i] < pools[i].length) {
          interleaved.push(pools[i][poolIndices[i]]);
          poolIndices[i]++;
        }
      }
    }

    setSession({ questions: interleaved });
  }, [todayData]);

  if (!todayData || !todayData.schedule) return <div>준비 중...</div>;

  const currentQ = session?.questions[currentIdx];

  const handleAnswer = (choice: string) => {
    const isCorrect = choice === currentQ.correct;

    if (isCorrect) {
      setFeedback('correct');
      playSound('correct');
      setTimeout(() => {
        setFeedback(null);
        if (currentIdx + 1 >= session!.questions.length) {
          playSound('complete');
          alert(`축하합니다! 오늘 총 ${session!.questions.length}문제를 정복하셨습니다!`);
          onExit();
        } else {
          setCurrentIdx(prev => prev + 1);
        }
      }, 800);
    } else {
      setFeedback('wrong');
      onWrong(currentQ.hanja.id);
      setWrongCount(prev => prev + 1);
      if (wrongCount + 1 >= 3) {
        setTimeout(() => {
          alert('3번 오답으로 오늘의 도전을 실패했습니다. 다시 학습해보세요!');
          onExit();
        }, 500);
      } else {
        setTimeout(() => setFeedback(null), 800);
      }
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
        <div style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          문제: {currentIdx + 1}/{session?.questions.length || 0}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} style={{ color: i < wrongCount ? 'var(--danger)' : '#cbd5e1', fontSize: '18px' }}>❤️</span>
          ))}
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
        {feedback === 'correct' && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '100px', color: 'var(--success)', zIndex: 10 }} className="fade-in">⭕</div>}
        {feedback === 'wrong' && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '100px', color: 'var(--danger)', zIndex: 10 }} className="fade-in">❌</div>}

        {!feedback && currentQ && (
          <div className="fade-in">
            <div style={{ fontSize: currentQ.type.includes('word') ? '40px' : '90px', color: 'var(--primary)', marginBottom: '15px', fontWeight: 'bold' }}>
              {currentQ.q}
            </div>
            <p style={{ marginBottom: '30px', color: 'var(--text-muted)', fontSize: '16px' }}>{currentQ.sub}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
              {currentQ.choices.map((choice: string, i: number) => (
                <button
                  key={i}
                  className="btn btn-outline"
                  style={{
                    fontSize: choice.length > 4 ? '14px' : '18px',
                    padding: '15px 5px',
                    borderColor: '#e2e8f0'
                  }}
                  onClick={() => handleAnswer(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ManagementMode = ({ progress, onReset, onSetLevel }: any) => {
  return (
    <div className="fade-in">
      <div className="card">
        <h3>🎯 급수 선택</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>급수를 선택하면 해당 급수의 1일차부터 다시 시작됩니다.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['8급', '7급A', '7급B'].map((lv) => (
            <button
              key={lv}
              className="btn"
              style={{
                flex: 1,
                backgroundColor: progress.selectedLevel === lv ? 'var(--primary)' : '#f1f5f9',
                color: progress.selectedLevel === lv ? 'white' : 'var(--text-muted)',
                fontWeight: 'bold',
                border: progress.selectedLevel === lv ? '1px solid var(--primary)' : '1px solid #e2e8f0',
              }}
              onClick={() => {
                onSetLevel(lv);
              }}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>학습 커리큘럼 ({progress.selectedLevel} - 20일)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '15px' }}>
          {Array.from({ length: 20 }).map((_, i) => {
            const dayNum = i + 1;
            const quest = progress.dailyQuests.find((q: any) => q.studyDay === dayNum);
            const isCurrent = progress.currentStudyDay === dayNum;

            let bg = '#f1f5f9';
            let border = '1px solid #e2e8f0';
            let color = 'var(--text-muted)';

            if (quest) {
              bg = quest.learned && quest.quizDone ? 'var(--primary)' : '#e2e8f0';
              color = quest.learned && quest.quizDone ? 'white' : 'var(--text-main)';
            } else if (isCurrent) {
              bg = '#fff';
              border = '2px solid var(--primary)';
              color = 'var(--primary)';
            }

            return (
              <div key={i} style={{
                aspectRatio: '1/1',
                background: bg,
                borderRadius: '8px',
                border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color
              }}>
                D{dayNum}
                {quest && (
                  <div style={{ position: 'absolute', bottom: '2px', fontSize: '8px', width: '100%', textAlign: 'center' }}>
                    {quest.learned && <div style={{ color: quest.learned && quest.quizDone ? 'white' : 'var(--success)' }}>학습 O</div>}
                    {quest.quizDone && <div style={{ color: quest.learned && quest.quizDone ? 'white' : 'var(--primary)' }}>퀴즈 O</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '15px' }}>* 파란색은 완료, 테두리는 오늘 학습일입니다.</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <details style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
          <summary style={{ fontSize: '12px', fontWeight: 'bold', padding: '10px' }}>⚠️ 위험 구역 (데이터 초기화)</summary>
          <div className="card" style={{ marginTop: '10px', borderColor: 'var(--danger)', background: '#fffcfc' }}>
            <p style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '15px' }}>주의: 모든 학습 기록, 약점 데이터, 설정값이 영구적으로 삭제됩니다.</p>
            <button
              className="btn"
              style={{ backgroundColor: 'var(--danger)', color: 'white', fontSize: '14px' }}
              onClick={() => {
                if (window.confirm('정말로 모든 학습 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  onReset();
                }
              }}
            >
              ⚠️ 전체 데이터 초기화 실행
            </button>
          </div>
        </details>
      </div>
    </div>
  );
};

function App() {
  const [mode, setMode] = useState<'learn' | 'quiz' | 'manage'>('manage');
  const { progress, getTodayWords, completeStudy, addWeakness, resetProgress, setLevel, getCurrentDate, isStudyDay } = useStudy();

  const todayData = getTodayWords();
  const currentDate = getCurrentDate();

  return (
    <div className="app-container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', color: 'var(--primary)', margin: 0 }}>한자마루</h1>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{progress.settings.userName} ({progress.selectedLevel})</div>
          <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>Day {progress.currentStudyDay} / 20</div>
        </div>
      </header>

      <nav className="top-nav">
        <div className={`nav-tab ${mode === 'learn' ? 'active' : ''}`} onClick={() => setMode('learn')}>학습</div>
        <div className={`nav-tab ${mode === 'quiz' ? 'active' : ''}`} onClick={() => setMode('quiz')}>퀴즈</div>
        <div className={`nav-tab ${mode === 'manage' ? 'active' : ''}`} onClick={() => setMode('manage')}>관리</div>
      </nav>

      <main className="content">
        {mode === 'learn' && (
          !isStudyDay(currentDate) ? (
            <div className="fade-in card" style={{ textAlign: 'center', padding: '40px' }}>
              <h2 style={{ fontSize: '40px', marginBottom: '20px' }}>⛱️</h2>
              <h3>오늘은 즐거운 주말입니다!</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>학습은 월요일부터 다시 시작됩니다. 푹 쉬세요!</p>
            </div>
          ) : (
            <LearningMode
              words={[
                ...todayData.new.map((w: any) => ({ ...w, learningType: 'new' })),
                ...todayData.review.map((w: any) => ({ ...w, learningType: 'review' }))
              ]}
              studyDay={progress.currentStudyDay}
              onComplete={() => {
                completeStudy('learn');
                setMode('quiz');
              }}
            />
          )
        )}
        {mode === 'quiz' && (
          !isStudyDay(currentDate) ? (
            <div className="fade-in card" style={{ textAlign: 'center', padding: '40px' }}>
              <h2 style={{ fontSize: '40px', marginBottom: '20px' }}>🎮</h2>
              <h3>주말에는 퀴즈도 쉬어갑니다!</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>충분한 휴식도 공부의 일부입니다.</p>
            </div>
          ) : (
            <QuizMode
              todayData={todayData}
              onExit={() => {
                completeStudy('quiz');
                setMode('manage');
              }}
              onWrong={(id: number) => addWeakness(id)}
            />
          )
        )}
        {mode === 'manage' && (
          <ManagementMode
            progress={progress}
            onReset={resetProgress}
            onSetLevel={setLevel}
          />
        )}
      </main>
    </div >
  );
}

export default App;
