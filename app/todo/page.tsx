"use client";
import { useEffect, useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";

// 1. Define the Todo Interface to satisfy TypeScript
interface Todo {
  id: number;
  task: string;
  completed: boolean;
  userName: string;
}

export default function TodoPage() {
  const router = useRouter();

  // 2. Properly typed states
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>("");
  const [newTask, setNewTask] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedName = localStorage.getItem("name");
    if (!storedName) {
      router.push("/auth/login");
      return;
    }
    setUserName(storedName);
    fetchTodos();
  }, [router]);

  const fetchTodos = async () => {
    try {
      const response = await fetch("/api/todos");
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch {
      toast.error("Жагсаалтыг ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: newTask }),
      });

      if (response.ok) {
        const addedTodo = await response.json();
        setTodos((prev) => [addedTodo, ...prev]);
        setNewTask("");
        toast.success("Амжилттай нэмэгдлээ!");
      }
    } catch {
      toast.error("Нэмэхэд алдаа гарлаа");
    }
  };

  const toggleTodo = async (id: number, currentStatus: boolean) => {
    // Optimistic UI Update
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !currentStatus } : t)),
    );

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      if (!response.ok) throw new Error();
    } catch {
      toast.error("Төлөв өөрчлөхөд алдаа гарлаа");
      // Revert state on error
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: currentStatus } : t)),
      );
    }
  };

  const deleteTodo = async (id: number) => {
    const previousTodos = [...todos];
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      const response = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.info("Устгагдлаа");
    } catch {
      toast.error("Устгахад алдаа гарлаа");
      setTodos(previousTodos);
    }
  };

  const saveEdit = async (id: number) => {
    const task = editText.trim();
    if (!task) return;
    const previousTodos = [...todos];
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, task } : t)));
    setEditingId(null);

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      if (!response.ok) throw new Error();
    } catch {
      toast.error("Засахад алдаа гарлаа");
      setTodos(previousTodos);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddTask();
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Header */}
      <AppHeader
        onBack={() => router.back()}
        title={`${userName}-н жагсаалт`}
        subtitle="Өнөөдрийн төлөвлөгөө"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={15} className="text-white" />
          </span>
        }
      />

      <div className="p-4 sm:p-6">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Todo List Card */}
        <div className="bg-surface-elevated border border-border backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-6 space-y-4 stagger-in">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-4 p-5">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                  <Skeleton className="h-5 rounded-lg" style={{ width: `${50 + (i % 4) * 10}%` }} />
                </div>
              ))}
            </div>
          ) : todos.length > 0 ? (
            <div className="divide-y divide-white/5">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center justify-between gap-2 p-4 sm:p-5 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <button
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      className="text-emerald-400 hover:scale-110 transition-transform shrink-0"
                    >
                      {todo.completed ? (
                        <CheckCircle2
                          size={24}
                          className="fill-emerald-500/20"
                        />
                      ) : (
                        <Circle size={24} className="text-gray-600" />
                      )}
                    </button>
                    {editingId === todo.id ? (
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(todo.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 min-w-0 bg-surface border border-border rounded-xl px-3 py-1.5 text-base sm:text-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    ) : (
                      <span
                        className={`text-base sm:text-lg leading-snug transition-all duration-300 break-words ${todo.completed
                            ? "line-through text-gray-500 opacity-60"
                            : "text-on-surface"
                          }`}
                      >
                        {todo.task}
                      </span>
                    )}
                  </div>
                  {editingId === todo.id ? (
                    <div className="flex shrink-0">
                      <button
                        onClick={() => saveEdit(todo.id)}
                        disabled={!editText.trim()}
                        className="p-2 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-all"
                        aria-label="Хадгалах"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-gray-500 hover:text-on-surface transition-all"
                        aria-label="Болих"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(todo.id);
                          setEditText(todo.task);
                        }}
                        className="p-2 text-gray-500 hover:text-accent transition-all"
                        aria-label="Засах"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="p-2 text-gray-500 hover:text-red-500 transition-all"
                        aria-label="Устгах"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 sm:p-20 text-center">
              <div className="text-5xl mb-4 opacity-50">🍃</div>
              <p className="text-gray-500">Одоогоор хийх ажил алга.</p>
            </div>
          )}
        </div>

        {/* Add Task Input */}
        <div className="mt-6 sm:mt-8 flex gap-2 sm:gap-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Шинэ ажил нэмэх..."
            className="flex-1 min-w-0 bg-surface-elevated border border-border rounded-2xl px-4 sm:px-6 py-3.5 sm:py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all placeholder:text-gray-600 shadow-inner"
          />
          <button
            onClick={handleAddTask}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-8 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 shrink-0"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Нэмэх</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
