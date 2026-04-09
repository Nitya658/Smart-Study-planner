import "./App.css";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Timer,
  Brain,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Circle,
  Flame,
  TrendingUp,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
  Zap,
  BarChart3,
  X,
} from "lucide-react";

// ─── Utility ───────────────────────────────────────────────────────────────

function priorityScore(task) {
  // Score = urgency * 0.4 + importance * 0.4 + difficulty * 0.2
  // All inputs 1-5, higher = more critical
  const daysLeft = Math.max(
    1,
    Math.ceil((new Date(task.deadline) - Date.now()) / 86400000)
  );
  const urgency = Math.min(5, Math.round(10 / daysLeft));
  return (urgency * 0.4 + task.importance * 0.4 + task.difficulty * 0.2).toFixed(2);
}

function getPriorityLabel(score) {
  if (score >= 3.5) return { label: "Critical", color: "text-red-400", bg: "bg-red-500/15", icon: <Flame size={12} /> };
  if (score >= 2.5) return { label: "High", color: "text-orange-400", bg: "bg-orange-500/15", icon: <AlertTriangle size={12} /> };
  if (score >= 1.5) return { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/15", icon: <Zap size={12} /> };
  return { label: "Low", color: "text-emerald-400", bg: "bg-emerald-500/15", icon: <Star size={12} /> };
}

// SM-2 Spaced Repetition quality ratings
const SM2_QUALITY = [
  { label: "Blackout", value: 0, color: "bg-red-600" },
  { label: "Wrong", value: 1, color: "bg-red-400" },
  { label: "Hard", value: 2, color: "bg-orange-400" },
  { label: "Good", value: 3, color: "bg-yellow-400" },
  { label: "Easy", value: 4, color: "bg-emerald-400" },
  { label: "Perfect", value: 5, color: "bg-green-500" },
];

function sm2Next(card, quality) {
  let { easeFactor = 2.5, interval = 1, repetitions = 0 } = card;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  return { easeFactor, interval, repetitions, nextReview: nextReview.toISOString() };
}

function isDueToday(card) {
  if (!card.nextReview) return true;
  return new Date(card.nextReview) <= new Date();
}

const fmt = (s) => String(Math.floor(s)).padStart(2, "0");

// ─── Default Data ────────────────────────────────────────────────────────

const todayPlusDays = (d) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split("T")[0];
};

const DEFAULT_TASKS = [
  { id: 1, title: "Complete Calculus Assignment", subject: "Math", deadline: todayPlusDays(1), importance: 5, difficulty: 4, done: false },
  { id: 2, title: "Read Chapter 5 - Organic Chemistry", subject: "Chemistry", deadline: todayPlusDays(3), importance: 4, difficulty: 3, done: false },
  { id: 3, title: "Practice Essay Writing", subject: "English", deadline: todayPlusDays(7), importance: 3, difficulty: 2, done: false },
  { id: 4, title: "Revise World War II Timeline", subject: "History", deadline: todayPlusDays(2), importance: 4, difficulty: 2, done: true },
];

const DEFAULT_CARDS = [
  { id: 1, front: "What is Newton's Second Law?", back: "F = ma (Force equals mass times acceleration)", subject: "Physics", easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: null },
  { id: 2, front: "Define Photosynthesis", back: "The process by which green plants convert sunlight, water and CO₂ into glucose and oxygen", subject: "Biology", easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: todayPlusDays(-1) },
  { id: 3, front: "What is the Pythagorean Theorem?", back: "a² + b² = c², where c is the hypotenuse of a right triangle", subject: "Math", easeFactor: 2.8, interval: 6, repetitions: 2, nextReview: todayPlusDays(2) },
  { id: 4, front: "Mitochondria function?", back: "The powerhouse of the cell — produces ATP via cellular respiration", subject: "Biology", easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: null },
];

// ─── Meme Toast ──────────────────────────────────────────────────────────

const MEMES_TASK_DONE = ["/meme1.jpg", "/meme2.jpg", "/meme7.jpg"];
const MEMES_QUIT = ["/meme4.jpg"];

function MemeToast({ meme, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!meme) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 250);
    }, 1400);
    return () => clearTimeout(t);
  }, [meme]);

  if (!meme) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.8)",
      }}
    >
      <div style={{
        background: "rgba(0,0,0,0.55)",
        borderRadius: "20px",
        padding: "12px",
        boxShadow: "0 0 60px rgba(139,92,246,0.4), 0 20px 60px rgba(0,0,0,0.7)",
        border: "2px solid rgba(139,92,246,0.4)",
        maxWidth: "380px",
        width: "90%",
      }}>
        <img
          src={meme}
          alt="meme"
          style={{ width: "100%", borderRadius: "12px", display: "block" }}
        />
      </div>
    </div>
  );
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Particle Background (CSS-only, lightweight) ─────────────────────────

function ParticleBackground() {
  const dots = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: 12 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.4 + 0.1,
    }))
  ).current;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {dots.map((d) => (
        <div
          key={d.id}
          className="css-particle"
          style={{
            position: "absolute",
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            borderRadius: "50%",
            background: "#8b5cf6",
            opacity: d.opacity,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────

function Sidebar({ active, setActive, stats }) {
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "tasks", label: "Task Planner", icon: <ListChecks size={18} /> },
    { id: "pomodoro", label: "Pomodoro Timer", icon: <Timer size={18} /> },
    { id: "spaced", label: "Spaced Repetition", icon: <Brain size={18} /> },
  ];

  return (
    <aside className="w-full md:w-64 h-auto md:min-h-screen bg-slate-900 border-b md:border-b-0 md:border-r border-slate-700/50 flex flex-col z-20">
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">StudyMind</p>
            <p className="text-slate-400 text-xs">Smart Study Planner</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-none flex flex-row overflow-x-auto md:flex-col md:flex-1 p-3 md:p-4 gap-2 md:space-y-1">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 md:w-full ${active === item.id
              ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Stats */}
      <div className="hidden md:block p-4 border-t border-slate-700/50 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Today's Progress</p>
        <div className="bg-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Tasks done</span>
            <span className="text-violet-400 font-semibold">{stats.done}/{stats.total}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Pomodoros</span>
            <span className="text-orange-400 font-semibold">{stats.pomodoros} 🍅</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Cards reviewed</span>
            <span className="text-emerald-400 font-semibold">{stats.reviewed}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Dashboard View ──────────────────────────────────────────────────────

function DashboardView({ tasks, cards, pomodoroCount }) {
  const done = tasks.filter((t) => t.done).length;
  const overdue = tasks.filter(
    (t) => !t.done && new Date(t.deadline) < new Date()
  ).length;
  const dueCards = cards.filter(isDueToday).length;
  const sorted = [...tasks]
    .filter((t) => !t.done)
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 3);

  const statCards = [
    { label: "Tasks Completed", value: `${done}/${tasks.length}`, icon: <CheckCircle2 size={20} />, color: "from-violet-600 to-indigo-600", shadow: "shadow-violet-500/20" },
    { label: "Pomodoros Today", value: pomodoroCount, icon: <Timer size={20} />, color: "from-orange-500 to-red-500", shadow: "shadow-orange-500/20" },
    { label: "Cards Due", value: dueCards, icon: <Brain size={20} />, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20" },
    { label: "Overdue Tasks", value: overdue, icon: <AlertTriangle size={20} />, color: overdue > 0 ? "from-red-600 to-pink-600" : "from-slate-600 to-slate-700", shadow: "shadow-red-500/20" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Good {getGreeting()} 👋</h1>
        <p className="text-slate-400 mt-1 text-sm">Here's your study overview for today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.color} p-px shadow-lg ${s.shadow}`}>
            <div className="bg-slate-900 rounded-2xl p-4 h-full">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-md ${s.shadow}`}>
                <span className="text-white">{s.icon}</span>
              </div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-xs mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Priority Tasks */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Top Priority Tasks</h2>
          </div>
          {sorted.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">All caught up! 🎉</p>
          ) : (
            <div className="space-y-3">
              {sorted.map((t) => {
                const score = parseFloat(priorityScore(t));
                const { label, color, bg, icon } = getPriorityLabel(score);
                return (
                  <div key={t.id} className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/30">
                    <div className={`flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${color} ${bg} shrink-0`}>
                      {icon}<span className="ml-1">{label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm font-medium truncate">{t.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{t.subject} · Due {t.deadline}</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{score}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Due Cards */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Cards Due for Review</h2>
          </div>
          {dueCards === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No cards due today! 🧠</p>
          ) : (
            <div className="space-y-2">
              {cards.filter(isDueToday).slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/30">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{c.front}</p>
                    <p className="text-slate-500 text-xs">{c.subject} · Interval: {c.interval}d</p>
                  </div>
                </div>
              ))}
              {dueCards > 4 && (
                <p className="text-xs text-slate-500 text-center pt-1">+{dueCards - 4} more cards</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── Tasks View ──────────────────────────────────────────────────────────

function TasksView({ tasks, setTasks, showMeme }) {
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState("priority");
  const [form, setForm] = useState({
    title: "", subject: "", deadline: todayPlusDays(3), importance: 3, difficulty: 3,
  });

  const addTask = () => {
    if (!form.title.trim()) return;
    setTasks((prev) => [
      ...prev,
      { ...form, id: Date.now(), done: false, importance: +form.importance, difficulty: +form.difficulty },
    ]);
    setForm({ title: "", subject: "", deadline: todayPlusDays(3), importance: 3, difficulty: 3 });
    setShowForm(false);
    showMeme("addTask");
  };

  const toggle = (id) => {
    setTasks((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, done: !t.done } : t);
      const wasDone = prev.find((t) => t.id === id)?.done;
      if (!wasDone) {
        // Check if ALL tasks are now done
        const allDone = updated.every((t) => t.done);
        if (allDone) {
          showMeme("allDone");
        } else {
          showMeme("done");
        }
      }
      return updated;
    });
  };
  const remove = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const sorted = [...tasks].sort((a, b) => {
    if (sortBy === "priority") return priorityScore(b) - priorityScore(a);
    if (sortBy === "deadline") return new Date(a.deadline) - new Date(b.deadline);
    if (sortBy === "subject") return a.subject.localeCompare(b.subject);
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Planner</h1>
          <p className="text-slate-400 text-sm mt-1">Priority-scored with urgency × importance algorithm</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="priority">Sort: Priority</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="subject">Sort: Subject</option>
          </select>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Priority Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Priority Score:</span>
        {[
          { label: "Critical ≥3.5", color: "text-red-400" },
          { label: "High ≥2.5", color: "text-orange-400" },
          { label: "Medium ≥1.5", color: "text-yellow-400" },
          { label: "Low <1.5", color: "text-emerald-400" },
        ].map((p) => (
          <span key={p.label} className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
        ))}
        <span className="text-xs text-slate-600 ml-2">Formula: (urgency×0.4) + (importance×0.4) + (difficulty×0.2)</span>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <div className="bg-slate-800/80 border border-violet-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">New Task</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="col-span-1 sm:col-span-2 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <input
              type="date"
              className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Importance (1-5): <span className="text-violet-400 font-bold">{form.importance}</span></span>
              <input type="range" min="1" max="5" value={form.importance}
                onChange={(e) => setForm((f) => ({ ...f, importance: +e.target.value }))}
                className="w-full accent-violet-500" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Difficulty (1-5): <span className="text-orange-400 font-bold">{form.difficulty}</span></span>
              <input type="range" min="1" max="5" value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: +e.target.value }))}
                className="w-full accent-orange-500" />
            </label>
          </div>
          <button onClick={addTask} className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
            Add Task
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {sorted.map((task) => {
          const score = parseFloat(priorityScore(task));
          const { label, color, bg, icon } = getPriorityLabel(score);
          const isOverdue = !task.done && new Date(task.deadline) < new Date();
          return (
            <div
              key={task.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${task.done
                ? "bg-slate-800/30 border-slate-700/30 opacity-60"
                : "bg-slate-800/60 border-slate-700/50 hover:border-slate-600"
                }`}
            >
              <button onClick={() => toggle(task.id)} className="shrink-0 text-slate-500 hover:text-violet-400 transition-colors">
                {task.done ? <CheckCircle2 size={22} className="text-emerald-500" /> : <Circle size={22} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${task.done ? "line-through text-slate-500" : "text-slate-200"}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.subject && (
                    <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full">{task.subject}</span>
                  )}
                  <span className={`text-xs ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
                    {isOverdue ? "⚠ Overdue · " : "Due: "}{task.deadline}
                  </span>
                  <span className="text-xs text-slate-600">I:{task.importance} D:{task.difficulty}</span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color} ${bg} shrink-0`}>
                {icon}<span className="ml-1">{label}</span>
                <span className="ml-1 font-mono opacity-70">{score}</span>
              </div>
              <button onClick={() => remove(task.id)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <p className="text-center text-slate-500 py-12">No tasks yet. Add one to get started!</p>
        )}
      </div>
    </div>
  );
}

// ─── Pomodoro View ───────────────────────────────────────────────────────

function PomodoroView({ pomodoroCount, setPomodoroCount, showMeme }) {
  const MODES = {
    work: { label: "Focus", duration: 25 * 60, color: "from-orange-500 to-red-500" },
    short: { label: "Short Break", duration: 5 * 60, color: "from-emerald-500 to-teal-500" },
    long: { label: "Long Break", duration: 15 * 60, color: "from-violet-500 to-indigo-500" },
  };

  const [mode, setMode] = useState("work");
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [task, setTask] = useState("");
  const intervalRef = useRef(null);

  const currentMode = MODES[mode];
  const total = currentMode.duration;
  const progress = ((total - timeLeft) / total) * 100;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === "work") {
              setPomodoroCount((c) => c + 1);
              setSessions((s) => [
                { id: Date.now(), task: task || "Focus session", time: new Date().toLocaleTimeString(), duration: "25 min" },
                ...s,
              ]);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m) => {
    setRunning(false);
    setMode(m);
    setTimeLeft(MODES[m].duration);
  };

  const reset = () => { setRunning(false); setTimeLeft(MODES[mode].duration); };

  // Play/Pause handler: show meme on start or early quit
  const handlePlayPause = () => {
    if (!running && timeLeft === MODES[mode].duration) {
      // Starting a fresh timer
      showMeme("timerStart");
    } else if (running && timeLeft < MODES[mode].duration && timeLeft > 0) {
      showMeme("quit");
    }
    setRunning((r) => !r);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pomodoro Timer</h1>
        <p className="text-slate-400 text-sm mt-1">Focus in sprints. Rest strategically.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center">
          {/* Mode selector */}
          <div className="flex gap-2 mb-8 bg-slate-900/60 p-1 rounded-xl">
            {Object.entries(MODES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => switchMode(key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === key ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                {val.label}
              </button>
            ))}
          </div>

          {/* SVG Circle */}
          <div className="relative w-56 h-56">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle
                cx="100" cy="100" r={radius} fill="none"
                stroke="url(#grad)" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDash}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={mode === "work" ? "#f97316" : mode === "short" ? "#10b981" : "#8b5cf6"} />
                  <stop offset="100%" stopColor={mode === "work" ? "#ef4444" : mode === "short" ? "#14b8a6" : "#6366f1"} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-white font-mono tabular-nums">
                {fmt(timeLeft / 60)}:{fmt(timeLeft % 60)}
              </span>
              <span className="text-slate-400 text-sm mt-1">{currentMode.label}</span>
              {pomodoroCount > 0 && (
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: Math.min(pomodoroCount, 8) }).map((_, i) => (
                    <span key={i} className="text-base">🍅</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Task label */}
          <input
            className="mt-6 w-full text-center bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500"
            placeholder="What are you working on?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />

          {/* Controls */}
          <div className="flex items-center gap-4 mt-5">
            <button onClick={reset} className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <RotateCcw size={18} />
            </button>
            <button
              onClick={handlePlayPause}
              className={`px-10 py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${currentMode.color} shadow-lg text-sm transition-all hover:scale-105 active:scale-95`}
            >
              {running ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={() => switchMode(mode === "work" ? "short" : "work")} className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* Session Log */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-orange-400" />
              <h2 className="text-sm font-semibold text-white">Session Log</h2>
            </div>
            <span className="text-xs text-slate-500">{pomodoroCount} pomodoros today</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Focus Time", value: `${pomodoroCount * 25}m`, icon: <Clock size={14} /> },
              { label: "Sessions", value: pomodoroCount, icon: <TrendingUp size={14} /> },
              { label: "Streak", value: "🔥", icon: null },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900/60 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600">
              <Timer size={32} className="mb-2" />
              <p className="text-sm">Complete a session to see your log</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/30">
                  <span className="text-lg">🍅</span>
                  <div className="flex-1">
                    <p className="text-slate-200 text-sm font-medium">{s.task}</p>
                    <p className="text-slate-500 text-xs">{s.time} · {s.duration}</p>
                  </div>
                  <span className="text-emerald-400 text-xs font-semibold">Done</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Spaced Repetition View ──────────────────────────────────────────────

function SpacedView({ cards, setCards, reviewed, setReviewed }) {
  const [showForm, setShowForm] = useState(false);
  const [flipped, setFlipped] = useState({});
  const [form, setForm] = useState({ front: "", back: "", subject: "" });
  const [tab, setTab] = useState("due");

  const dueCards = cards.filter(isDueToday);
  const upcomingCards = cards.filter((c) => !isDueToday(c));

  const handleReview = (cardId, quality) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        return { ...c, ...sm2Next(c, quality) };
      })
    );
    setFlipped((f) => ({ ...f, [cardId]: false }));
    setReviewed((r) => r + 1);
  };

  const addCard = () => {
    if (!form.front.trim() || !form.back.trim()) return;
    setCards((prev) => [
      ...prev,
      { ...form, id: Date.now(), easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: null },
    ]);
    setForm({ front: "", back: "", subject: "" });
    setShowForm(false);
  };

  const removeCard = (id) => setCards((prev) => prev.filter((c) => c.id !== id));

  const renderCard = (card, showActions) => (
    <div key={card.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div
        className="p-5 cursor-pointer select-none"
        onClick={() => setFlipped((f) => ({ ...f, [card.id]: !f[card.id] }))}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {card.subject && (
                <span className="text-xs px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full border border-violet-500/20">
                  {card.subject}
                </span>
              )}
              <span className="text-xs text-slate-500">#{card.repetitions} reviews · EF {card.easeFactor?.toFixed(2)}</span>
            </div>
            <p className="text-slate-200 font-medium text-sm">{card.front}</p>
            {flipped[card.id] && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-emerald-300 text-sm">{card.back}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {flipped[card.id] ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            <button onClick={(e) => { e.stopPropagation(); removeCard(card.id); }} className="text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {showActions && flipped[card.id] && (
        <div className="px-5 pb-4">
          <p className="text-xs text-slate-500 mb-2 font-medium">How well did you recall?</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SM2_QUALITY.map((q) => (
              <button
                key={q.value}
                onClick={() => handleReview(card.id, q.value)}
                className={`${q.color} text-white text-xs font-medium py-1.5 rounded-lg hover:opacity-90 transition-opacity`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Next review in {sm2Next(card, 3).interval}d (if Good)
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Spaced Repetition</h1>
          <p className="text-slate-400 text-sm mt-1">SM-2 algorithm · Review cards at optimal intervals</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Card
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Due Today", value: dueCards.length, color: "text-red-400" },
          { label: "Total Cards", value: cards.length, color: "text-violet-400" },
          { label: "Reviewed Today", value: reviewed, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Card Form */}
      {showForm && (
        <div className="bg-slate-800/80 border border-violet-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">New Flashcard</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
          </div>
          <textarea
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
            rows={2} placeholder="Front (question)"
            value={form.front} onChange={(e) => setForm((f) => ({ ...f, front: e.target.value }))}
          />
          <textarea
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
            rows={2} placeholder="Back (answer)"
            value={form.back} onChange={(e) => setForm((f) => ({ ...f, back: e.target.value }))}
          />
          <input
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
            placeholder="Subject (optional)"
            value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
          <button onClick={addCard} className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
            Add Card
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl w-fit">
        {[
          { key: "due", label: `Due (${dueCards.length})` },
          { key: "all", label: `All (${cards.length})` },
          { key: "upcoming", label: `Upcoming (${upcomingCards.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.key ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {tab === "due" && (
          dueCards.length === 0
            ? <p className="text-center text-slate-500 py-12">All caught up on reviews! 🎉</p>
            : dueCards.map((c) => renderCard(c, true))
        )}
        {tab === "all" && (
          cards.length === 0
            ? <p className="text-center text-slate-500 py-12">No cards yet.</p>
            : cards.map((c) => renderCard(c, isDueToday(c)))
        )}
        {tab === "upcoming" && (
          upcomingCards.length === 0
            ? <p className="text-center text-slate-500 py-12">No upcoming cards.</p>
            : upcomingCards.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl">
                <div className="flex-1">
                  <p className="text-slate-300 text-sm font-medium">{c.front}</p>
                  {c.subject && <span className="text-xs text-slate-500">{c.subject}</span>}
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs">Due</p>
                  <p className="text-violet-400 text-sm font-semibold">{c.nextReview ? new Date(c.nextReview).toLocaleDateString() : "New"}</p>
                </div>
                <button onClick={() => removeCard(c.id)} className="text-slate-600 hover:text-red-400 transition-colors ml-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── Welcome Carousel Splash ─────────────────────────────────────────────

const WELCOME_SLIDES = [
  {
    image: "/meme3.jpg",
    caption: "Aa gya badmosh 😎",
    subtitle: "Ab hogi badmashii... padhai ki! 📚",
  },
];

const FLOATING_EMOJIS = ["📚", "🧠", "🔥", "⚡", "🎯", "💡", "🍅", "✨", "🚀", "💪"];

function WelcomeCarousel({ onEnter }) {
  const [phase, setPhase] = useState("entering"); // entering -> visible -> exiting -> gone
  const [currentSlide, setCurrentSlide] = useState(0);
  const [emojis, setEmojis] = useState([]);

  // Generate floating emojis
  useEffect(() => {
    const generated = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      emoji: FLOATING_EMOJIS[i % FLOATING_EMOJIS.length],
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 6,
      size: 16 + Math.random() * 20,
    }));
    setEmojis(generated);
  }, []);

  // Enter animation
  useEffect(() => {
    const t = setTimeout(() => setPhase("visible"), 100);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    setPhase("exiting");
    setTimeout(() => onEnter(), 700);
  };

  return (
    <div
      className="welcome-carousel-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.25) 0%, rgba(15,23,42,0.98) 70%)",
        backdropFilter: "blur(4px)",
        transition: "opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)",
        opacity: phase === "exiting" ? 0 : phase === "visible" ? 1 : 0,
        pointerEvents: phase === "exiting" ? "none" : "auto",
      }}
    >
      {/* Floating emojis */}
      {emojis.map((e) => (
        <span
          key={e.id}
          className="welcome-floating-emoji"
          style={{
            position: "absolute",
            left: `${e.left}%`,
            bottom: "-40px",
            fontSize: `${e.size}px`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            opacity: 0.5,
            pointerEvents: "none",
          }}
        >
          {e.emoji}
        </span>
      ))}

      {/* Glowing ring behind card */}
      <div
        className="welcome-glow-ring"
        style={{
          position: "absolute",
          width: "480px",
          height: "480px",
          borderRadius: "50%",
          background: "conic-gradient(from 0deg, #7c3aed, #6366f1, #8b5cf6, #a78bfa, #7c3aed)",
          filter: "blur(60px)",
          opacity: phase === "visible" ? 0.3 : 0,
          transition: "opacity 1.2s ease",
          animation: "welcome-glow-spin 8s linear infinite",
        }}
      />

      {/* Card container */}
      <div
        style={{
          position: "relative",
          maxWidth: "420px",
          width: "92%",
          transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: phase === "visible"
            ? "scale(1) translateY(0)"
            : phase === "entering"
              ? "scale(0.6) translateY(60px)"
              : "scale(0.8) translateY(-80px)",
          opacity: phase === "visible" ? 1 : 0,
        }}
      >
        {/* Outer glow border */}
        <div
          className="welcome-card-border"
          style={{
            borderRadius: "24px",
            padding: "2px",
            background: "linear-gradient(135deg, #7c3aed, #6366f1, #8b5cf6, #60a5fa, #7c3aed)",
            backgroundSize: "300% 300%",
            animation: "welcome-border-shimmer 4s ease-in-out infinite",
            boxShadow: "0 0 80px rgba(139,92,246,0.4), 0 0 160px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))",
              borderRadius: "22px",
              overflow: "hidden",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Top badge */}
            <div
              style={{
                textAlign: "center",
                padding: "16px 20px 8px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 14px",
                  borderRadius: "20px",
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#a78bfa",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                ✨ StudyMind welcomes you
              </span>
            </div>

            {/* Image carousel area */}
            <div style={{ padding: "12px 20px" }}>
              <div
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                {/* Carousel dots on image */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "6px",
                    zIndex: 2,
                  }}
                >
                  {WELCOME_SLIDES.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i === currentSlide ? "20px" : "6px",
                        height: "6px",
                        borderRadius: "3px",
                        background: i === currentSlide ? "#a78bfa" : "rgba(255,255,255,0.4)",
                        transition: "all 0.3s ease",
                        boxShadow: i === currentSlide ? "0 0 8px rgba(139,92,246,0.6)" : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Image with subtle zoom animation */}
                <img
                  src={WELCOME_SLIDES[currentSlide].image}
                  alt="Welcome meme"
                  style={{
                    width: "100%",
                    display: "block",
                    animation: "welcome-img-breathe 4s ease-in-out infinite",
                  }}
                />

                {/* Subtle gradient overlay at bottom */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "60px",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.4))",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            {/* Caption area */}
            <div style={{ textAlign: "center", padding: "4px 20px 8px" }}>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#fff",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {WELCOME_SLIDES[currentSlide].caption}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  margin: "6px 0 0",
                  fontWeight: 500,
                }}
              >
                {WELCOME_SLIDES[currentSlide].subtitle}
              </p>
            </div>

            {/* Enter button */}
            <div style={{ padding: "12px 20px 20px", textAlign: "center" }}>
              <button
                onClick={handleEnter}
                className="welcome-enter-btn"
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: "14px",
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 20px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px) scale(1.02)";
                  e.target.style.boxShadow = "0 8px 30px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0) scale(1)";
                  e.target.style.boxShadow = "0 4px 20px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)";
                }}
              >
                🚀 Let's Study, Badmosh!
              </button>
              <p style={{
                fontSize: "11px",
                color: "#475569",
                marginTop: "10px",
                fontWeight: 500,
              }}>
                Press Enter or click to begin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [activeMeme, setActiveMeme] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const showMeme = useCallback((type) => {
    let src;
    if (type === "allDone") src = "/meme5.jpg";
    else if (type === "timerStart") src = "/meme6.jpg";
    else if (type === "addTask") src = "/meme8.jpg";
    else if (type === "done") src = pickRandom(MEMES_TASK_DONE);
    else src = pickRandom(MEMES_QUIT);
    setActiveMeme(src);
  }, []);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [reviewed, setReviewed] = useState(0);

  // Allow Enter key to dismiss welcome
  useEffect(() => {
    if (!showWelcome) return;
    const handleKey = (e) => {
      if (e.key === "Enter") setShowWelcome(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showWelcome]);

  const stats = {
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
    pomodoros: pomodoroCount,
    reviewed,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row" style={{ fontFamily: "'Inter', system-ui, sans-serif", position: "relative" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Particle canvas */}
      <ParticleBackground />

      {/* Aurora blobs */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Welcome Carousel Splash */}
      {showWelcome && <WelcomeCarousel onEnter={() => setShowWelcome(false)} />}

      {/* Meme Toast */}
      <MemeToast meme={activeMeme} onDone={() => setActiveMeme(null)} />

      {/* Sidebar — sits above particles */}
      <div className="sticky top-0 z-20 md:relative" style={{ zIndex: 20 }}>
        <Sidebar active={active} setActive={setActive} stats={stats} />
      </div>

      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full md:max-h-screen" style={{ position: "relative", zIndex: 10 }}>
        {active === "dashboard" && <DashboardView tasks={tasks} cards={cards} pomodoroCount={pomodoroCount} />}
        {active === "tasks" && <TasksView tasks={tasks} setTasks={setTasks} showMeme={showMeme} />}
        {active === "pomodoro" && <PomodoroView pomodoroCount={pomodoroCount} setPomodoroCount={setPomodoroCount} showMeme={showMeme} />}
        {active === "spaced" && <SpacedView cards={cards} setCards={setCards} reviewed={reviewed} setReviewed={setReviewed} />}
      </main>
    </div>
  );
}
