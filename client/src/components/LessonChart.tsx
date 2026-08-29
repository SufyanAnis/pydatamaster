import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartType } from "../lib/types";
import { useSite } from "../context/SiteContext";

type Row = Record<string, string | number>;

interface Dataset {
  data: Row[];
  xKey: string;
  series: { key: string; color: string }[];
  caption: string;
  yDomain?: [number, number];
}

const WORKOUTS: Dataset = {
  data: [
    { name: "Mon", Calories: 420, Duration: 50 },
    { name: "Tue", Calories: 380, Duration: 40 },
    { name: "Wed", Calories: 390, Duration: 45 },
    { name: "Thu", Calories: 450, Duration: 60 },
    { name: "Fri", Calories: 410, Duration: 55 },
  ],
  xKey: "name",
  series: [
    { key: "Calories", color: "#8b5cf6" },
    { key: "Duration", color: "#3b82f6" },
  ],
  caption: "Calories and duration per workout day",
};

const SALES_BY_REGION: Dataset = {
  data: [
    { region: "North", Total: 400, Average: 133.3 },
    { region: "South", Total: 200, Average: 100 },
    { region: "East", Total: 165, Average: 82.5 },
  ],
  xKey: "region",
  series: [
    { key: "Total", color: "#3b82f6" },
    { key: "Average", color: "#f59e0b" },
  ],
  caption: "df.groupby('region')['sales'] - total and average sales per region",
};

const LINE: Dataset = {
  data: [
    { x: 0, Signal: 0, "Half signal": 0 },
    { x: 6, Signal: 250, "Half signal": 125 },
    { x: 12, Signal: 100, "Half signal": 50 },
    { x: 18, Signal: 300, "Half signal": 150 },
  ],
  xKey: "x",
  series: [
    { key: "Signal", color: "#3b82f6" },
    { key: "Half signal", color: "#f59e0b" },
  ],
  caption: "plt.plot(x, y) - points joined by straight lines",
};

const CAR_SCATTER: Dataset = {
  data: [5, 7, 8, 7, 2, 17, 2, 9, 4, 11].map((x, i) => ({ x, y: [99, 86, 87, 88, 111, 86, 103, 87, 94, 78][i] })),
  xKey: "x",
  series: [{ key: "Observations", color: "#ef4444" }],
  caption: "plt.scatter(x, y) - age of car vs. speed",
  yDomain: [70, 115],
};

const STUDY_SCATTER: Dataset = {
  data: [
    { x: 0.5, y: 43 }, { x: 1.2, y: 47 }, { x: 2.1, y: 49 }, { x: 2.8, y: 56 }, { x: 3.4, y: 55 }, { x: 4.2, y: 62 }, { x: 4.9, y: 63 }, { x: 5.6, y: 69 },
    { x: 6.3, y: 70 }, { x: 7.0, y: 77 }, { x: 7.8, y: 78 }, { x: 8.5, y: 84 }, { x: 9.1, y: 83 }, { x: 9.8, y: 90 },
  ],
  xKey: "x",
  series: [{ key: "Students", color: "#f59e0b" }],
  caption: "Hours studied vs. exam score - the straight-line trend a LinearRegression learns",
  yDomain: [35, 95],
};

const HIST: Dataset = {
  data: [
    { bin: "20-26", Count: 12 },
    { bin: "26-32", Count: 38 },
    { bin: "32-38", Count: 91 },
    { bin: "38-44", Count: 160 },
    { bin: "44-50", Count: 214 },
    { bin: "50-56", Count: 205 },
    { bin: "56-62", Count: 148 },
    { bin: "62-68", Count: 78 },
    { bin: "68-74", Count: 39 },
    { bin: "74-80", Count: 15 },
  ],
  xKey: "bin",
  series: [{ key: "Count", color: "#3b82f6" }],
  caption: "Histogram of 1,000 samples from a normal distribution (mean 50, std 10)",
};

const BY_LESSON: Record<string, Dataset> = {
  "pd-groupby": SALES_BY_REGION,
  "sk-regression": STUDY_SCATTER,
};

function pickDataset(type: ChartType, lessonId?: string): Dataset {
  if (lessonId && BY_LESSON[lessonId]) return BY_LESSON[lessonId];
  switch (type) {
    case "bar":
      return WORKOUTS;
    case "line":
      return LINE;
    case "scatter":
      return CAR_SCATTER;
    case "hist":
      return HIST;
    default:
      return WORKOUTS;
  }
}

export function LessonChart({ type, lessonId }: { type: ChartType; lessonId?: string }) {
  const { theme } = useSite();
  if (type === "none") return null;
  const ds = pickDataset(type, lessonId);
  const grid = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const axis = theme === "dark" ? "#94a3b8" : "#64748b";
  const cursorFill = theme === "dark" ? "#1e293b" : "#f1f5f9";
  const tooltipStyle = { background: theme === "dark" ? "#0f172a" : "#fff", border: `1px solid ${grid}`, borderRadius: 12, fontSize: 12, fontWeight: 600 };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Interactive output preview</span>
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{type === "hist" ? "histogram" : `${type} chart`}</span>
      </div>
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={ds.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey={ds.xKey} stroke={axis} fontSize={12} />
              <YAxis stroke={axis} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {ds.series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={i === 0 ? 3 : 2} strokeDasharray={i === 0 ? undefined : "6 4"} dot={{ r: 4 }} isAnimationActive={false} />
              ))}
            </LineChart>
          ) : type === "scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis type="number" dataKey="x" name="x" stroke={axis} fontSize={12} />
              <YAxis type="number" dataKey="y" name="y" stroke={axis} fontSize={12} domain={ds.yDomain ?? ["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              {ds.series.map((s) => (
                <Scatter key={s.key} name={s.key} data={ds.data} fill={s.color} isAnimationActive={false} />
              ))}
            </ScatterChart>
          ) : (
            <BarChart data={ds.data} barCategoryGap={type === "hist" ? 2 : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey={ds.xKey} stroke={axis} fontSize={type === "hist" ? 11 : 12} />
              <YAxis stroke={axis} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: cursorFill }} />
              {ds.series.length > 1 && <Legend />}
              {ds.series.map((s) => (
                <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-slate-400 mt-3 italic font-medium">{ds.caption}. Rendered with Recharts to simulate the Matplotlib output - press "Try it" on the code to run the real thing.</p>
    </div>
  );
}
