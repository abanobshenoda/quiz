"use client";

import { getCategories } from "@/app/actions/category";
import { createQuestion, deleteQuestion, getQuestions } from "@/app/actions/question";
import { Check, CheckCircle, Circle, HelpCircle, Loader2, Plus, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";

// Define Types aligned with Prisma
type Category = {
  id: string;
  name: string;
  pointsPerQuestion: number;
  color: string;
};

const COLOR_PALETTE = [
  { id: "blue", class: "bg-blue-500", label: "أزرق", theme: "from-blue-500/20 to-blue-500/5 hover:border-blue-500/50", text: "text-blue-400" },
  { id: "emerald", class: "bg-emerald-500", label: "أخضر", theme: "from-emerald-500/20 to-emerald-500/5 hover:border-emerald-500/50", text: "text-emerald-400" },
  { id: "rose", class: "bg-rose-500", label: "وردي", theme: "from-rose-500/20 to-rose-500/5 hover:border-rose-500/50", text: "text-rose-400" },
  { id: "amber", class: "bg-amber-500", label: "برتقالي", theme: "from-amber-500/20 to-amber-500/5 hover:border-amber-500/50", text: "text-amber-400" },
  { id: "purple", class: "bg-purple-500", label: "أرجواني", theme: "from-purple-500/20 to-purple-500/5 hover:border-purple-500/50", text: "text-purple-400" },
  { id: "cyan", class: "bg-cyan-500", label: "سماوي", theme: "from-cyan-500/20 to-cyan-500/5 hover:border-cyan-500/50", text: "text-cyan-400" },
];

const getThemeVars = (colorId: string) => {
  return COLOR_PALETTE.find(c => c.id === colorId) || COLOR_PALETTE[0];
};

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  answer: string;
  categoryId: string;
  category: Category;
};

function QuestionsPageContent() {
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("category");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || "");
  const [questionType, setQuestionType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [questionText, setQuestionText] = useState<string>("");
  const [mcqOptions, setMcqOptions] = useState<string[]>(["", "", "", ""]);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState<number>(0);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<string>("True");
  const [textAnswer, setTextAnswer] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [initialCategoryId]);

  const fetchData = async () => {
    setIsLoading(true);
    const [qRes, cRes] = await Promise.all([
      getQuestions(initialCategoryId || undefined),
      getCategories(),
    ]);

    if (qRes.success && qRes.data) {
      setQuestions(qRes.data as Question[]);
    }
    if (cRes.success && cRes.data) {
      setCategories(cRes.data as Category[]);
      if (!selectedCategory && cRes.data.length > 0) {
        setSelectedCategory((cRes.data as Category[])[0].id);
      }
    }
    setIsLoading(false);
  };

  const handleMcqOptionChange = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    let finalAnswer = "";
    let finalOptions: string[] = [];

    // Validation & formatting
    if (questionType === "MULTIPLE_CHOICE") {
      finalOptions = mcqOptions.filter(o => o.trim() !== "");
      if (finalOptions.length < 2) {
        setErrorMsg("Please provide at least 2 options for Multiple Choice.");
        return;
      }
      if (!mcqOptions[mcqCorrectIndex] || mcqOptions[mcqCorrectIndex].trim() === "") {
        setErrorMsg("The selected correct answer cannot be empty.");
        return;
      }
      finalAnswer = mcqOptions[mcqCorrectIndex];
    } else if (questionType === "TRUE_FALSE") {
      finalAnswer = trueFalseAnswer;
    } else {
      if (!textAnswer.trim()) {
        setErrorMsg("Please provide the expected correct answer.");
        return;
      }
      finalAnswer = textAnswer;
    }

    const formData = new FormData();
    formData.append("categoryId", selectedCategory);
    formData.append("text", questionText);
    formData.append("type", questionType);
    formData.append("answer", finalAnswer);
    if (questionType === "MULTIPLE_CHOICE") {
      formData.append("options", JSON.stringify(finalOptions));
    }

    startTransition(async () => {
      const res = await createQuestion(formData);
      if (res.success) {
        setIsModalOpen(false);
        setQuestionText("");
        setMcqOptions(["", "", "", ""]);
        setTextAnswer("");
        await fetchData();
      } else {
        setErrorMsg(res.error || "Failed to create question.");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    startTransition(async () => {
      const res = await deleteQuestion(id);
      if (res.success) {
        await fetchData();
      } else {
        alert(res.error || "Failed to delete");
      }
    });
  };

  const getTypeLabel = (type: QuestionType) => {
    switch(type) {
      case "MULTIPLE_CHOICE": return "Multiple Choice";
      case "TRUE_FALSE": return "True / False";
      case "FILL_BLANK": return "Fill in Blank";
      case "ESSAY": return "Essay";
      default: return type;
    }
  };

  const getTypeColor = (type: QuestionType) => {
    switch(type) {
      case "MULTIPLE_CHOICE": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "TRUE_FALSE": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "FILL_BLANK": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "ESSAY": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default: return "bg-slate-500/10 text-slate-400";
    }
  };

  return (
    <div className="w-full h-full flex flex-col pt-4 md:pt-8 pr-2 relative">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 w-full pl-4 md:pl-0 gap-4">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-300 font-sans tracking-tight mb-2">
            Questions Bank
          </h1>
          <p className="text-slate-400 font-light text-base md:text-lg max-w-2xl leading-relaxed mt-2 text-left">
            Create completely dynamic questions for specific categories. Provide the exact correct options or text required to validate points automatically.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={categories.length === 0}
          tabIndex={0}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={20} />
          Add Question
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-slate-800/60 shadow-xl backdrop-blur-sm min-h-[400px]">
          <div className="flex flex-col items-center justify-center text-center opacity-70">
            <div className="p-6 bg-blue-500/10 rounded-full mb-6">
              <HelpCircle size={64} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">No Questions Found</h2>
            <p className="text-slate-400 max-w-md">
              Start building your test configuration by clicking the 'Add Question' button above to populate your categories.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8 w-full">
          {questions.map((q) => {
            const theme = getThemeVars(q.category.color);
            return (
              <div
                key={q.id}
                className="group relative flex flex-col p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-md border uppercase tracking-wider ${getTypeColor(q.type)}`}>
                    {getTypeLabel(q.type)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 ${theme.text}`}>
                    {q.category.name} ({q.category.pointsPerQuestion} pts)
                  </span>
                <button
                  onClick={() => handleDelete(q.id)}
                  tabIndex={0}
                  aria-label="Delete question"
                  className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-200 mb-6 leading-relaxed">
                {q.text}
              </h3>

              <div className="mt-auto pt-4 border-t border-slate-800/60">
                <p className="text-xs uppercase text-slate-500 mb-3 font-semibold tracking-wider">Expected Answer</p>

                {q.type === "MULTIPLE_CHOICE" ? (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, i) => {
                      const isCorrect = opt === q.answer;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-sm border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/30 border-slate-700/50 text-slate-300'}`}>
                          {isCorrect ? <CheckCircle size={16} /> : <Circle size={16} className="text-slate-600" />}
                          <span>{opt}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-medium">{q.answer}</span>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Add Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative my-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-lg"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold text-slate-100 mb-6 font-sans">New Question</h2>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="categoryId" className="text-sm font-medium text-slate-300">Target Category</label>
                  <select
                    id="categoryId"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.pointsPerQuestion} pts)</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="type" className="text-sm font-medium text-slate-300">Question Type</label>
                  <select
                    id="type"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice (اختر)</option>
                    <option value="TRUE_FALSE">True / False (صح وخطأ)</option>
                    <option value="FILL_BLANK">Fill in Blank (اكمل)</option>
                    <option value="ESSAY">Essay (مقالي)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="text" className="text-sm font-medium text-slate-300">Question Text</label>
                <textarea
                  id="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                  rows={3}
                  placeholder="What is the main concept of..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                />
              </div>

              {/* Dynamic Form Sections based on Type */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Answer Configuration</h4>

                {questionType === "MULTIPLE_CHOICE" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-slate-500 mb-1">Fill in the options and click the radio button to mark the CORRECT answer.</p>
                    {mcqOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setMcqCorrectIndex(i)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${mcqCorrectIndex === i ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-600 hover:border-emerald-400'}`}
                        >
                          {mcqCorrectIndex === i && <Check size={14} />}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleMcqOptionChange(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {questionType === "TRUE_FALSE" && (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setTrueFalseAnswer("True")}
                      className={`flex-1 py-4 rounded-xl border font-bold text-lg transition-all ${trueFalseAnswer === "True" ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                      True
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrueFalseAnswer("False")}
                      className={`flex-1 py-4 rounded-xl border font-bold text-lg transition-all ${trueFalseAnswer === "False" ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                      False
                    </button>
                  </div>
                )}

                {(questionType === "FILL_BLANK" || questionType === "ESSAY") && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Type the expected correct answer..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium py-3 rounded-xl transition-all shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-center"
              >
                {isPending ? <Loader2 className="animate-spin" size={24} /> : "Save Question"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      }
    >
      <QuestionsPageContent />
    </Suspense>
  );
}
