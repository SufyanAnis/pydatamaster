import type { PipelineStep, Post, Resource } from "./types.js";

type SeedPost = Omit<Post, "views" | "updatedAt" | "published" | "coverImage"> & { published?: boolean; coverImage?: string };

export const POSTS: SeedPost[] = [
  {
    id: "pandas-3-update",
    title: "Pandas 3.0: What You Need to Know",
    excerpt: "Explore the latest performance improvements and API changes in the Pandas 3.0 release - and what to update before you upgrade.",
    category: "News",
    author: "PyData Team",
    readTime: "5 min read",
    publishedAt: "2026-03-15T09:00:00.000Z",
    content: `Pandas is undergoing a major evolution. In this post we dive into the performance optimizations and behavior changes introduced in the 3.0 release.

## Key changes

- **Copy-on-Write is the default.** Chained assignments such as \`df[df.a > 0]["b"] = 1\` no longer silently modify the original frame. Use \`df.loc[mask, "b"] = 1\` instead.
- **PyArrow-backed strings.** Text columns now use the \`string[pyarrow]\` dtype out of the box: far less memory and much faster \`.str\` operations.
- **Stricter datetime parsing.** Ambiguous formats raise instead of guessing. Pass \`format=\` to \`pd.to_datetime\`.
- **Removed deprecations.** \`DataFrame.append\`, \`inplace\` on several methods and the \`axis=None\` defaults are gone.

## Migration checklist

1. Run your test-suite with \`pd.options.mode.copy_on_write = True\` on Pandas 2.x first.
2. Search your code for chained assignment patterns.
3. Pin the new version in \`requirements.txt\` and re-profile memory - you will probably be pleasantly surprised.

\`\`\`python
import pandas as pd
pd.options.mode.copy_on_write = True   # try 3.0 behaviour on 2.x

df = pd.DataFrame({"a": [1, -1, 2], "b": [0, 0, 0]})
df.loc[df["a"] > 0, "b"] = 1           # explicit, CoW-safe
print(df)
\`\`\`

Stay ahead of the curve by updating your scripts now to avoid future deprecations.`,
  },
  {
    id: "numpy-efficiency",
    title: "Vectorization: The Secret to NumPy Speed",
    excerpt: "Stop using for-loops and start using NumPy vectors for massive performance gains.",
    category: "Tutorial",
    author: "PyData Team",
    readTime: "8 min read",
    publishedAt: "2026-03-10T09:00:00.000Z",
    content: `Why is NumPy so much faster than standard Python lists? The answer lies in **vectorization**.

Vectorization allows operations to be performed on entire arrays at once, utilizing low-level C and Fortran optimizations. Python's interpreter overhead is paid once per array instead of once per element.

## The slow way

\`\`\`python
result = []
for value in data:          # one Python bytecode loop per element
    result.append(value * 2)
\`\`\`

## The fast way

\`\`\`python
import numpy as np
arr = np.arange(1_000_000)
result = arr * 2            # one call, compiled loop underneath
\`\`\`

Compare the two on a million elements and you will see gains of **50-100x**.

## Three habits of vectorized thinkers

1. **Reach for ufuncs.** \`np.where\`, \`np.clip\`, \`np.cumsum\` replace most conditional loops.
2. **Use boolean masks** instead of filtering in a loop: \`arr[arr > 0]\`.
3. **Let broadcasting do the alignment** rather than nesting loops over rows and columns.

## When loops are still fine

If your array has ten elements, readability wins. Vectorize the hot path that profiling points to, not every line of code.`,
  },
  {
    id: "pandas-one-liners",
    title: "10 Pandas One-Liners Every Analyst Should Know",
    excerpt: "Small idioms that save hours: value counts with percentages, conditional columns, quick pivots and more.",
    category: "Tutorial",
    author: "PyData Team",
    readTime: "7 min read",
    publishedAt: "2026-04-02T09:00:00.000Z",
    content: `Pandas rewards people who know its idioms. Here are ten that show up in almost every notebook.

1. **Percent breakdown of a category**
   \`df["city"].value_counts(normalize=True).mul(100).round(1)\`
2. **Conditional column**
   \`df["tier"] = np.where(df["spend"] > 500, "gold", "standard")\`
3. **Multi-condition bucket**
   \`pd.cut(df["age"], bins=[0, 18, 35, 60, 120], labels=["kid", "young", "adult", "senior"])\`
4. **Top N per group**
   \`df.sort_values("sales", ascending=False).groupby("region").head(3)\`
5. **Quick pivot**
   \`df.pivot_table(index="region", columns="month", values="sales", aggfunc="sum", fill_value=0)\`
6. **Running total**
   \`df["cumulative"] = df.groupby("customer")["amount"].cumsum()\`
7. **Missing-value report**
   \`df.isna().mean().sort_values(ascending=False)\`
8. **Rename many columns**
   \`df.columns = df.columns.str.lower().str.replace(" ", "_")\`
9. **Explode a list column**
   \`df.explode("tags")\`
10. **Memory diet**
    \`df = df.astype({c: "category" for c in df.select_dtypes("object")})\`

Bookmark this page - and try each one in the Playground with your own data.`,
  },
  {
    id: "matplotlib-seaborn-plotly",
    title: "Matplotlib vs Seaborn vs Plotly: Which Should You Learn First?",
    excerpt: "Three great plotting libraries, three different philosophies. Here is how to choose - and why Matplotlib is still the foundation.",
    category: "Guide",
    author: "PyData Team",
    readTime: "6 min read",
    publishedAt: "2026-05-20T09:00:00.000Z",
    content: `New learners often ask which visualization library to invest in. The honest answer: all three eventually - but in a specific order.

## Matplotlib - the foundation

Every other library either wraps Matplotlib or copies its vocabulary (figures, axes, ticks). Learning it first means nothing else will feel foreign, and you can always drop down to it for pixel-level control. Weakness: verbose defaults.

## Seaborn - statistical plots in one line

Seaborn sits on top of Matplotlib and adds dataset-aware functions such as \`sns.boxplot(data=df, x="region", y="sales", hue="segment")\`. Beautiful defaults, built-in aggregation and confidence intervals. Learn it as soon as you start exploring real datasets.

## Plotly - interactive and web-ready

Plotly renders HTML with hover tooltips, zooming and animations. It shines in dashboards (Dash) and notebooks shared with stakeholders. Its grammar is different, so learn it once you are comfortable with the static libraries.

## Recommendation

| Stage | Learn |
| --- | --- |
| First month | Matplotlib basics: plot, scatter, bar, hist, subplots |
| Exploratory analysis | Seaborn for distributions and relationships |
| Sharing results | Plotly (or Matplotlib exports) |

Whichever you choose, the principles are constant: label your axes, choose the right chart for the question, and remove everything that does not carry information.`,
  },
  {
    id: "data-science-roadmap-2026",
    title: "The 2026 Python Data Science Roadmap",
    excerpt: "A phase-by-phase path from your first NumPy array to production MLOps - and the exact tools worth learning at each step.",
    category: "Career",
    author: "PyData Team",
    readTime: "9 min read",
    publishedAt: "2026-06-11T09:00:00.000Z",
    content: `The data ecosystem changes fast, but the *shape* of a strong skill set does not. This roadmap mirrors the ten-step pipeline on our home page.

## Phase 1 - Data manipulation (months 1-3)

- **NumPy** for arrays and vectorized math
- **Pandas** for tabular cleaning, grouping and joins
- **Matplotlib** (then Seaborn) for exploratory charts

Deliverable: an end-to-end exploratory analysis notebook of a public dataset.

## Phase 2 - Machine learning & AI (months 4-7)

- **SQL** - you will spend more time extracting data than modeling it
- **Scikit-Learn** - regression, classification, cross-validation, pipelines
- **PyTorch or TensorFlow** - tensors, autograd, a small CNN
- **Hugging Face** - fine-tune a pretrained transformer for text classification

Deliverable: a model with honest evaluation and a short write-up of its limitations.

## Phase 3 - Automation, scale & MLOps (months 8-10)

- **Apache Airflow** - schedule your pipeline as a DAG
- **PySpark** - the same Pandas ideas at terabyte scale
- **MLflow** - track experiments and register models

Deliverable: a scheduled pipeline that retrains, evaluates and registers a model automatically.

## Habits that compound

1. Publish weekly - a notebook, a chart, a short post.
2. Read library changelogs; one deprecation caught early saves a weekend.
3. Teach someone a concept you learned this week - it is the fastest way to find the gaps.

Start with Module 1 today and use the Progress page to keep your streak alive.`,
  },
];

export const PIPELINE: PipelineStep[] = [
  {
    id: "computation-numpy",
    number: 1,
    title: "Computation",
    subtitle: "NumPy Core",
    purpose: "Numerical computing and array operations",
    keyConcepts: ["N-dimensional arrays (ndarray)", "Vectorized operations (no loops)", "Broadcasting", "Linear algebra, statistics, random sampling"],
    coreLabel: "Core Functions",
    coreItems: ["np.array, np.reshape, np.mean, np.dot, np.linalg", "np.random"],
    scope: "Fast computation for large numeric datasets. Basis for ML math operations.",
    outcome: "You can manipulate matrices, perform math operations, simulate data",
    phase: "1-3: Data manipulation and understanding",
    group: "Data manipulation",
    color: "orange",
    bgColor: "",
    icon: "Cpu",
  },
  {
    id: "coreprocessing-pandas",
    number: 2,
    title: "CoreProcessing",
    subtitle: "Pandas Power",
    purpose: "Structured data processing and manipulation",
    keyConcepts: ["Series & DataFrames", "Indexing (loc, iloc)", "Handling missing data", "Data aggregation and grouping", "Feature engineering"],
    coreLabel: "Core Functions",
    coreItems: ["df.dropna, df.fillna, df.groupby, df.merge, df.apply"],
    scope: "Tabular data cleaning and transformation. Prepares data for analysis and ML.",
    outcome: "You can clean messy data and build meaningful features",
    phase: "1-3: Data manipulation and understanding",
    group: "Data manipulation",
    color: "blue",
    bgColor: "",
    icon: "Table",
  },
  {
    id: "insight-matplotlib",
    number: 3,
    title: "Insight",
    subtitle: "Matplotlib Viz",
    purpose: "Data visualization for insight discovery",
    keyConcepts: ["Line, bar, scatter, histogram, box plots", "Plot customization (labels, titles, axes)", "Figure and subplot management"],
    coreLabel: "Core Functions",
    coreItems: ["plt.plot, plt.bar, plt.scatter, plt.hist", "plt.xlabel, plt.title"],
    scope: "Visual storytelling from raw data. Used in EDA (Exploratory Data Analysis).",
    outcome: "You can visualize trends, distributions, outliers",
    phase: "1-3: Data manipulation and understanding",
    group: "Data manipulation",
    color: "emerald",
    bgColor: "",
    icon: "BarChart3",
  },
  {
    id: "querying-sql",
    number: 4,
    title: "Querying",
    subtitle: "SQL Mastery (PostgreSQL/MySQL)",
    purpose: "Retrieve and manage data from databases",
    keyConcepts: ["CRUD operations", "Joins (INNER, LEFT, RIGHT)", "Aggregations", "Window functions", "Database indexing"],
    coreLabel: "Core Queries",
    coreItems: ["SELECT, JOIN, GROUP BY, ORDER BY", "WITH (CTE), OVER()"],
    scope: "Works with relational databases. Essential for real-world data extraction.",
    outcome: "You can query large datasets efficiently from DBs",
    phase: "4-7: Machine Learning and AI model building",
    group: "ML & AI Building",
    color: "indigo",
    bgColor: "",
    icon: "Database",
  },
  {
    id: "modeling-sklearn",
    number: 5,
    title: "Modeling",
    subtitle: "Scikit-Learn Core",
    purpose: "Classical Machine Learning model building",
    keyConcepts: ["Supervised & unsupervised learning", "Model training and inference", "Model evaluation", "Hyperparameter tuning"],
    coreLabel: "Core Models",
    coreItems: [
      "Regression: LinearRegression, Ridge, Lasso",
      "Classification: LogisticRegression, RandomForest, SVM",
      "Clustering: KMeans, DBSCAN",
      "Evaluation: accuracy_score, classification_report, mean_squared_error, roc_auc_score",
    ],
    scope: "ML baseline models. Fast prototyping.",
    outcome: "You can train, evaluate, and improve ML models",
    phase: "4-7: Machine Learning and AI model building",
    group: "ML & AI Building",
    color: "amber",
    bgColor: "",
    icon: "Brain",
  },
  {
    id: "neuralcompute-pytorch",
    number: 6,
    title: "NeuralCompute",
    subtitle: "PyTorch / TensorFlow",
    purpose: "Deep Learning and neural network computing",
    keyConcepts: ["Tensors", "Automatic differentiation", "Neural network layers", "Backpropagation", "Optimizers, loss functions"],
    coreLabel: "Core Modules",
    coreItems: ["PyTorch: torch, torch.nn, torch.optim", "TF: tf.Tensor, tf.keras", "Models: CNN (vision), RNN/LSTM (sequences), Transformers"],
    scope: "Complex AI tasks. Model training on GPUs.",
    outcome: "You can build and train neural networks",
    phase: "4-7: Machine Learning and AI model building",
    group: "ML & AI Building",
    color: "red",
    bgColor: "",
    icon: "Network",
  },
  {
    id: "languageai-huggingface",
    number: 7,
    title: "LanguageAI",
    subtitle: "Hugging Face NLP",
    purpose: "Natural Language Processing with pretrained models",
    keyConcepts: ["Tokenization", "Embeddings", "Transformer models", "Fine-tuning", "Model inference"],
    coreLabel: "Core Tools",
    coreItems: ["transformers library", "datasets, tokenizers, pipeline", "Models: BERT, GPT, T5, LLama, etc."],
    scope: "Text classification, summarization, chatbots, translation, Q&A",
    outcome: "You can apply and fine-tune LLMs/NLP models",
    phase: "4-7: Machine Learning and AI model building",
    group: "ML & AI Building",
    color: "yellow",
    bgColor: "",
    icon: "MessageSquare",
  },
  {
    id: "workflow-airflow",
    number: 8,
    title: "Workflow",
    subtitle: "Apache Airflow",
    purpose: "Automation and orchestration of data pipelines",
    keyConcepts: ["DAG (Directed Acyclic Graph)", "Task scheduling", "ETL automation", "Dependency management"],
    coreLabel: "Core Components",
    coreItems: ["Operators: PythonOperator, BashOperator", "Scheduler, workers, logs"],
    scope: "Automates data ingestion, model training, reporting pipelines",
    outcome: "You can automate complex workflows reliably",
    phase: "8-10: Automation, scale, and MLOps",
    group: "Automation & MLOps",
    color: "cyan",
    bgColor: "",
    icon: "Workflow",
  },
  {
    id: "bigscale-spark",
    number: 9,
    title: "BigScale",
    subtitle: "Spark Engine (PySpark)",
    purpose: "Distributed Big Data processing",
    keyConcepts: ["RDDs, DataFrames", "Lazy execution", "Distributed computing", "Cluster processing"],
    coreLabel: "Core Modules",
    coreItems: ["pyspark.sql, SparkSession"],
    scope: "Handles terabytes of data. Runs on clusters (Hadoop, Databricks, etc.)",
    outcome: "You can process massive datasets in parallel",
    phase: "8-10: Automation, scale, and MLOps",
    group: "Automation & MLOps",
    color: "sky",
    bgColor: "",
    icon: "Layers",
  },
  {
    id: "experimentops-mlflow",
    number: 10,
    title: "ExperimentOps",
    subtitle: "MLflow Tracking",
    purpose: "MLOps experiment tracking and model lifecycle management",
    keyConcepts: ["Logging parameters, metrics, artifacts", "Model registry", "Versioning", "Deployment integration"],
    coreLabel: "Core Functions",
    coreItems: ["mlflow.log_param, mlflow.log_metric, mlflow.log_artifact", "mlflow.sklearn.log_model"],
    scope: "Keeps ML experiments organized. Production readiness.",
    outcome: "You can track, register, and manage models professionally",
    phase: "8-10: Automation, scale, and MLOps",
    group: "Automation & MLOps",
    color: "purple",
    bgColor: "",
    icon: "FlaskConical",
  },
];

type SeedResource = Omit<Resource, "id" | "orderIndex" | "content"> & { content?: string };

export const RESOURCES: SeedResource[] = [
  { name: "Python.org", url: "https://docs.python.org/3/", description: "Core language documentation", category: "docs", icon: "BookOpen" },
  { name: "Pandas", url: "https://pandas.pydata.org/docs/", description: "Data manipulation and analysis", category: "docs", icon: "Table" },
  { name: "NumPy", url: "https://numpy.org/doc/", description: "Fundamental package for scientific computing", category: "docs", icon: "Cpu" },
  { name: "Matplotlib", url: "https://matplotlib.org/stable/", description: "Comprehensive library for visualizations", category: "docs", icon: "LineChart" },
  { name: "Scikit-Learn", url: "https://scikit-learn.org/stable/user_guide.html", description: "Machine learning in Python", category: "docs", icon: "Brain" },
  { name: "PyTorch", url: "https://pytorch.org/docs/stable/index.html", description: "Deep learning framework", category: "docs", icon: "Network" },
  { name: "TensorFlow", url: "https://www.tensorflow.org/api_docs", description: "End-to-end machine learning platform", category: "docs", icon: "Network" },
  { name: "Hugging Face", url: "https://huggingface.co/docs", description: "State-of-the-art NLP and Transformers", category: "docs", icon: "MessageSquare" },
  { name: "Seaborn", url: "https://seaborn.pydata.org/", description: "Statistical data visualization", category: "docs", icon: "BarChart3" },
  { name: "Polars", url: "https://docs.pola.rs/", description: "Blazingly fast DataFrames in Rust/Python", category: "docs", icon: "Table" },
  { name: "SQL (PostgreSQL)", url: "https://www.postgresql.org/docs/", description: "Advanced relational database", category: "docs", icon: "Database" },
  { name: "Apache Airflow", url: "https://airflow.apache.org/docs/", description: "Programmatic workflow orchestration", category: "docs", icon: "Workflow" },
  { name: "PySpark", url: "https://spark.apache.org/docs/latest/api/python/", description: "Unified engine for large-scale data", category: "docs", icon: "Layers" },
  { name: "MLflow", url: "https://mlflow.org/docs/latest/index.html", description: "Platform for the ML lifecycle", category: "docs", icon: "FlaskConical" },
  { name: "XGBoost", url: "https://xgboost.readthedocs.io/", description: "Optimized gradient boosting library", category: "docs", icon: "Brain" },
  { name: "LightGBM", url: "https://lightgbm.readthedocs.io/", description: "High performance gradient boosting", category: "docs", icon: "Brain" },
  { name: "Plotly", url: "https://plotly.com/python/", description: "Interactive graphing library", category: "docs", icon: "BarChart3" },
  { name: "BeautifulSoup", url: "https://www.crummy.com/software/BeautifulSoup/bs4/doc/", description: "Screen-scraping and HTML parsing", category: "docs", icon: "Code2" },

  { name: "VS Code", url: "https://code.visualstudio.com/", description: "Lightweight, powerful code editor", category: "tools", icon: "Code2" },
  { name: "Jupyter", url: "https://jupyter.org/", description: "Interactive computing environment", category: "tools", icon: "Layers" },
  { name: "PyCharm", url: "https://www.jetbrains.com/pycharm/", description: "Professional Python IDE", category: "tools", icon: "Code2" },
  { name: "Anaconda", url: "https://www.anaconda.com/", description: "Data science platform and package manager", category: "tools", icon: "Package" },
  { name: "Google Colab", url: "https://colab.research.google.com/", description: "Cloud-based Jupyter Notebooks", category: "tools", icon: "Cloud" },
  { name: "Kaggle", url: "https://www.kaggle.com/", description: "Data science competitions and datasets", category: "tools", icon: "Trophy" },
  { name: "Cursor", url: "https://www.cursor.com/", description: "AI-native code editor", category: "tools", icon: "Sparkles" },
  { name: "DataSpell", url: "https://www.jetbrains.com/dataspell/", description: "The IDE for Data Scientists", category: "tools", icon: "Table" },

  {
    name: "NumPy Cheat Sheet",
    url: "",
    description: "Array creation, indexing, math, broadcasting and random - on one page.",
    category: "cheatsheet",
    icon: "Cpu",
    content: `# NumPy Cheat Sheet

## Create

| Code | Result |
| --- | --- |
| \`np.array([1, 2, 3])\` | 1-D array |
| \`np.zeros((2, 3))\`, \`np.ones(4)\` | filled arrays |
| \`np.arange(0, 10, 2)\` | 0 2 4 6 8 |
| \`np.linspace(0, 1, 5)\` | 5 evenly spaced values |
| \`np.eye(3)\` | identity matrix |
| \`rng = np.random.default_rng(0)\` | random generator |
| \`rng.normal(0, 1, size=(2, 2))\` | Gaussian samples |

## Inspect

\`arr.shape\` - \`arr.ndim\` - \`arr.size\` - \`arr.dtype\` - \`arr.astype(float)\`

## Reshape & combine

\`arr.reshape(3, -1)\` - \`arr.T\` - \`arr.flatten()\` - \`np.concatenate([a, b])\` - \`np.vstack\` / \`np.hstack\` - \`np.split(arr, 3)\`

## Index & slice

\`arr[0]\`, \`arr[-1]\`, \`arr[1:4]\`, \`m[row, col]\`, \`m[:, 0]\`, \`arr[arr > 5]\`, \`arr[[0, 2]]\`

## Math (element-wise)

\`+ - * / **\` - \`np.sqrt\`, \`np.exp\`, \`np.log\`, \`np.abs\`, \`np.round\` - matrix product: \`a @ b\`

## Aggregate

\`arr.sum()\`, \`.mean()\`, \`.std()\`, \`.min()\`, \`.max()\`, \`.argmax()\`, \`.cumsum()\` - use \`axis=0\` (columns) or \`axis=1\` (rows)

## Useful

\`np.where(cond, a, b)\` - \`np.clip(arr, lo, hi)\` - \`np.unique(arr, return_counts=True)\` - \`np.sort\` - \`np.argsort\` - \`np.corrcoef(x, y)\` - \`np.percentile(arr, 90)\`

## Broadcasting rule

Compare shapes right-to-left; dimensions match when equal or one of them is 1. Add an axis with \`arr[:, None]\`.`,
  },
  {
    name: "Pandas Cheat Sheet",
    url: "",
    description: "Load, inspect, select, clean, group, merge and export DataFrames.",
    category: "cheatsheet",
    icon: "Table",
    content: `# Pandas Cheat Sheet

## Load & save

\`pd.read_csv("f.csv")\` - \`pd.read_excel\` - \`pd.read_sql(query, conn)\` - \`pd.read_json\` - \`df.to_csv("out.csv", index=False)\` - \`df.to_parquet\`

## Inspect

\`df.head()\` - \`df.tail()\` - \`df.info()\` - \`df.describe()\` - \`df.shape\` - \`df.columns\` - \`df.dtypes\` - \`df["c"].value_counts()\` - \`df["c"].unique()\`

## Select

| Goal | Code |
| --- | --- |
| one column (Series) | \`df["c"]\` |
| several columns | \`df[["a", "b"]]\` |
| by label | \`df.loc[3, "c"]\`, \`df.loc[:, "a":"c"]\` |
| by position | \`df.iloc[0, 1]\`, \`df.iloc[:5]\` |
| filter rows | \`df[df["age"] > 30]\` |
| multiple conditions | \`df[(df.a > 1) & (df.b == "x")]\` |
| SQL-like | \`df.query("age > 30 and city == 'Lahore'")\` |

## Clean

\`df.isna().sum()\` - \`df.dropna(subset=["c"])\` - \`df.fillna(0)\` - \`df["c"].fillna(df["c"].median())\` - \`df.drop_duplicates()\` - \`df.rename(columns={"a": "b"})\` - \`df["c"].astype(int)\` - \`pd.to_datetime(df["d"])\` - \`df["s"].str.strip().str.lower()\`

## Transform

\`df["new"] = df["a"] * 2\` - \`df["c"].apply(func)\` - \`df["c"].map({"a": 1})\` - \`np.where(cond, x, y)\` - \`pd.cut(df["age"], bins=[...])\` - \`df.sort_values("c", ascending=False)\` - \`df.nlargest(5, "c")\`

## Group & pivot

\`df.groupby("k")["v"].sum()\` - \`df.groupby("k").agg(total=("v", "sum"), n=("v", "count"))\` - \`df.groupby("k")["v"].transform("mean")\` - \`pd.pivot_table(df, index="r", columns="c", values="v", aggfunc="sum")\` - \`pd.crosstab(df.a, df.b)\`

## Combine

\`pd.merge(a, b, on="id", how="left")\` - \`pd.concat([a, b], ignore_index=True)\` - \`a.join(b)\`

## Dates

\`df["d"].dt.year\` - \`.dt.month\` - \`.dt.day_name()\` - \`df.set_index("d").resample("M").sum()\` - \`df["v"].rolling(7).mean()\``,
  },
  {
    name: "Matplotlib Cheat Sheet",
    url: "",
    description: "The plot types, styling options and layout commands you use every day.",
    category: "cheatsheet",
    icon: "LineChart",
    content: `# Matplotlib Cheat Sheet

## Skeleton

\`\`\`python
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(x, y, label="series")
ax.set(title="Title", xlabel="x", ylabel="y")
ax.legend(); ax.grid(alpha=0.3)
fig.tight_layout(); plt.show()
\`\`\`

## Plot types

| Chart | Call |
| --- | --- |
| line | \`ax.plot(x, y)\` |
| scatter | \`ax.scatter(x, y, s=size, c=color, alpha=0.7)\` |
| bar / barh | \`ax.bar(labels, values)\` / \`ax.barh(...)\` |
| histogram | \`ax.hist(data, bins=30, density=True)\` |
| box | \`ax.boxplot([a, b], labels=["A", "B"])\` |
| pie | \`ax.pie(values, labels=labels, autopct="%1.0f%%")\` |
| area | \`ax.fill_between(x, y, alpha=0.4)\` |
| heatmap | \`ax.imshow(matrix, cmap="viridis"); fig.colorbar(...)\` |
| error bars | \`ax.errorbar(x, y, yerr=err, fmt="o")\` |

## Styling

Format strings: \`"r--"\`, \`"go-"\`, \`"b."\`. Keywords: \`color="tab:blue"\`, \`linestyle="--"\`, \`marker="o"\`, \`linewidth=2\`, \`alpha=0.6\`.

Themes: \`plt.style.use("ggplot")\`, \`"seaborn-v0_8"\`, \`"bmh"\`, \`"dark_background"\`

Ticks & limits: \`ax.set_xlim(0, 10)\`, \`ax.set_xticks(...)\`, \`ax.tick_params(rotation=45)\`, \`ax.set_yscale("log")\`

Annotations: \`ax.annotate("peak", xy=(x, y), xytext=(x+1, y+5), arrowprops=dict(arrowstyle="->"))\`, \`ax.axhline(0)\`, \`ax.axvline(x)\`, \`ax.text(x, y, "label")\`

Clean look: \`ax.spines[["top", "right"]].set_visible(False)\`

## Layout

\`fig, axes = plt.subplots(2, 2, sharex=True)\` -> \`axes[0, 1].plot(...)\` - \`fig.suptitle("...")\` - \`fig.tight_layout()\` - \`plt.subplot_mosaic([["a", "b"], ["c", "c"]])\`

## Save

\`fig.savefig("chart.png", dpi=200, bbox_inches="tight")\` - formats: png, svg, pdf`,
  },
];
