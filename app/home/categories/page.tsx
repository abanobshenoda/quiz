"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, FolderPlus, Library, Loader2, X } from "lucide-react";
import { getCategories, createCategory, deleteCategory } from "@/app/actions/category";
import Link from "next/link";

type CategoryWithCount = {
  id: string;
  name: string;
  pointsPerQuestion: number;
  color: string;
  _count: {
    questions: number;
  };
};

const COLOR_PALETTE = [
  { id: "blue", class: "bg-blue-500", label: "أزرق", theme: "from-blue-500/20 to-blue-500/5 hover:border-blue-500/50", text: "text-blue-400" },
  { id: "emerald", class: "bg-emerald-500", label: "أخضر", theme: "from-emerald-500/20 to-emerald-500/5 hover:border-emerald-500/50", text: "text-emerald-400" },
  { id: "rose", class: "bg-rose-500", label: "وردي", theme: "from-rose-500/20 to-rose-500/5 hover:border-rose-500/50", text: "text-rose-400" },
  { id: "amber", class: "bg-amber-500", label: "برتقالي", theme: "from-amber-500/20 to-amber-500/5 hover:border-amber-500/50", text: "text-amber-400" },
  { id: "purple", class: "bg-purple-500", label: "أرجواني", theme: "from-purple-500/20 to-purple-500/5 hover:border-purple-500/50", text: "text-purple-400" },
  { id: "cyan", class: "bg-cyan-500", label: "سماوي", theme: "from-cyan-500/20 to-cyan-500/5 hover:border-cyan-500/50", text: "text-cyan-400" },
];

const CategoriesPage = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Modal stats
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("blue");

  const fetchCategories = async () => {
    setIsLoading(true);
    const res = await getCategories();
    if (res.success && res.data) {
      setCategories(res.data as CategoryWithCount[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    formData.append("color", selectedColor);
    
    startTransition(async () => {
      const res = await createCategory(formData);
      if (res.success) {
        setIsModalOpen(false);
        setSelectedColor("blue");
        await fetchCategories();
      } else {
        setErrorMsg(res.error || "Failed to create category");
      }
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this category? All its questions will be permanently deleted!")) return;
    
    startTransition(async () => {
      const res = await deleteCategory(id);
      if (res.success) {
        await fetchCategories();
      } else {
        alert(res.error || "Failed to delete");
      }
    });
  };

  const handleDeleteKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDelete(id, e);
    }
  };

  const getThemeVars = (colorId: string) => {
    const colorObj = COLOR_PALETTE.find(c => c.id === colorId) || COLOR_PALETTE[0];
    return colorObj;
  };

  return (
    <div className="w-full h-full flex flex-col pt-4 md:pt-8 pr-2 relative">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 w-full pl-4 md:pl-0 gap-4">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-300 font-sans tracking-tight mb-2">
            Categories Setup
          </h1>
          <p className="text-slate-400 font-light text-base md:text-lg max-w-2xl leading-relaxed mt-2 text-left">
            Define your difficulty levels or question types with beautiful custom colors.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          tabIndex={0}
          aria-label="Create a new category"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={20} />
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-slate-800/60 shadow-xl backdrop-blur-sm min-h-[400px]">
          <div className="flex flex-col items-center justify-center text-center opacity-70">
            <div className="p-6 bg-blue-500/10 rounded-full mb-6">
              <FolderPlus size={64} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">No Categories Found</h2>
            <p className="text-slate-400 max-w-md">
              Start by creating categories like Easy, Medium, and Hard to organize your questions.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 w-full max-w-7xl">
          {categories.map((cat) => {
            const theme = getThemeVars(cat.color || "blue");
            
            return (
              <div
                key={cat.id}
                className={`group relative flex flex-col p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg transition-all duration-300 overflow-hidden bg-linear-to-br ${theme.theme}`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDelete(cat.id, e)}
                    onKeyDown={(e) => handleDeleteKeyDown(cat.id, e)}
                    tabIndex={0}
                    aria-label={`Delete ${cat.name}`}
                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 rounded-xl group-hover:scale-110 transition-transform duration-300 bg-slate-800/50 backdrop-blur-md ${theme.text}`}>
                    <Library size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-100 mb-1">{cat.name}</h3>
                    <p className={`text-sm ${theme.text}`}>{cat.pointsPerQuestion} Points per question</p>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400 bg-slate-800/80 px-3 py-1 rounded-md">
                    {cat._count.questions} Questions
                  </span>
                  
                  <Link
                    href={`/home/questions?category=${cat.id}`}
                    tabIndex={0}
                    aria-label={`Manage questions for ${cat.name}`}
                    className={`font-medium text-sm flex items-center gap-1 focus:outline-none focus:underline ${theme.text}`}
                  >
                    Manage Questions
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-lg"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-bold text-slate-100 mb-6 font-sans">New Category</h2>
            
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">Category Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Medium, Hard, Physics"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="pointsPerQuestion" className="text-sm font-medium text-slate-300">Points Per Question</label>
                <input
                  type="number"
                  id="pointsPerQuestion"
                  name="pointsPerQuestion"
                  required
                  min="1"
                  placeholder="10"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <label className="text-sm font-medium text-slate-300">Category Color</label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColor(color.id)}
                      className={`w-10 h-10 rounded-full transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-400 ${color.class} ${selectedColor === color.id ? 'ring-2 ring-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'opacity-70 hover:opacity-100'}`}
                      aria-label={`Select ${color.label} color`}
                    />
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg mt-2">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium py-3 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-center"
              >
                {isPending ? <Loader2 className="animate-spin" size={24} /> : "Save Category"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CategoriesPage;
