"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PlayCircle,
  Plus,
  Trash2,
  Users,
  ArrowLeft,
  Loader2,
  Library,
  CheckCircle,
  XCircle,
  Crown,
  Power,
  Timer,
} from "lucide-react";
import { getCategories } from "@/app/actions/category";
import { getQuestions } from "@/app/actions/question";

// ─── Types ───
type Team = {
  id: string;
  name: string;
  score: number;
};

type CategoryData = {
  id: string;
  name: string;
  pointsPerQuestion: number;
  color: string;
  _count: { questions: number };
};

type QuestionData = {
  id: string;
  text: string;
  type: string;
  options: string[];
  answer: string;
  categoryId: string;
  category: { id: string; name: string; pointsPerQuestion: number; color: string };
};

type GamePhase = "SETUP" | "BOARD" | "GRID" | "QUESTION" | "WINNER";

type GameState = {
  teams: Team[];
  usedQuestionIds: string[];
  currentTeamIndex: number;
  phase: GamePhase;
};

// ─── Color Mapping ───
const COLOR_MAP: Record<string, { theme: string; text: string; bg: string }> = {
  blue:    { theme: "from-blue-500/20 to-blue-500/5 hover:border-blue-500/50",    text: "text-blue-400",    bg: "bg-blue-500" },
  emerald: { theme: "from-emerald-500/20 to-emerald-500/5 hover:border-emerald-500/50", text: "text-emerald-400", bg: "bg-emerald-500" },
  rose:    { theme: "from-rose-500/20 to-rose-500/5 hover:border-rose-500/50",    text: "text-rose-400",    bg: "bg-rose-500" },
  amber:   { theme: "from-amber-500/20 to-amber-500/5 hover:border-amber-500/50",  text: "text-amber-400",   bg: "bg-amber-500" },
  purple:  { theme: "from-purple-500/20 to-purple-500/5 hover:border-purple-500/50", text: "text-purple-400",  bg: "bg-purple-500" },
  cyan:    { theme: "from-cyan-500/20 to-cyan-500/5 hover:border-cyan-500/50",    text: "text-cyan-400",    bg: "bg-cyan-500" },
};

const getColor = (colorId: string) => COLOR_MAP[colorId] || COLOR_MAP.blue;

// ─── LocalStorage Helpers ───
const STORAGE_KEY = "bme_competition_state";
const SETTINGS_KEY = "bme_settings";

const loadState = (): GameState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
};

const saveState = (state: GameState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const clearState = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
};

const getTimerDuration = (): number => {
  if (typeof window === "undefined") return 30;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return 30;
    const s = JSON.parse(raw);
    return s.timerDuration || 30;
  } catch {
    return 30;
  }
};

// ─── Sound Helper (Web Audio API) ───
const playTick = (urgent: boolean) => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = urgent ? 880 : 600;
    gain.gain.value = urgent ? 0.3 : 0.15;
    osc.start();
    osc.stop(ctx.currentTime + (urgent ? 0.08 : 0.05));
  } catch {
    // Silent fallback
  }
};

const playBuzzer = () => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 200;
    gain.gain.value = 0.25;
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Silent fallback
  }
};

// ─── Pre-generated Confetti Data (outside component to avoid impure render calls) ───
const CONFETTI_COLORS = ["#FBBF24", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#F97316"];
const CONFETTI_DATA = Array.from({ length: 60 }).map((_, i) => ({
  left: ((i * 37 + 13) % 100),
  delay: ((i * 17 + 7) % 30) / 10,
  duration: 2 + ((i * 23 + 11) % 30) / 10,
  size: 6 + ((i * 13 + 3) % 10),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

// ─── Component ───
const CompetitionPage = () => {
  // Game State
  const [teams, setTeams] = useState<Team[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState<number>(0);
  const [phase, setPhase] = useState<GamePhase>("SETUP");

  // UI State
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [questionIdsByCategory, setQuestionIdsByCategory] = useState<Record<string, string[]>>({});

  const [allCategoryQuestions, setAllCategoryQuestions] = useState<QuestionData[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);

  // Question Modal State
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);
  const [selectedTfAnswer, setSelectedTfAnswer] = useState<string | null>(null);
  const [questionResolved, setQuestionResolved] = useState<boolean>(false);

  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Persist State ───
  const persistState = useCallback((t: Team[], used: string[], idx: number, p: GamePhase) => {
    saveState({ teams: t, usedQuestionIds: used, currentTeamIndex: idx, phase: p });
  }, []);

  // ─── Load Saved Session ───
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.teams.length > 0 && saved.phase !== "SETUP") {
      setTeams(saved.teams);
      setUsedQuestionIds(saved.usedQuestionIds);
      setCurrentTeamIndex(saved.currentTeamIndex);
      setPhase(saved.phase === "QUESTION" ? "BOARD" : saved.phase === "GRID" ? "BOARD" : saved.phase);
    }
    setIsInitialized(true);
  }, []);

  // ─── Fetch Categories + all question IDs when entering BOARD ───
  useEffect(() => {
    if (phase === "BOARD") {
      const fetchData = async () => {
        setIsLoadingCategories(true);
        const [catRes, qRes] = await Promise.all([getCategories(), getQuestions()]);
        if (catRes.success && catRes.data) {
          setCategories(catRes.data as unknown as CategoryData[]);
        }
        if (qRes.success && qRes.data) {
          const qData = qRes.data as unknown as QuestionData[];
          const map: Record<string, string[]> = {};
          qData.forEach((q) => {
            if (!map[q.categoryId]) map[q.categoryId] = [];
            map[q.categoryId].push(q.id);
          });
          setQuestionIdsByCategory(map);
        }
        setIsLoadingCategories(false);
      };
      fetchData();
    }
  }, [phase]);

  // ─── Auto-detect when all questions are exhausted ───
  useEffect(() => {
    if (phase !== "BOARD" || categories.length === 0) return;
    const totalAvailable = categories.reduce((sum, c) => sum + c._count.questions, 0);
    if (totalAvailable > 0 && usedQuestionIds.length >= totalAvailable) {
      setPhase("WINNER");
    }
  }, [phase, categories, usedQuestionIds]);

  // ─── Timer Logic ───
  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Time's up
          if (timerRef.current) clearInterval(timerRef.current);
          setTimerRunning(false);
          setShowAnswer(true);
          playBuzzer();
          return 0;
        }
        // Play tick sound
        playTick(next <= 5);
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timeLeft]);

  // ─── Team Management ───
  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const team: Team = {
      id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: newTeamName.trim(),
      score: 0,
    };
    setTeams((prev) => [...prev, team]);
    setNewTeamName("");
  };

  const handleAddTeamKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTeam();
    }
  };

  const handleRemoveTeam = (id: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
  };

  // ─── Start Competition ───
  const handleStartCompetition = () => {
    if (teams.length < 2) return;
    setPhase("BOARD");
    persistState(teams, usedQuestionIds, 0, "BOARD");
  };

  // ─── Category Selection → Grid ───
  const handleSelectCategory = async (cat: CategoryData) => {
    setSelectedCategory(cat);
    setIsLoadingQuestions(true);
    setPhase("GRID");

    const res = await getQuestions(cat.id);
    if (res.success && res.data) {
      const allQ = res.data as unknown as QuestionData[];
      setAllCategoryQuestions(allQ);
    }
    setIsLoadingQuestions(false);
  };

  // ─── Open Question ───
  const handleOpenQuestion = (questionId: string) => {
    const q = allCategoryQuestions.find((qq) => qq.id === questionId);
    if (!q) return;

    const currentTeam = teams[currentTeamIndex];
    setActiveQuestion(q);
    setActiveTeamId(currentTeam.id);
    setShowAnswer(false);
    setSelectedMcqOption(null);
    setSelectedTfAnswer(null);
    setQuestionResolved(false);
    setPhase("QUESTION");

    const duration = getTimerDuration();
    setTimeLeft(duration);
    setTimerRunning(true);
  };

  // ─── MCQ Option Selected ───
  const handleMcqSelect = (option: string) => {
    if (selectedMcqOption || questionResolved) return;
    setSelectedMcqOption(option);
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = option === activeQuestion?.answer;
    const points = activeQuestion?.category.pointsPerQuestion || 0;

    // Update score
    const updatedTeams = teams.map((t) => {
      if (t.id === activeTeamId) {
        return { ...t, score: isCorrect ? t.score + points : t.score - points };
      }
      return t;
    });
    setTeams(updatedTeams);

    // Mark question used
    const newUsed = [...usedQuestionIds, activeQuestion!.id];
    setUsedQuestionIds(newUsed);
    setQuestionResolved(true);
    setShowAnswer(true);

    persistState(updatedTeams, newUsed, currentTeamIndex, "GRID");

    // Auto-close after delay
    setTimeout(() => autoCloseQuestion(newUsed, updatedTeams), 1500);
  };

  // ─── True/False Auto-Scored ───
  const handleTrueFalseSelect = (choice: string) => {
    if (selectedTfAnswer || questionResolved || !activeQuestion) return;
    setSelectedTfAnswer(choice);
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = choice === activeQuestion.answer;
    const points = activeQuestion.category.pointsPerQuestion || 0;

    const updatedTeams = teams.map((t) => {
      if (t.id === activeTeamId) {
        return { ...t, score: isCorrect ? t.score + points : t.score - points };
      }
      return t;
    });
    setTeams(updatedTeams);

    const newUsed = [...usedQuestionIds, activeQuestion.id];
    setUsedQuestionIds(newUsed);
    setQuestionResolved(true);
    setShowAnswer(true);

    persistState(updatedTeams, newUsed, currentTeamIndex, "GRID");

    setTimeout(() => autoCloseQuestion(newUsed, updatedTeams), 1500);
  };


  // ─── Correct / Wrong for non-MCQ ───
  const handleNonMcqOutcome = (isCorrect: boolean) => {
    if (!activeQuestion) return;
    // Stop the timer immediately
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const points = activeQuestion.category.pointsPerQuestion;

    const updatedTeams = teams.map((t) => {
      if (t.id === activeTeamId) {
        return { ...t, score: isCorrect ? t.score + points : t.score - points };
      }
      return t;
    });
    setTeams(updatedTeams);

    const newUsed = [...usedQuestionIds, activeQuestion.id];
    setUsedQuestionIds(newUsed);
    setQuestionResolved(true);
    setShowAnswer(true);

    persistState(updatedTeams, newUsed, currentTeamIndex, "GRID");

    // Auto-close after delay
    setTimeout(() => autoCloseQuestion(newUsed, updatedTeams), 1500);
  };

  // ─── Auto-close: check if all category questions are done ───
  const autoCloseQuestion = (newUsed: string[], updatedTeams: Team[]) => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveQuestion(null);
    setActiveTeamId(null);
    setShowAnswer(false);
    setSelectedMcqOption(null);
    setSelectedTfAnswer(null);
    setQuestionResolved(false);

    // Advance to the next team
    const nextTeamIndex = (currentTeamIndex + 1) % updatedTeams.length;
    setCurrentTeamIndex(nextTeamIndex);
    setTeams(updatedTeams);

    // Always go back to categories board
    setSelectedCategory(null);
    setAllCategoryQuestions([]);
    persistState(updatedTeams, newUsed, nextTeamIndex, "BOARD");
    setPhase("BOARD");
  };

  // ─── Close Question & Return to Board (manual fallback) ───
  const handleCloseQuestion = () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveQuestion(null);
    setActiveTeamId(null);
    setShowAnswer(false);
    setSelectedMcqOption(null);
    setSelectedTfAnswer(null);
    setQuestionResolved(false);
    setSelectedCategory(null);
    setAllCategoryQuestions([]);
    setPhase("BOARD");
  };

  // ─── Back to Board ───
  const handleBackToBoard = () => {
    setPhase("BOARD");
    setSelectedCategory(null);
    setAllCategoryQuestions([]);
  };

  // ─── End Game → Show Winner ───
  const handleEndGame = () => {
    if (!confirm("Are you sure you want to end this competition?")) return;
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("WINNER");
  };

  // ─── Reset After Winner Screen ───
  const handleResetAfterWin = () => {
    clearState();
    setTeams([]);
    setUsedQuestionIds([]);
    setCurrentTeamIndex(0);
    setPhase("SETUP");
    setSelectedCategory(null);
    setAllCategoryQuestions([]);
    setActiveQuestion(null);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 1: TEAM SETUP
  // ═══════════════════════════════════════════════
  if (phase === "SETUP") {
    return (
      <div className="w-full h-full flex flex-col pt-4 md:pt-8 pr-2">
        <div className="flex flex-col mb-10 pl-4 md:pl-0">
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 font-sans tracking-tight mb-2">
            Setup Teams
          </h1>
          <p className="text-slate-400 font-light text-base md:text-lg max-w-2xl leading-relaxed mt-2">
            Add at least 2 teams to start the competition. Teams are temporary and will be cleared when the game ends.
          </p>
        </div>

        <div className="flex gap-3 mb-8 px-4 md:px-0 max-w-lg">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={handleAddTeamKeyDown}
            placeholder="Team name..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
          />
          <button
            onClick={handleAddTeam}
            disabled={!newTeamName.trim()}
            tabIndex={0}
            aria-label="Add team"
            className="px-5 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400 flex items-center gap-2"
          >
            <Plus size={20} />
            Add
          </button>
        </div>

        {teams.length > 0 && (
          <div className="flex flex-col gap-3 mb-10 px-4 md:px-0 max-w-lg">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl group hover:border-yellow-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-yellow-500/20 text-yellow-400 font-bold text-sm rounded-lg">
                    {index + 1}
                  </span>
                  <span className="text-slate-100 font-medium text-lg">{team.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveTeam(team.id)}
                  tabIndex={0}
                  aria-label={`Remove ${team.name}`}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 md:px-0">
          <button
            onClick={handleStartCompetition}
            disabled={teams.length < 2}
            tabIndex={0}
            aria-label="Start competition"
            className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-900 font-extrabold text-lg rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400/50 flex items-center gap-3"
          >
            <PlayCircle size={24} />
            Start Competition ({teams.length} Teams)
          </button>
          {teams.length < 2 && teams.length > 0 && (
            <p className="text-amber-400/70 text-sm mt-3">You need at least 2 teams to start.</p>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 2: LIVE BOARD (Scoreboard + Categories)
  // ═══════════════════════════════════════════════
  if (phase === "BOARD") {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

    return (
      <div className="w-full h-full flex flex-col pt-4 md:pt-8 pr-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pl-4 md:pl-0 gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 font-sans tracking-tight mb-1">
              Competition Live Board
            </h1>
          </div>
          <button
            onClick={handleEndGame}
            tabIndex={0}
            aria-label="End competition"
            className="px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2 shrink-0"
          >
            <Power size={18} />
            End Game
          </button>
        </div>

        {/* Scoreboard */}
        <div className="flex gap-4 mb-8 px-4 md:px-0 overflow-x-auto pb-2">
          {sortedTeams.map((team, i) => (
            <div
              key={team.id}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border shrink-0 transition-all ${
                i === 0 && team.score > 0
                  ? "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              {i === 0 && team.score > 0 && <Crown size={18} className="text-yellow-400" />}
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${i === 0 && team.score > 0 ? "text-yellow-400" : "text-slate-200"}`}>
                  {team.name}
                </span>
                <span className="text-lg font-extrabold text-white">{team.score} pts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Categories Grid */}
        <h2 className="text-xl font-bold text-slate-200 mb-4 pl-4 md:pl-0 flex items-center gap-2">
          <Library size={20} />
          Choose a Category
        </h2>

        {isLoadingCategories ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="animate-spin text-blue-500" size={48} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 px-4 md:px-0 pb-8">
            {categories.map((cat) => {
              const color = getColor(cat.color);
              const catQuestionIds = questionIdsByCategory[cat.id] || [];
              const remainingCount = catQuestionIds.filter((qId) => !usedQuestionIds.includes(qId)).length;
              const allAnswered = catQuestionIds.length > 0 && remainingCount === 0;
              const noQuestions = cat._count.questions === 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  disabled={noQuestions || allAnswered}
                  tabIndex={0}
                  aria-label={`Play ${cat.name} category`}
                  className={`group flex flex-col p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg transition-all duration-300 overflow-hidden bg-gradient-to-br ${color.theme} cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:opacity-40 disabled:cursor-not-allowed text-left`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-xl bg-slate-800/50 ${color.text} group-hover:scale-110 transition-transform`}>
                      <Library size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">{cat.name}</h3>
                      <p className={`text-sm ${color.text}`}>{cat.pointsPerQuestion} pts each</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-slate-700/50 flex justify-between items-center">
                    <span className="text-sm text-slate-400">
                      {remainingCount} / {cat._count.questions} remaining
                    </span>
                    {allAnswered ? (
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <CheckCircle size={14} />
                        Completed
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium">Tap to play</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 3: QUESTION GRID (Shared Pool — Current Team Picks)
  // ═══════════════════════════════════════════════
  if (phase === "GRID" && selectedCategory) {
    const catColor = getColor(selectedCategory.color);
    const currentTeam = teams[currentTeamIndex];
    const availableQuestions = allCategoryQuestions.filter((q) => !usedQuestionIds.includes(q.id));

    return (
      <div className="w-full h-full flex flex-col pt-4 md:pt-8 pr-2">
        {/* Top Bar */}
        <div className="flex w-full justify-between items-center mb-6 px-4 md:px-0">
          <button
            onClick={handleBackToBoard}
            tabIndex={0}
            aria-label="Back to board"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-lg p-2"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 ${catColor.text}`}>
            <Library size={18} />
            <span className="font-bold">{selectedCategory.name}</span>
            <span className="text-slate-500 text-sm">({selectedCategory.pointsPerQuestion} pts)</span>
          </div>
        </div>

        {/* Current Team Turn Banner */}
        <div className="mx-4 md:mx-0 mb-6 px-6 py-4 bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border-2 border-yellow-500/40 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
          <Users size={22} className="text-yellow-400" />
          <span className="text-2xl font-extrabold text-yellow-400">{currentTeam?.name}</span>
          <span className="text-lg text-slate-300 font-medium">— Pick a question!</span>
        </div>

        {/* Scoreboard Mini */}
        <div className="flex gap-3 mb-6 px-4 md:px-0 overflow-x-auto pb-1">
          {teams.map((team, i) => (
            <div
              key={team.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border shrink-0 transition-all ${
                i === currentTeamIndex
                  ? "bg-yellow-500/10 border-yellow-500/40 ring-2 ring-yellow-500/30"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <span className={`text-sm font-bold ${i === currentTeamIndex ? "text-yellow-400" : "text-slate-200"}`}>{team.name}</span>
              <span className={`text-sm font-extrabold ${team.score >= 0 ? "text-emerald-400" : "text-red-400"}`}>{team.score} pts</span>
            </div>
          ))}
        </div>

        {isLoadingQuestions ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-yellow-500" size={48} />
          </div>
        ) : (
          <div className="px-4 md:px-0 pb-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {allCategoryQuestions.map((q, index) => {
                const isUsed = usedQuestionIds.includes(q.id);
                if (isUsed) return null;
                return (
                  <button
                    key={q.id}
                    onClick={() => handleOpenQuestion(q.id)}
                    tabIndex={0}
                    aria-label={`Question ${index + 1}`}
                    className={`py-6 rounded-xl text-center font-extrabold text-3xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gradient-to-br ${catColor.theme} border border-slate-700 hover:border-yellow-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] text-slate-100 cursor-pointer hover:scale-110 active:scale-95`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            {availableQuestions.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-lg font-medium">
                All questions in this category have been answered!
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 4: QUESTION DISPLAY WITH TIMER
  // ═══════════════════════════════════════════════
  if (phase === "QUESTION" && activeQuestion) {
    const points = activeQuestion.category.pointsPerQuestion;
    const isMCQ = activeQuestion.type === "MULTIPLE_CHOICE";
    const isTrueFalse = activeQuestion.type === "TRUE_FALSE";
    const teamName = teams.find((t) => t.id === activeTeamId)?.name || "Team";
    const timerPercent = (timeLeft / getTimerDuration()) * 100;
    const isUrgent = timeLeft <= 5 && timeLeft > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 w-full max-w-2xl shadow-2xl relative flex flex-col items-center my-auto">

          {/* Timer Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full mb-6 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                isUrgent ? "bg-red-500 animate-pulse" : timeLeft > 0 ? "bg-amber-400" : "bg-slate-700"
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>

          {/* Timer Display */}
          <div className={`flex items-center gap-2 mb-4 ${isUrgent ? "animate-bounce" : ""}`}>
            <Timer size={20} className={isUrgent ? "text-red-400" : "text-amber-400"} />
            <span className={`text-3xl font-extrabold font-mono ${
              isUrgent ? "text-red-400" : timeLeft > 0 ? "text-amber-400" : "text-slate-500"
            }`}>
              {timeLeft}s
            </span>
          </div>

          {/* Category & Points */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getColor(activeQuestion.category.color).text} bg-slate-800`}>
              {activeQuestion.category.name}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-400">
              {points} Points
            </span>
          </div>

          {/* Team Name */}
          <p className="text-yellow-400 font-bold text-lg mb-6">
            <Users size={18} className="inline mr-2" />
            {teamName}&apos;s Turn
          </p>

          {/* Question Text */}
          <h2 className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed mb-8">
            {activeQuestion.text}
          </h2>

          {/* ─── MCQ: Clickable Options ─── */}
          {isMCQ && (
            <div className="w-full flex flex-col gap-3 mb-6">
              {activeQuestion.options.map((opt, i) => {
                const isSelected = selectedMcqOption === opt;
                const isCorrectOption = opt === activeQuestion.answer;
                const hasAnswered = selectedMcqOption !== null;

                let optionStyle = "bg-slate-800/50 border-slate-700 text-slate-200 hover:border-blue-500/50 cursor-pointer";
                if (hasAnswered) {
                  if (isCorrectOption) {
                    optionStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle = "bg-red-500/20 border-red-500/50 text-red-300";
                  } else {
                    optionStyle = "bg-slate-800/30 border-slate-800 text-slate-600";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleMcqSelect(opt)}
                    disabled={hasAnswered || !timerRunning}
                    tabIndex={0}
                    aria-label={`Option ${String.fromCharCode(65 + i)}: ${opt}`}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${optionStyle} ${hasAnswered ? "cursor-default" : ""}`}
                  >
                    <span className="w-8 h-8 flex items-center justify-center bg-slate-700/50 rounded-lg text-sm font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-left">{opt}</span>
                    {hasAnswered && isCorrectOption && <CheckCircle size={20} className="text-emerald-400 shrink-0" />}
                    {hasAnswered && isSelected && !isCorrectOption && <XCircle size={20} className="text-red-400 shrink-0" />}
                  </button>
                );
              })}

              {/* MCQ Result Message */}
              {selectedMcqOption && (
                <div className={`mt-2 p-3 rounded-lg text-center font-bold ${
                  selectedMcqOption === activeQuestion.answer
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}>
                  {selectedMcqOption === activeQuestion.answer
                    ? `✅ Correct! +${points} points`
                    : `❌ Wrong! -${points} points`
                  }
                </div>
              )}
            </div>
          )}

          {/* ─── TRUE_FALSE: Auto-scored True / False Buttons ─── */}
          {isTrueFalse && (
            <div className="w-full flex flex-col items-center gap-4 mb-6">
              <div className="flex gap-5 w-full max-w-md">
                {["True", "False"].map((choice) => {
                  const isSelected = selectedTfAnswer === choice;
                  const hasAnswered = selectedTfAnswer !== null;
                  const isCorrectChoice = choice === activeQuestion.answer;
                  const label = choice === "True" ? "True" : "False";
                  const icon = choice === "True" ? <CheckCircle size={28} /> : <XCircle size={28} />;

                  let btnStyle = choice === "True"
                    ? "bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-400/50 hover:scale-105"
                    : "bg-red-600 hover:bg-red-500 focus:ring-red-400/50 hover:scale-105";

                  if (hasAnswered) {
                    if (isCorrectChoice) {
                      btnStyle = "bg-emerald-500 ring-4 ring-emerald-400/50 scale-105";
                    } else if (isSelected && !isCorrectChoice) {
                      btnStyle = "bg-red-500 ring-4 ring-red-400/50 opacity-80";
                    } else {
                      btnStyle = "bg-slate-700 opacity-40";
                    }
                  }

                  return (
                    <button
                      key={choice}
                      onClick={() => handleTrueFalseSelect(choice)}
                      disabled={hasAnswered}
                      tabIndex={0}
                      aria-label={label}
                      className={`flex-1 py-6 rounded-2xl text-white font-extrabold text-2xl shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-4 flex flex-col items-center gap-2 active:scale-95 ${btnStyle} ${hasAnswered ? "cursor-default" : ""}`}
                    >
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Result Message */}
              {selectedTfAnswer && (
                <div className={`mt-2 p-3 rounded-lg text-center font-bold w-full ${
                  selectedTfAnswer === activeQuestion.answer
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}>
                  {selectedTfAnswer === activeQuestion.answer
                    ? `✅ Correct! +${points} points`
                    : `❌ Wrong! -${points} points — Correct answer: ${activeQuestion.answer}`
                  }
                </div>
              )}
            </div>
          )}

          {/* ─── Other Non-MCQ: Manual Correct / Wrong Buttons ─── */}
          {!isMCQ && !isTrueFalse && (
            <div className="w-full flex flex-col items-center gap-4 mb-6">
              {!questionResolved && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleNonMcqOutcome(true)}
                    tabIndex={0}
                    aria-label="Mark correct"
                    className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xl rounded-2xl shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-400/50 flex items-center gap-3 hover:scale-105 active:scale-95"
                  >
                    <CheckCircle size={26} />
                    Correct (+{points})
                  </button>
                  <button
                    onClick={() => handleNonMcqOutcome(false)}
                    tabIndex={0}
                    aria-label="Mark wrong"
                    className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xl rounded-2xl shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-400/50 flex items-center gap-3 hover:scale-105 active:scale-95"
                  >
                    <XCircle size={26} />
                    Wrong (-{points})
                  </button>
                </div>
              )}

              {/* Show correct answer + result after marking */}
              {questionResolved && (
                <>
                  <div className="w-full p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center mb-2">
                    <p className="text-xs uppercase text-slate-500 mb-1 font-semibold tracking-wider">Correct Answer</p>
                    <p className="text-emerald-300 font-bold text-xl">{activeQuestion.answer}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-center font-medium">
                    Score updated for {teamName}.
                  </div>
                </>
              )}
            </div>
          )}

          {/* Close / Return Button */}
          {(questionResolved || (isMCQ && selectedMcqOption) || (isTrueFalse && selectedTfAnswer)) && (
            <button
              onClick={handleCloseQuestion}
              tabIndex={0}
              aria-label="Return to grid"
              className="mt-4 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Return to Grid
            </button>
          )}
        </div>
      </div>
    );
  }
  // ═══════════════════════════════════════════════
  // PHASE 5: WINNER CELEBRATION
  // ═══════════════════════════════════════════════
  if (phase === "WINNER") {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const topScore = ranked[0]?.score ?? 0;
    const winners = ranked.filter((t) => t.score === topScore);
    const isTie = winners.length > 1;
    const podiumColors = ["from-yellow-400 to-amber-500", "from-slate-300 to-slate-400", "from-amber-600 to-amber-700"];
    const podiumHeights = ["h-40", "h-28", "h-20"];
    const podiumLabels = ["🥇", "🥈", "🥉"];

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden overflow-y-auto py-12">

        {/* Confetti Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {CONFETTI_DATA.map((c, i) => (
            <div
              key={i}
              className="absolute rounded-sm animate-confetti"
              style={{
                left: `${c.left}%`,
                top: "-20px",
                width: `${c.size}px`,
                height: `${c.size * 0.6}px`,
                backgroundColor: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Trophy & Title */}
        <div className="relative z-10 flex flex-col items-center mb-10 animate-fade-in">
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-yellow-300 via-amber-400 to-yellow-500 tracking-tight text-center">
            {isTie ? "It\u0027s a Tie!" : "Congratulations!"}
          </h1>
          <p className="text-slate-400 text-lg mt-3 text-center">
            {isTie
              ? `${winners.length} teams tied for first place!`
              : "The competition has ended. Here are the final results!"
            }
          </p>
        </div>

        {/* Winner Highlight — show all tied winners */}
        <div className="relative z-10 mb-10 px-10 py-6 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.2)] text-center animate-fade-in">
          <p className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-3">
            {isTie ? "Winners" : "Winner"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
            {winners.map((w) => (
              <h2 key={w.id} className="text-3xl md:text-5xl font-black text-white">
                {w.name}
              </h2>
            ))}
          </div>
          <p className="text-3xl font-extrabold text-yellow-400">{topScore} Points</p>
        </div>

        {/* Podium — only show if not a big tie */}
        {!isTie && (
          <div className="relative z-10 flex items-end gap-4 mb-12">
            {ranked.slice(0, 3).map((team, i) => {
              const order = i === 0 ? 1 : i === 1 ? 0 : 2;
              const displayTeam = ranked[order];
              if (!displayTeam) return null;
              return (
                <div key={displayTeam.id} className="flex flex-col items-center" style={{ order }}>
                  <span className="text-3xl mb-2">{podiumLabels[order]}</span>
                  <p className="text-sm font-bold text-slate-200 mb-2 text-center max-w-24 truncate">{displayTeam.name}</p>
                  <p className="text-xs font-bold text-slate-400 mb-1">{displayTeam.score} pts</p>
                  <div className={`w-24 ${podiumHeights[order]} bg-linear-to-t ${podiumColors[order]} rounded-t-xl flex items-start justify-center pt-3`}>
                    <span className="text-2xl font-black text-white/80">{order + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tied Winners — show all winners side by side with gold style */}
        {isTie && (
          <div className="relative z-10 flex flex-wrap items-end justify-center gap-6 mb-12">
            {winners.map((w) => (
              <div key={w.id} className="flex flex-col items-center">
                <span className="text-4xl mb-2">🥇</span>
                <p className="text-lg font-bold text-yellow-300 mb-2 text-center max-w-32 truncate">{w.name}</p>
                <p className="text-sm font-bold text-slate-400 mb-1">{w.score} pts</p>
                <div className="w-28 h-40 bg-linear-to-t from-yellow-400 to-amber-500 rounded-t-xl flex items-start justify-center pt-3">
                  <span className="text-2xl font-black text-white/80">1</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full Rankings (non-winners) */}
        {ranked.filter((t) => t.score !== topScore).length > 0 && (
          <div className="relative z-10 flex flex-col gap-2 mb-8 w-full max-w-md px-4">
            {ranked
              .filter((t) => t.score !== topScore)
              .map((team, i) => (
                <div key={team.id} className="flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 font-medium">#{winners.length + i + 1} {team.name}</span>
                  <span className="text-slate-300 font-bold">{team.score} pts</span>
                </div>
              ))}
          </div>
        )}

        {/* New Game Button */}
        <button
          onClick={handleResetAfterWin}
          tabIndex={0}
          aria-label="Start a new game"
          className="relative z-10 px-10 py-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-lg rounded-2xl shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-400/50 flex items-center gap-3"
        >
          <PlayCircle size={24} />
          New Competition
        </button>

        {/* CSS Animation */}
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti {
            animation: confetti-fall linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return null;
};

export default CompetitionPage;
