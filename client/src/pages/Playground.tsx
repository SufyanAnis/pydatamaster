import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CodeMirror, { keymap, Prec } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { AlertTriangle, Bell, BookOpen, Bot, Check, ChevronDown, Clock, Code2, Cpu, Download, Eraser, Home as HomeIcon, Image as ImageIcon, Loader2, Play, RefreshCw, RotateCcw, Share2, Sparkles, Terminal, Zap } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { errorMessage } from "../lib/api";
import { cn, copyToClipboard, downloadText } from "../lib/utils";
import { Button, LinkButton, Pill } from "../components/ui";

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<any>;
  }
}

/* ------------------------------------------------------------------ Pyodide runtime (module-level singleton) */
const PYODIDE_VERSION = "0.28.3";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const STORAGE_KEY = "pdm_playground_code";
const MAX_OUTPUT_CHARS = 200_000;

const SETUP_SNIPPET = `import os, warnings
os.environ["MPLBACKEND"] = "AGG"
warnings.filterwarnings("ignore", message=".*non-interactive.*")
`;

const PRE_RUN_MPL_SNIPPET = `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as _plt
_plt.close("all")
`;

const COLLECT_FIGURES_SNIPPET = `import base64, io, sys
_figs = []
if "matplotlib" in sys.modules:
    import matplotlib.pyplot as plt
    for _n in plt.get_fignums():
        _buf = io.BytesIO(); plt.figure(_n).savefig(_buf, format="png", dpi=110, bbox_inches="tight"); _figs.append(base64.b64encode(_buf.getvalue()).decode())
    plt.close("all")
_figs
`;

let pyodideInstance: any = null;
let pyodidePromise: Promise<any> | null = null;
let scriptPromise: Promise<void> | null = null;
let pythonVersion = "";
let runtimeStage = "";
const stageListeners = new Set<(stage: string) => void>();
let stdoutSink: ((text: string) => void) | null = null;
let stderrSink: ((text: string) => void) | null = null;

function setStage(stage: string) {
  runtimeStage = stage;
  stageListeners.forEach((l) => l(stage));
}

function loadPyodideScript(): Promise<void> {
  if (typeof window.loadPyodide === "function") return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_BASE}pyodide.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      scriptPromise = null;
      reject(new Error("Could not download the Python runtime from the CDN. Check your connection (or an ad/script blocker) and try again."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function getPyodide(): Promise<any> {
  if (pyodideInstance) return Promise.resolve(pyodideInstance);
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    try {
      setStage("Downloading Python runtime (~10 MB)...");
      await loadPyodideScript();
      if (typeof window.loadPyodide !== "function") throw new Error("The Pyodide loader did not initialise correctly.");
      setStage("Starting interpreter...");
      const py = await window.loadPyodide({ indexURL: PYODIDE_BASE });
      py.setStdout({ batched: (line: string) => stdoutSink?.(line + "\n") });
      py.setStderr({ batched: (line: string) => stderrSink?.(line + "\n") });
      await py.runPythonAsync(SETUP_SNIPPET);
      try {
        pythonVersion = String(py.runPython("import sys; '.'.join(str(v) for v in sys.version_info[:3])"));
      } catch {
        pythonVersion = "3";
      }
      pyodideInstance = py;
      setStage("Ready");
      return py;
    } catch (err) {
      pyodidePromise = null;
      setStage("");
      throw err;
    }
  })();
  return pyodidePromise;
}

/* ------------------------------------------------------------------ Helpers */
const STDLIB = new Set(["os", "sys", "math", "random", "json", "time", "datetime", "collections", "itertools", "functools", "re", "io", "base64", "string", "statistics", "typing", "csv", "pathlib", "decimal", "fractions", "operator", "copy", "textwrap", "pprint", "heapq", "bisect", "enum", "dataclasses", "abc", "warnings", "asyncio", "uuid", "hashlib", "struct", "array", "queue", "logging", "unittest", "doctest", "timeit", "traceback", "inspect", "contextlib", "types", "numbers", "cmath", "secrets", "html", "urllib", "http", "email", "zlib", "gzip", "pickle", "shelve", "sqlite3", "calendar", "locale", "gettext", "argparse", "getopt", "glob", "fnmatch", "shutil", "tempfile", "platform", "signal", "threading", "multiprocessing", "subprocess", "socket", "select", "ssl", "js", "pyodide", "micropip", "builtins", "__future__"]);
const PACKAGE_NAMES: Record<string, string> = { sklearn: "scikit-learn", PIL: "pillow", cv2: "opencv-python", bs4: "beautifulsoup4", yaml: "pyyaml", skimage: "scikit-image" };

function detectImports(code: string): string[] {
  const found = new Set<string>();
  const re = /^[ \t]*(?:import[ \t]+([\w.]+(?:[ \t]+as[ \t]+\w+)?(?:[ \t]*,[ \t]*[\w.]+(?:[ \t]+as[ \t]+\w+)?)*)|from[ \t]+([\w.]+)[ \t]+import)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const names = m[1] ? m[1].split(",") : [m[2]];
    for (const raw of names) {
      const root = raw.trim().split(/\s+as\s+/)[0].split(".")[0];
      if (root && !STDLIB.has(root)) found.add(PACKAGE_NAMES[root] ?? root);
    }
  }
  return [...found];
}

function cleanTraceback(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lines = msg.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s+File "\/lib\/python[^"]*_pyodide/.test(line)) {
      if (i + 1 < lines.length && /^\s{4,}\S/.test(lines[i + 1]) && !/^\s+File "/.test(lines[i + 1])) i++;
      continue;
    }
    out.push(line.replace(/File "<exec>"/g, 'File "playground.py"'));
  }
  return out.join("\n").trim();
}

function proxyToStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value.toJs === "function") {
    let arr: unknown;
    try {
      arr = value.toJs();
    } finally {
      try {
        value.destroy();
      } catch {
        /* ignore */
      }
    }
    return Array.isArray(arr) ? arr.map(String) : [];
  }
  return [];
}

function formatResult(value: any): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "object" || typeof value === "function") {
    let text = "";
    try {
      text = typeof value.toString === "function" ? String(value.toString()) : String(value);
    } catch {
      text = "[object]";
    }
    if (typeof value.destroy === "function") {
      try {
        value.destroy();
      } catch {
        /* ignore */
      }
    }
    return text;
  }
  return String(value);
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/* ------------------------------------------------------------------ Examples */
const DEFAULT_CODE = `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# 1. Build a small dataset with NumPy
rng = np.random.default_rng(42)
days = np.arange(1, 11)
revenue = np.round(100 + days * 12 + rng.normal(0, 8, days.size), 1)

# 2. Put it into a Pandas DataFrame
df = pd.DataFrame({"day": days, "revenue": revenue})
df["rolling_avg"] = df["revenue"].rolling(3).mean().round(1)
print(df)
print("\\nTotal revenue:", df["revenue"].sum())

# 3. Plot it with Matplotlib
plt.figure(figsize=(7, 4))
plt.plot(df["day"], df["revenue"], marker="o", label="Revenue")
plt.plot(df["day"], df["rolling_avg"], linestyle="--", label="3-day average")
plt.title("Daily revenue")
plt.xlabel("Day")
plt.ylabel("Revenue ($)")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
`;

interface Example {
  id: string;
  title: string;
  code: string;
}

const BUILTIN_EXAMPLES: Example[] = [
  {
    id: "hello-numpy",
    title: "Hello NumPy",
    code: `import numpy as np

a = np.array([1, 2, 3, 4, 5])
b = np.linspace(0, 1, 5)

print("a      :", a)
print("b      :", b.round(2))
print("a * 2  :", a * 2)
print("a + b  :", (a + b).round(2))
print("mean   :", a.mean(), " std:", a.std().round(3))

matrix = np.arange(1, 10).reshape(3, 3)
print("\\nmatrix:\\n", matrix)
print("transpose:\\n", matrix.T)
print("row sums:", matrix.sum(axis=1))
`,
  },
  {
    id: "pandas-dataframe",
    title: "Pandas DataFrame",
    code: `import pandas as pd

data = {
    "city": ["Karachi", "Lahore", "Islamabad", "Karachi", "Lahore", "Islamabad"],
    "quarter": ["Q1", "Q1", "Q1", "Q2", "Q2", "Q2"],
    "sales": [120, 95, 60, 150, 110, 75],
}
df = pd.DataFrame(data)
print(df)

print("\\nTotal sales by city:")
print(df.groupby("city")["sales"].sum().sort_values(ascending=False))

print("\\nPivot table:")
print(df.pivot(index="city", columns="quarter", values="sales"))

df["growth"] = df.groupby("city")["sales"].pct_change().round(2)
df
`,
  },
  {
    id: "matplotlib-plot",
    title: "Matplotlib plot",
    code: `import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 200)

fig, axes = plt.subplots(1, 2, figsize=(9, 3.5))
axes[0].plot(x, np.sin(x), label="sin(x)")
axes[0].plot(x, np.cos(x), label="cos(x)", linestyle="--")
axes[0].set_title("Trigonometric functions")
axes[0].legend()
axes[0].grid(alpha=0.3)

categories = ["NumPy", "Pandas", "Matplotlib", "Scikit-Learn"]
values = [85, 92, 78, 66]
axes[1].bar(categories, values, color=["#2563eb", "#4f46e5", "#10b981", "#f59e0b"])
axes[1].set_title("Skill progress (%)")
axes[1].set_ylim(0, 100)

plt.tight_layout()
plt.show()
`,
  },
  {
    id: "sklearn-regression",
    title: "Scikit-Learn regression",
    code: `import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

# Synthetic data: house size (sqm) vs price (k$)
rng = np.random.default_rng(7)
size = rng.uniform(40, 200, 80)
price = 30 + size * 1.8 + rng.normal(0, 25, size.size)

X = size.reshape(-1, 1)
X_train, X_test, y_train, y_test = train_test_split(X, price, test_size=0.25, random_state=0)

model = LinearRegression().fit(X_train, y_train)
pred = model.predict(X_test)

print(f"Coefficient : {model.coef_[0]:.3f}")
print(f"Intercept   : {model.intercept_:.2f}")
print(f"R^2 on test : {r2_score(y_test, pred):.3f}")

plt.figure(figsize=(6, 4))
plt.scatter(X_train, y_train, alpha=0.6, label="train")
plt.scatter(X_test, y_test, alpha=0.9, label="test")
line = np.linspace(40, 200, 50).reshape(-1, 1)
plt.plot(line, model.predict(line), color="red", label="fit")
plt.xlabel("Size (sqm)")
plt.ylabel("Price (k$)")
plt.legend()
plt.show()
`,
  },
];

const PACKAGES = ["NumPy", "Pandas", "Matplotlib", "Scikit-Learn", "SciPy"];

type RuntimeStatus = "idle" | "loading" | "ready" | "failed";
type RunState = "idle" | "running" | "done" | "error";

function readInitialCode(): string {
  try {
    const shared = new URLSearchParams(window.location.search).get("code");
    if (shared !== null && shared.trim()) return shared;
  } catch {
    /* ignore */
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_CODE;
}

/* ------------------------------------------------------------------ Coming soon */
function ComingSoon() {
  return (
    <div className="max-w-2xl mx-auto py-10 animate-fade-in-up">
      <div className="card p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative">
          <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <Code2 size={34} />
          </div>
          <span className="eyebrow mb-2 block">Interactive</span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">Python Playground</h1>
          <Pill color="amber" className="mb-6">
            <Sparkles size={11} /> Coming soon
          </Pill>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg mx-auto mb-8">Our high-performance Python IDE with built-in Pandas, NumPy, and Matplotlib support is currently being fine-tuned for a world-class experience.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LinkButton to="/notify?source=playground">
              <Bell size={16} /> Notify me
            </LinkButton>
            <LinkButton to="/" variant="secondary">
              <HomeIcon size={16} /> Return home
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Page */
export default function Playground() {
  usePageTitle("Python Playground");
  const { settings, modules, setTutorContext, setTutorOpen } = useSite();
  const { user, progress, recordPlaygroundRun } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [code, setCode] = useState<string>(readInitialCode);
  const codeRef = useRef(code);
  codeRef.current = code;

  const [runtime, setRuntime] = useState<{ status: RuntimeStatus; stage: string; error: string | null }>(() => ({
    status: pyodideInstance ? "ready" : "idle",
    stage: pyodideInstance ? "Ready" : runtimeStage,
    error: null,
  }));
  const [runState, setRunState] = useState<RunState>("idle");
  const [runLabel, setRunLabel] = useState("");
  const [stdout, setStdout] = useState("");
  const [stderrText, setStderrText] = useState("");
  const [error, setError] = useState("");
  const [figures, setFigures] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const runningRef = useRef(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const xpBeforeRun = useRef<number | null>(null);

  const playgroundEnabled = settings?.features.playground !== false;

  /* ---- stdout / stderr sinks */
  useEffect(() => {
    stdoutSink = (t) => setStdout((s) => (s.length > MAX_OUTPUT_CHARS ? s : s + t));
    stderrSink = (t) => setStderrText((s) => (s.length > MAX_OUTPUT_CHARS ? s : s + t));
    return () => {
      stdoutSink = null;
      stderrSink = null;
    };
  }, []);

  /* ---- runtime boot */
  const bootRuntime = useCallback(async () => {
    setRuntime({ status: "loading", stage: runtimeStage || "Downloading Python runtime (~10 MB)...", error: null });
    try {
      await getPyodide();
      setRuntime({ status: "ready", stage: "Ready", error: null });
    } catch (err) {
      setRuntime({ status: "failed", stage: "", error: errorMessage(err, "Failed to load the Python runtime.") });
    }
  }, []);

  useEffect(() => {
    if (!playgroundEnabled) return;
    const listener = (stage: string) => setRuntime((r) => (r.status === "loading" ? { ...r, stage } : r));
    stageListeners.add(listener);
    if (!pyodideInstance) void bootRuntime();
    return () => {
      stageListeners.delete(listener);
    };
  }, [bootRuntime, playgroundEnabled]);

  /* ---- ?code= query param (also handles in-page navigation to /playground?code=...) */
  useEffect(() => {
    const sharedCode = searchParams.get("code");
    if (sharedCode !== null) {
      if (sharedCode.trim()) setCode(sharedCode);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /* ---- persist + tutor context (debounced) */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* ignore */
      }
      setTutorContext({ code });
    }, 500);
    return () => window.clearTimeout(t);
  }, [code, setTutorContext]);

  useEffect(() => () => setTutorContext({ code: undefined }), [setTutorContext]);

  /* ---- examples menu: close on outside click / escape */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* ---- XP toast when a run earns the daily bonus */
  useEffect(() => {
    if (xpBeforeRun.current === null || !progress) return;
    if (progress.xp > xpBeforeRun.current) {
      toast.xp(progress.xp - xpBeforeRun.current, "Daily playground bonus");
      xpBeforeRun.current = null;
    }
  }, [progress, toast]);

  /* ---- run */
  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunState("running");
    setRunLabel("Preparing...");
    setStdout("");
    setStderrText("");
    setError("");
    setFigures([]);
    setResult(null);
    setElapsed(null);
    const started = performance.now();
    let success = false;
    try {
      const source = codeRef.current;
      const py = await getPyodide();
      setRuntime((r) => (r.status === "ready" ? r : { status: "ready", stage: "Ready", error: null }));
      const pkgs = detectImports(source);
      setRunLabel(pkgs.length ? `Loading packages: ${pkgs.join(", ")}...` : "Running...");
      try {
        // Silence Pyodide's "Loading numpy..." progress lines so they don't pollute the program's stdout.
        await py.loadPackagesFromImports(source, { messageCallback: () => {}, errorCallback: (msg: string) => console.warn(msg) });
      } catch {
        /* unknown packages fall through to the Python ModuleNotFoundError */
      }
      if (/matplotlib/.test(source)) {
        try {
          await py.runPythonAsync(PRE_RUN_MPL_SNIPPET);
        } catch {
          /* ignore */
        }
      }
      setRunLabel("Running...");
      let value: any;
      try {
        value = await py.runPythonAsync(source);
        success = true;
      } catch (err) {
        setError(cleanTraceback(err));
      }
      try {
        const proxy = await py.runPythonAsync(COLLECT_FIGURES_SNIPPET);
        const list = proxyToStringArray(proxy);
        if (list.length) setFigures(list);
      } catch {
        /* figure collection is best-effort */
      }
      if (success) {
        const text = formatResult(value);
        if (text !== null && text !== "") setResult(text);
      }
    } catch (err) {
      setError(errorMessage(err, "The Python runtime is not available."));
      setRuntime((r) => (r.status === "ready" ? r : { status: "failed", stage: "", error: errorMessage(err, "Failed to load the Python runtime.") }));
    } finally {
      setElapsed(performance.now() - started);
      setRunLabel("");
      setRunState(success ? "done" : "error");
      runningRef.current = false;
    }
    if (success && user) {
      xpBeforeRun.current = progress?.xp ?? null;
      void recordPlaygroundRun();
    }
  }, [user, progress?.xp, recordPlaygroundRun]);

  const runRef = useRef(run);
  runRef.current = run;

  const extensions = useMemo(
    () => [
      python(),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              void runRef.current();
              return true;
            },
          },
        ]),
      ),
    ],
    [],
  );

  const onWrapperKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.defaultPrevented) {
      e.preventDefault();
      void run();
    }
  };

  /* ---- toolbar actions */
  const resetCode = () => {
    setCode(DEFAULT_CODE);
    toast.info("Editor reset", "The default snippet has been restored.");
  };
  const clearOutput = () => {
    setStdout("");
    setStderrText("");
    setError("");
    setFigures([]);
    setResult(null);
    setElapsed(null);
    setRunState("idle");
  };
  const loadExample = (ex: Example) => {
    setCode(ex.code);
    setMenuOpen(false);
    clearOutput();
  };
  const share = async () => {
    const url = `${window.location.origin}/playground?code=${encodeURIComponent(code)}`;
    if (await copyToClipboard(url)) {
      setShared(true);
      window.setTimeout(() => setShared(false), 1500);
      toast.success("Link copied", "Anyone with the link can open this code in the playground.");
    } else {
      toast.error("Could not copy", "Your browser blocked clipboard access.");
    }
  };
  const askTutor = () => {
    setTutorContext({ code });
    setTutorOpen(true);
  };
  const download = () => downloadText("playground.py", code, "text/x-python");

  if (!playgroundEnabled) return <ComingSoon />;

  const isRunning = runState === "running";
  const runtimeLoading = runtime.status === "loading";
  const statusPill: { label: string; cls: string } =
    isRunning && runtimeLoading
      ? { label: "Loading runtime", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" }
      : isRunning
        ? { label: "Running", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" }
        : runState === "done"
          ? { label: "Done", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" }
          : runState === "error"
            ? { label: "Error", cls: "bg-red-500/15 text-red-300 border-red-500/30" }
            : runtimeLoading
              ? { label: "Loading runtime", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" }
              : { label: "Idle", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" };

  const hasOutput = stdout || stderrText || error || figures.length > 0 || result !== null;
  const toolBtn = "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
  const lessonExamples = modules.map((m) => ({ module: m, lessons: m.lessons.filter((l) => l.codeExample && l.codeExample.trim()) })).filter((g) => g.lessons.length > 0);

  return (
    <div className="pb-10 animate-fade-in-up">
      {/* Header */}
      <header className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="max-w-2xl">
          <span className="eyebrow mb-2 block">Interactive</span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.05] mb-3">Python Playground</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Write and run real Python with the full data science stack, right in your browser. Nothing to install, nothing leaves your machine.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {PACKAGES.map((p) => (
            <Pill key={p} color="slate">
              <Check size={10} className="text-emerald-500" /> {p}
            </Pill>
          ))}
          {!user && (
            <Pill color="amber">
              <Zap size={10} />{" "}
              <Link to="/signup" className="hover:underline">
                Log in to earn XP
              </Link>
            </Pill>
          )}
        </div>
      </header>

      {/* IDE */}
      <div className="rounded-[2rem] bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden" onKeyDown={onWrapperKeyDown}>
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-slate-900 border-b border-slate-800 overflow-x-auto custom-scrollbar">
          <button type="button" onClick={() => void run()} disabled={isRunning} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-60 disabled:pointer-events-none shrink-0" title="Run (Ctrl/Cmd + Enter)">
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run
            <kbd className="hidden sm:inline font-mono text-[9px] font-bold text-emerald-100/70 bg-black/20 px-1.5 py-0.5 rounded">Ctrl+Enter</kbd>
          </button>

          <div className="relative shrink-0" ref={menuRef}>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} className={toolBtn} aria-haspopup="menu" aria-expanded={menuOpen}>
              <BookOpen size={14} /> Examples <ChevronDown size={12} className={cn("transition-transform", menuOpen && "rotate-180")} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute left-0 top-full mt-2 w-72 max-h-[26rem] overflow-y-auto custom-scrollbar rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-30 p-2 animate-fade-in">
                <p className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Built-in</p>
                {BUILTIN_EXAMPLES.map((ex) => (
                  <button key={ex.id} type="button" role="menuitem" onClick={() => loadExample(ex)} className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors">
                    {ex.title}
                  </button>
                ))}
                {lessonExamples.map(({ module: m, lessons }) => (
                  <div key={m.id}>
                    <p className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-500 truncate">{m.title}</p>
                    {lessons.map((l) => (
                      <button key={l.id} type="button" role="menuitem" onClick={() => loadExample({ id: l.id, title: l.title, code: l.codeExample })} className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors truncate">
                        {l.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={resetCode} className={toolBtn} title="Restore the default snippet">
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={clearOutput} className={toolBtn} disabled={!hasOutput && runState === "idle"} title="Clear the output pane">
            <Eraser size={14} /> Clear
          </button>

          <span className="flex-1 min-w-2" />

          <button type="button" onClick={askTutor} className={cn(toolBtn, "text-indigo-300 hover:text-white")} title="Send this code to the AI tutor">
            <Bot size={14} /> Ask AI tutor
          </button>
          <button type="button" onClick={share} className={toolBtn} title="Copy a shareable link">
            {shared ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />} Share
          </button>
          <button type="button" onClick={download} className={toolBtn} title="Download as playground.py">
            <Download size={14} /> <span className="hidden sm:inline">Download</span>
          </button>
        </div>

        {/* Panes */}
        <div className="grid lg:grid-cols-2 lg:divide-x divide-slate-800">
          {/* Editor */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">playground.py</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {code.split("\n").length} lines · {code.length} chars
              </span>
            </div>
            <div className="h-[420px] lg:h-[600px] min-h-[420px]">
              <CodeMirror value={code} onChange={setCode} theme="dark" extensions={extensions} height="100%" basicSetup={{ lineNumbers: true, foldGutter: true }} placeholder="# Write some Python and press Run" className="h-full" />
            </div>
          </div>

          {/* Output */}
          <div className="flex flex-col min-w-0 border-t lg:border-t-0 border-slate-800">
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Terminal size={14} className="text-slate-500 shrink-0" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Output</span>
                {runLabel && <span className="text-[10px] font-bold text-slate-400 truncate">{runLabel}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {elapsed !== null && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Clock size={11} /> {formatElapsed(elapsed)}
                  </span>
                )}
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", statusPill.cls)}>
                  {(isRunning || runtimeLoading) && <Loader2 size={10} className="animate-spin" />}
                  {statusPill.label}
                </span>
              </div>
            </div>

            <div className="h-[420px] lg:h-[600px] min-h-[420px] overflow-y-auto custom-scrollbar p-4 space-y-4 font-mono text-[13px] leading-relaxed text-slate-200">
              {runtime.status === "loading" && !hasOutput && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                  <p className="font-sans font-black text-white tracking-tight">Preparing your Python runtime</p>
                  <p className="font-sans text-xs font-bold text-blue-300 mt-1">{runtime.stage || "Downloading Python runtime (~10 MB)..."}</p>
                  <p className="font-sans text-[11px] font-medium text-slate-500 mt-3 max-w-xs leading-relaxed">This only happens once: your browser caches the runtime, so the next visit starts in a second or two. You can keep editing meanwhile.</p>
                </div>
              )}

              {runtime.status === "failed" && !hasOutput && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                  </div>
                  <p className="font-sans font-black text-white tracking-tight">The Python runtime could not be loaded</p>
                  <p className="font-sans text-xs font-medium text-red-300 mt-1 max-w-sm leading-relaxed">{runtime.error}</p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-5">
                    <Button size="sm" onClick={() => void bootRuntime()}>
                      <RefreshCw size={14} /> Retry
                    </Button>
                    <LinkButton to="/notify?source=playground" variant="secondary" size="sm">
                      <Bell size={14} /> Notify me
                    </LinkButton>
                  </div>
                </div>
              )}

              {runtime.status === "ready" && !hasOutput && !isRunning && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                    <Play size={24} />
                  </div>
                  <p className="font-sans font-black text-white tracking-tight">Runtime ready</p>
                  <p className="font-sans text-[11px] font-medium text-slate-500 mt-2 max-w-xs leading-relaxed">
                    Press <span className="text-slate-300 font-bold">Run</span> or <kbd className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">Ctrl+Enter</kbd> to execute your code. Output, errors and charts appear here.
                  </p>
                </div>
              )}

              {isRunning && !hasOutput && runtime.status === "ready" && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <Loader2 size={26} className="animate-spin text-blue-400 mb-3" />
                  <p className="font-sans text-xs font-bold text-slate-400">{runLabel || "Running..."}</p>
                  <p className="font-sans text-[11px] font-medium text-slate-500 mt-2 max-w-xs leading-relaxed">First-time package imports (numpy, pandas...) download a few MB and are cached afterwards.</p>
                </div>
              )}

              {stdout && (
                <section>
                  <h4 className="font-sans text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Terminal size={11} /> stdout
                  </h4>
                  <pre className="whitespace-pre-wrap break-words bg-black/40 border border-white/5 rounded-xl p-4">{stdout}</pre>
                </section>
              )}

              {(error || stderrText) && (
                <section>
                  <h4 className="font-sans text-[9px] font-black uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={11} /> {error ? "error" : "stderr"}
                  </h4>
                  {stderrText && <pre className="whitespace-pre-wrap break-words bg-amber-950/30 border border-amber-500/20 text-amber-200 rounded-xl p-4 mb-2">{stderrText}</pre>}
                  {error && <pre className="whitespace-pre-wrap break-words bg-red-950/40 border border-red-500/30 text-red-200 rounded-xl p-4">{error}</pre>}
                  {error && (
                    <button type="button" onClick={askTutor} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-sans font-black uppercase tracking-widest text-indigo-300 hover:text-white transition-colors">
                      <Bot size={12} /> Ask the AI tutor about this error
                    </button>
                  )}
                </section>
              )}

              {figures.length > 0 && (
                <section>
                  <h4 className="font-sans text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5">
                    <ImageIcon size={11} /> figures ({figures.length})
                  </h4>
                  <div className="space-y-3">
                    {figures.map((b64, i) => (
                      <div key={i} className="bg-white rounded-xl p-2 overflow-x-auto custom-scrollbar">
                        <img src={`data:image/png;base64,${b64}`} alt={`Figure ${i + 1}`} className="max-w-full h-auto mx-auto" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {result !== null && (
                <section>
                  <h4 className="font-sans text-[9px] font-black uppercase tracking-widest text-violet-400 mb-2 flex items-center gap-1.5">
                    <Sparkles size={11} /> result
                  </h4>
                  <pre className="whitespace-pre-wrap break-words bg-violet-950/30 border border-violet-500/20 text-violet-100 rounded-xl p-4">{result}</pre>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <Cpu size={12} /> Runtime: Python {pythonVersion || "3.x"} via Pyodide {PYODIDE_VERSION} - numpy, pandas, matplotlib, scikit-learn available
          </span>
          <span className="flex items-center gap-1.5">
            <Zap size={12} className="text-amber-500" /> {user ? "Runs earn XP once a day" : "Code is saved in this browser"}
          </span>
        </div>
      </div>

      {/* Tips */}
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {[
          { icon: <Sparkles size={18} />, title: "Last expression shows up", text: "End a cell with `df` or `arr.mean()` and the value is displayed as the result, just like a notebook." },
          { icon: <ImageIcon size={18} />, title: "Charts render inline", text: "Any Matplotlib figure you create is captured as an image after the run. plt.show() is optional." },
          { icon: <Bot size={18} />, title: "Stuck on an error?", text: "The AI tutor already sees your code. Click Ask AI tutor to get an explanation or a fix." },
        ].map((tip) => (
          <div key={tip.title} className="card p-5 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">{tip.icon}</span>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">{tip.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
