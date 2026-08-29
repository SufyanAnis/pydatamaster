import type { Module } from "./types.js";

type SeedLesson = Omit<Module["lessons"][number], "moduleId" | "orderIndex" | "published"> & { published?: boolean };
type SeedModule = Omit<Module, "lessons" | "orderIndex" | "published"> & { lessons: SeedLesson[]; published?: boolean };

export const CURRICULUM: SeedModule[] = [
  {
    id: "numpy-basics",
    title: "NumPy Fundamentals",
    description: "Learn the building blocks of numerical computing in Python: arrays, vectorized math, indexing, broadcasting and statistics.",
    library: "NumPy",
    icon: "Cpu",
    color: "orange",
    level: "Beginner",
    lessons: [
      {
        id: "np-arrays",
        title: "Creating Arrays",
        summary: "NumPy's ndarray is the core structure of scientific Python. It is faster and more memory-efficient than a Python list.",
        content: `## Why NumPy?

NumPy's \`ndarray\` is the core data structure of scientific Python. Unlike Python lists, NumPy arrays are **homogeneous** - every element has the same data type - and they live in one contiguous block of memory. That allows NumPy to hand whole arrays to optimized C code instead of looping in Python.

## Creating arrays

The most common way to build an array is \`np.array()\` from a list (or a list of lists for 2-D data). NumPy also ships factory functions for common shapes:

| Function | What it builds |
| --- | --- |
| \`np.zeros((2, 3))\` | 2x3 matrix of zeros |
| \`np.ones(5)\` | five ones |
| \`np.arange(0, 10, 2)\` | 0, 2, 4, 6, 8 |
| \`np.linspace(0, 1, 5)\` | 5 evenly spaced numbers from 0 to 1 |
| \`np.random.rand(3)\` | 3 random floats in [0, 1) |

## Inspecting an array

Every array knows its \`shape\` (a tuple of dimension sizes), its \`ndim\` (number of dimensions) and its \`dtype\` (element type). Get in the habit of printing \`arr.shape\` whenever a calculation surprises you - most NumPy bugs are shape bugs.

> **Tip:** \`arr.reshape(rows, cols)\` returns a *view* with a new shape without copying the data. Use \`-1\` for one dimension to let NumPy infer it.`,
        codeExample: `import numpy as np

# 1-D array from a list
arr = np.array([1, 2, 3, 4, 5])

# 2-D array (matrix) from nested lists
matrix = np.array([[1, 2, 3], [4, 5, 6]])

print("arr:", arr)
print("matrix:\\n", matrix)
print("shape:", matrix.shape, "| ndim:", matrix.ndim, "| dtype:", matrix.dtype)

# Handy constructors
print(np.zeros((2, 3)))
print(np.arange(0, 10, 2))
print(np.linspace(0, 1, 5))`,
        chartType: "none",
        xp: 50,
        durationMin: 7,
        quiz: [
          {
            question: "What is the main advantage of NumPy arrays over Python lists?",
            options: [
              "They can hold different data types",
              "They are faster and more memory efficient",
              "They are built-in to Python by default",
              "They are easier to spell",
            ],
            correctAnswer: 1,
            explanation:
              "NumPy arrays are stored in contiguous memory blocks and are homogeneous, so operations on them run in optimized C code far faster than Python loops.",
          },
          {
            question: "What does np.arange(0, 10, 2) return?",
            options: ["[0, 2, 4, 6, 8, 10]", "[0, 2, 4, 6, 8]", "[2, 4, 6, 8, 10]", "[0, 5, 10]"],
            correctAnswer: 1,
            explanation: "Like Python's range(), np.arange excludes the stop value: it produces 0, 2, 4, 6, 8.",
          },
          {
            question: "Which attribute tells you the dimensions of an array?",
            options: ["arr.size", "arr.len()", "arr.shape", "arr.dims"],
            correctAnswer: 2,
            explanation: "arr.shape returns a tuple such as (2, 3). arr.size is the total number of elements.",
          },
        ],
      },
      {
        id: "np-math",
        title: "Mathematical Operations",
        summary: "Perform element-wise operations without loops. This concept - vectorization - is the secret to NumPy's speed.",
        content: `## Vectorization

With plain Python you would loop over a list to add 5 to every number. With NumPy you write \`arr + 5\` and the whole array is updated in one **vectorized** operation. The loop still happens - but in compiled C, not in Python - which is typically 10-100x faster.

All arithmetic operators work element-wise: \`+\`, \`-\`, \`*\`, \`/\`, \`**\` and comparison operators like \`>\` (which return boolean arrays).

## Universal functions (ufuncs)

NumPy also ships hundreds of vectorized functions: \`np.sqrt\`, \`np.exp\`, \`np.log\`, \`np.sin\`, \`np.abs\`, \`np.round\`. They accept an array and return a new array of the same shape.

## Aggregations

Reductions collapse an array into a single value: \`arr.sum()\`, \`arr.mean()\`, \`arr.min()\`, \`arr.max()\`, \`arr.std()\`. On 2-D arrays pass \`axis=0\` (down the columns) or \`axis=1\` (across the rows).

## Matrix multiplication

\`*\` multiplies element-wise. For true matrix multiplication use the \`@\` operator or \`np.dot\`.`,
        codeExample: `import numpy as np

arr = np.array([10, 20, 30])

print(arr + 5)        # [15 25 35]  element-wise addition
print(arr * 2)        # [20 40 60]  element-wise multiplication
print(arr ** 2)       # [100 400 900]
print(arr > 15)       # [False  True  True]

print(np.sqrt(arr))   # ufunc applied to every element
print("mean:", arr.mean(), "| sum:", arr.sum())

m = np.array([[1, 2], [3, 4]])
print(m * m)          # element-wise
print(m @ m)          # matrix product`,
        chartType: "none",
        xp: 50,
        durationMin: 8,
        quiz: [
          {
            question: "What is the result of np.array([1, 2]) * 2?",
            options: ["[1, 2, 1, 2]", "[2, 4]", "[1, 4]", "Error"],
            correctAnswer: 1,
            explanation: "NumPy performs element-wise multiplication: each element is multiplied by 2.",
          },
          {
            question: "Which operator performs matrix multiplication on two 2-D arrays?",
            options: ["*", "@", "x", "**"],
            correctAnswer: 1,
            explanation: "The @ operator (or np.dot) computes the matrix product. * multiplies element-wise.",
          },
          {
            question: "arr.mean(axis=0) on a 2-D array computes the mean...",
            options: ["of the whole array", "of each row", "of each column", "of the diagonal"],
            correctAnswer: 2,
            explanation: "axis=0 collapses the rows, leaving one value per column - the column means.",
          },
        ],
      },
      {
        id: "np-indexing",
        title: "Indexing & Slicing",
        summary: "Select exactly the elements you need with integer indexing, slices, boolean masks and fancy indexing.",
        content: `## Basic indexing

Arrays are indexed from zero, just like lists, and negative indices count from the end. For 2-D arrays use a comma: \`matrix[row, col]\`.

## Slicing

The familiar \`start:stop:step\` syntax works on every axis: \`arr[1:4]\`, \`matrix[:, 0]\` (all rows, first column), \`matrix[0, :]\` (first row).

> **Important:** slices are *views*, not copies. Modifying a slice modifies the original array. Call \`.copy()\` when you need independent data.

## Boolean masks

Comparisons produce boolean arrays, and a boolean array can be used as an index. \`arr[arr > 20]\` returns only the elements greater than 20. Combine conditions with \`&\` (and), \`|\` (or) and \`~\` (not) - remember the parentheses.

## Fancy indexing

Pass a list of indices to pick elements in any order: \`arr[[0, 2, 4]]\`.`,
        codeExample: `import numpy as np

arr = np.array([5, 10, 15, 20, 25, 30])
matrix = np.arange(1, 10).reshape(3, 3)

print(arr[0], arr[-1])          # 5 30
print(arr[1:4])                 # [10 15 20]
print(matrix[1, 2])             # 6  (row 1, col 2)
print(matrix[:, 0])             # first column -> [1 4 7]

mask = arr > 15
print(mask)                     # [False False False  True  True  True]
print(arr[mask])                # [20 25 30]
print(arr[(arr > 5) & (arr < 25)])

print(arr[[0, 2, 4]])           # fancy indexing -> [ 5 15 25]`,
        chartType: "none",
        xp: 50,
        durationMin: 8,
        quiz: [
          {
            question: "What does matrix[:, 0] return for a 2-D array?",
            options: ["The first row", "The first column", "The first element", "A copy of the matrix"],
            correctAnswer: 1,
            explanation: "The colon selects every row and 0 selects the first column.",
          },
          {
            question: "Which expression keeps only the elements of arr that are greater than 20?",
            options: ["arr > 20", "arr[arr > 20]", "arr.filter(20)", "arr[>20]"],
            correctAnswer: 1,
            explanation: "arr > 20 creates a boolean mask; using it as an index selects the matching elements.",
          },
        ],
      },
      {
        id: "np-broadcasting",
        title: "Broadcasting & Shapes",
        summary: "Broadcasting lets NumPy combine arrays of different shapes without copying data - once you understand its rules.",
        content: `## What is broadcasting?

When you write \`arr + 5\` NumPy "stretches" the scalar 5 to match the shape of \`arr\`. The same idea extends to arrays: a (3, 1) column can be added to a (1, 4) row to produce a (3, 4) grid.

## The rules

Compare the shapes from the **trailing** dimension backwards. Two dimensions are compatible when:

1. they are equal, or
2. one of them is 1.

If every dimension is compatible, the result takes the larger size in each. Otherwise NumPy raises \`ValueError: operands could not be broadcast together\`.

## Practical uses

- Standardize every column of a dataset: \`(X - X.mean(axis=0)) / X.std(axis=0)\`
- Build a multiplication table with an outer product: \`np.arange(1, 6)[:, None] * np.arange(1, 6)\`

Use \`arr[:, np.newaxis]\` (or \`None\`) to add a length-1 axis when you need to line shapes up.`,
        codeExample: `import numpy as np

col = np.array([[1], [2], [3]])        # shape (3, 1)
row = np.array([10, 20, 30, 40])       # shape (4,)

grid = col + row                       # broadcast -> shape (3, 4)
print(grid)

# Standardize each column of a small dataset
X = np.array([[1.0, 200.0], [2.0, 300.0], [3.0, 400.0]])
Z = (X - X.mean(axis=0)) / X.std(axis=0)
print(np.round(Z, 2))

# Multiplication table with an outer product
n = np.arange(1, 6)
print(n[:, None] * n)`,
        chartType: "none",
        xp: 60,
        durationMin: 9,
        quiz: [
          {
            question: "Which pair of shapes can be broadcast together?",
            options: ["(3, 4) and (4,)", "(3, 4) and (3,)", "(2, 3) and (3, 2)", "(5,) and (4,)"],
            correctAnswer: 0,
            explanation: "Comparing trailing dimensions, 4 matches 4 and the missing dimension is treated as 1, so (3,4)+(4,) works.",
          },
          {
            question: "What is the shape of np.ones((3, 1)) + np.ones((1, 4))?",
            options: ["(3, 1)", "(1, 4)", "(3, 4)", "Error"],
            correctAnswer: 2,
            explanation: "Each dimension of size 1 is stretched to match the other operand, giving (3, 4).",
          },
        ],
      },
      {
        id: "np-stats",
        title: "Statistics & Random Numbers",
        summary: "Summarize data with NumPy's statistical functions and simulate it with the modern random Generator.",
        content: `## Descriptive statistics

NumPy gives you every summary statistic you need: \`np.mean\`, \`np.median\`, \`np.std\`, \`np.var\`, \`np.percentile\` and \`np.corrcoef\` for correlation. They all accept an \`axis\` argument for 2-D data.

## Random numbers

Prefer the modern **Generator** API: \`rng = np.random.default_rng(seed)\`. It is faster, statistically better and reproducible when you pass a seed.

- \`rng.normal(loc, scale, size)\` - Gaussian samples
- \`rng.integers(low, high, size)\` - random integers
- \`rng.choice(array, size)\` - sample from an array
- \`rng.shuffle(array)\` - shuffle in place

## Histograms

\`np.histogram(data, bins=10)\` returns counts and bin edges - the same computation Matplotlib performs behind \`plt.hist\`. The chart below shows the distribution of 1,000 normally distributed samples.`,
        codeExample: `import numpy as np

rng = np.random.default_rng(42)          # reproducible generator
data = rng.normal(loc=50, scale=10, size=1000)

print("mean  :", round(data.mean(), 2))
print("median:", round(np.median(data), 2))
print("std   :", round(data.std(), 2))
print("p95   :", round(np.percentile(data, 95), 2))

counts, edges = np.histogram(data, bins=8)
for c, lo, hi in zip(counts, edges[:-1], edges[1:]):
    print(f"{lo:6.1f} - {hi:6.1f}: {'#' * (c // 10)}")

x = rng.integers(0, 100, size=10)
print("random ints:", x)`,
        chartType: "hist",
        xp: 60,
        durationMin: 8,
        quiz: [
          {
            question: "Which call creates a reproducible random number generator?",
            options: ["np.random.seed()", "np.random.default_rng(42)", "np.random.Generator()", "np.random.rand(42)"],
            correctAnswer: 1,
            explanation: "default_rng(seed) returns a Generator whose output is identical each run for the same seed.",
          },
          {
            question: "np.percentile(data, 95) returns...",
            options: ["the top 95 values", "the value below which 95% of the data falls", "95% of the mean", "the 95th element"],
            correctAnswer: 1,
            explanation: "The 95th percentile is the threshold that 95% of observations fall below.",
          },
        ],
      },
    ],
  },
  {
    id: "pandas-intro",
    title: "Data Analysis with Pandas",
    description: "Master DataFrames and Series for powerful data manipulation: selecting, cleaning, grouping and merging real-world tables.",
    library: "Pandas",
    icon: "Table",
    color: "blue",
    level: "Beginner",
    lessons: [
      {
        id: "pd-dataframe",
        title: "The DataFrame",
        summary: "A DataFrame is a 2-dimensional labeled table with columns of potentially different types - think spreadsheet or SQL table.",
        content: `## Series and DataFrames

Pandas has two core structures:

- A **Series** is a 1-D labeled array (one column).
- A **DataFrame** is a 2-D table of Series that share an *index* (the row labels).

You can think of a DataFrame like a spreadsheet, a SQL table, or a dictionary of Series objects.

## Building a DataFrame

The quickest way is from a dictionary where each key becomes a column. In real projects you'll usually load data with \`pd.read_csv("file.csv")\`, \`pd.read_excel\` or \`pd.read_sql\`.

## First look at your data

| Method | Use it to |
| --- | --- |
| \`df.head()\` | peek at the first 5 rows |
| \`df.info()\` | see column types and missing values |
| \`df.describe()\` | get summary statistics for numeric columns |
| \`df.shape\` | check (rows, columns) |
| \`df.columns\` | list the column names |

The chart below visualizes the small workout table from the example - the same numbers, rendered as a bar chart.`,
        codeExample: `import pandas as pd

data = {
    "Day": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "Calories": [420, 380, 390, 450, 410],
    "Duration": [50, 40, 45, 60, 55],
}

df = pd.DataFrame(data)
print(df)
print()
print("shape:", df.shape)
print(df.describe())

# A single column is a Series
print(type(df["Calories"]))
print(df["Calories"].mean())`,
        chartType: "bar",
        xp: 50,
        durationMin: 7,
        quiz: [
          {
            question: "Which Pandas structure is 2-dimensional?",
            options: ["Series", "Array", "DataFrame", "List"],
            correctAnswer: 2,
            explanation: "A DataFrame has rows and columns; a Series is a single 1-dimensional column.",
          },
          {
            question: "Which method prints column data types and non-null counts?",
            options: ["df.describe()", "df.info()", "df.head()", "df.shape"],
            correctAnswer: 1,
            explanation: "df.info() lists every column with its dtype and the number of non-null values - your first stop for spotting missing data.",
          },
        ],
      },
      {
        id: "pd-select",
        title: "Selecting & Filtering",
        summary: "Pull out rows and columns by label with loc, by position with iloc, and by condition with boolean filters.",
        content: `## Selecting columns

\`df["col"]\` returns a Series. \`df[["a", "b"]]\` (a list inside the brackets) returns a DataFrame with just those columns.

## loc vs iloc

- \`df.loc[row_label, col_label]\` selects by **label**.
- \`df.iloc[row_pos, col_pos]\` selects by integer **position**.

Both accept slices and lists. \`df.loc[df["age"] > 30, ["name", "age"]]\` combines a row filter with a column selection in one step.

## Boolean filtering

Comparisons on a column create a boolean Series. Use it inside the brackets to keep matching rows. Combine conditions with \`&\`, \`|\` and \`~\`, wrapping each condition in parentheses.

For readability on complex conditions, \`df.query("age > 30 and city == 'Lahore'")\` reads like SQL.

## Sorting

\`df.sort_values("age", ascending=False)\` orders rows; \`df.nlargest(3, "salary")\` grabs the top 3 quickly.`,
        codeExample: `import pandas as pd

df = pd.DataFrame({
    "name": ["Ayesha", "Bilal", "Chen", "Dana", "Eli"],
    "age": [28, 35, 42, 31, 25],
    "city": ["Karachi", "Lahore", "Beijing", "Lahore", "Dubai"],
    "salary": [70, 95, 120, 88, 60],
})

print(df["name"])                           # Series
print(df[["name", "salary"]])               # DataFrame

print(df.loc[2, "city"])                    # label-based -> Beijing
print(df.iloc[0, 1])                        # position-based -> 28

over_30 = df[df["age"] > 30]
print(over_30)

lahore_rich = df[(df["city"] == "Lahore") & (df["salary"] > 90)]
print(lahore_rich)

print(df.sort_values("salary", ascending=False).head(3))`,
        chartType: "none",
        xp: 50,
        durationMin: 8,
        quiz: [
          {
            question: "Which accessor selects rows and columns by integer position?",
            options: ["df.loc", "df.iloc", "df.at", "df.ix"],
            correctAnswer: 1,
            explanation: "iloc is integer-location based; loc is label based.",
          },
          {
            question: "How do you combine two boolean conditions when filtering a DataFrame?",
            options: ["with 'and'", "with &&", "with & and parentheses", "with a comma"],
            correctAnswer: 2,
            explanation: "Pandas needs the element-wise & operator, and each condition must be wrapped in parentheses because of operator precedence.",
          },
        ],
      },
      {
        id: "pd-cleaning",
        title: "Data Cleaning",
        summary: "Handling missing values is a crucial pipeline step. Pandas provides dropna(), fillna() and friends to manage NaN values.",
        content: `## Missing data

Real datasets are messy. Pandas represents missing values as \`NaN\` (Not a Number). Find them with \`df.isna()\` and count them per column with \`df.isna().sum()\`.

## Two strategies

1. **Drop** - \`df.dropna()\` removes rows containing any NaN. Use \`subset=["col"]\` to only consider specific columns, or \`how="all"\` to drop rows that are entirely empty.
2. **Fill** - \`df.fillna(0)\` replaces NaN with a constant. Better options are usually the column mean or median: \`df["age"].fillna(df["age"].median())\`, or \`ffill()\` to carry the previous value forward in time series.

## Other cleaning tasks

- Remove duplicates: \`df.drop_duplicates()\`
- Fix types: \`df["price"] = df["price"].astype(float)\`, \`pd.to_datetime(df["date"])\`
- Rename columns: \`df.rename(columns={"old": "new"})\`
- Clean strings: \`df["city"].str.strip().str.title()\`

> Cleaning decisions change your analysis. Always record what you dropped or filled and why.`,
        codeExample: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "A": [1, 2, np.nan, 4],
    "B": [5, np.nan, np.nan, 8],
    "city": [" karachi", "Lahore ", "lahore", None],
})

print(df.isna().sum())          # missing values per column

clean_df = df.dropna()          # drop rows with any NaN
print(clean_df)

filled_df = df.fillna({"A": df["A"].mean(), "B": 0})
print(filled_df)

df["city"] = df["city"].str.strip().str.title()
print(df["city"])
print(df.drop_duplicates(subset=["city"]))`,
        chartType: "none",
        xp: 50,
        durationMin: 8,
        quiz: [
          {
            question: "Which method removes rows containing missing values?",
            options: ["fillna()", "remove_na()", "dropna()", "delete()"],
            correctAnswer: 2,
            explanation: "dropna() removes missing values, while fillna() replaces them with a specified value.",
          },
          {
            question: "What does df.isna().sum() return?",
            options: ["Total rows", "Number of missing values per column", "A boolean", "Duplicate rows"],
            correctAnswer: 1,
            explanation: "isna() gives a boolean frame; summing it counts True values (missing cells) for each column.",
          },
          {
            question: "Which is usually the best fill value for a skewed numeric column with outliers?",
            options: ["0", "The mean", "The median", "The maximum"],
            correctAnswer: 2,
            explanation: "The median is robust to outliers, so it does not get pulled toward extreme values the way the mean does.",
          },
        ],
      },
      {
        id: "pd-groupby",
        title: "GroupBy & Aggregation",
        summary: "Split-apply-combine: group rows by a key, apply an aggregation to each group, and combine the results.",
        content: `## Split - apply - combine

\`df.groupby("key")\` splits the table into one group per unique key. You then apply an aggregation (\`sum\`, \`mean\`, \`count\`, \`max\`...) and Pandas combines the results into a new table indexed by the key.

## Multiple aggregations

\`.agg()\` lets you compute several statistics at once, and name the output columns:

\`\`\`python
df.groupby("region").agg(
    total_sales=("sales", "sum"),
    avg_price=("price", "mean"),
    orders=("sales", "count"),
)
\`\`\`

## Pivot tables

\`pd.pivot_table(df, values="sales", index="region", columns="quarter", aggfunc="sum")\` reshapes grouped data into a matrix - perfect for reports and heatmaps.

## Transform

Sometimes you want the group statistic *broadcast back* to every row (for example to compute "sales minus the region average"). Use \`groupby(...)["sales"].transform("mean")\`.

The chart below shows total sales by region from the example.`,
        codeExample: `import pandas as pd

df = pd.DataFrame({
    "region": ["North", "South", "North", "East", "South", "East", "North"],
    "quarter": ["Q1", "Q1", "Q2", "Q1", "Q2", "Q2", "Q2"],
    "sales": [120, 90, 150, 70, 110, 95, 130],
})

print(df.groupby("region")["sales"].sum())
print()
print(df.groupby("region").agg(total=("sales", "sum"),
                               average=("sales", "mean"),
                               orders=("sales", "count")))
print()
print(pd.pivot_table(df, values="sales", index="region",
                     columns="quarter", aggfunc="sum", fill_value=0))

df["vs_region_avg"] = df["sales"] - df.groupby("region")["sales"].transform("mean")
print(df)`,
        chartType: "bar",
        xp: 60,
        durationMin: 9,
        quiz: [
          {
            question: "df.groupby('region')['sales'].sum() returns one value per...",
            options: ["row", "unique region", "column", "quarter"],
            correctAnswer: 1,
            explanation: "groupby collapses the frame so that each unique key (region) gets a single aggregated value.",
          },
          {
            question: "Which groupby method returns a result with the same length as the original DataFrame?",
            options: ["agg", "sum", "transform", "size"],
            correctAnswer: 2,
            explanation: "transform broadcasts each group's statistic back to every row in that group.",
          },
        ],
      },
      {
        id: "pd-merge",
        title: "Merging & Joining",
        summary: "Combine tables the way SQL does with merge(), stack them with concat(), and understand inner vs. left joins.",
        content: `## merge = SQL JOIN

\`pd.merge(left, right, on="key", how="inner")\` combines two DataFrames on a shared column.

| how | Keeps |
| --- | --- |
| \`inner\` | only keys present in both tables (default) |
| \`left\` | every row of the left table; unmatched right values become NaN |
| \`right\` | every row of the right table |
| \`outer\` | all keys from both tables |

When the key columns have different names use \`left_on\` / \`right_on\`. Pass \`validate="one_to_many"\` to catch accidental duplicate keys that would explode your row count.

## concat = stacking

\`pd.concat([df1, df2])\` stacks tables vertically (same columns). \`axis=1\` places them side by side.

## join

\`df1.join(df2)\` is a convenience wrapper that merges on the index.`,
        codeExample: `import pandas as pd

customers = pd.DataFrame({
    "customer_id": [1, 2, 3, 4],
    "name": ["Ayesha", "Bilal", "Chen", "Dana"],
})
orders = pd.DataFrame({
    "order_id": [101, 102, 103, 104],
    "customer_id": [1, 2, 2, 5],
    "amount": [250, 120, 80, 300],
})

inner = pd.merge(customers, orders, on="customer_id", how="inner")
print(inner)
print()

left = pd.merge(customers, orders, on="customer_id", how="left")
print(left)          # Chen and Dana have no orders -> NaN
print()

jan = pd.DataFrame({"month": ["Jan"], "revenue": [1000]})
feb = pd.DataFrame({"month": ["Feb"], "revenue": [1200]})
print(pd.concat([jan, feb], ignore_index=True))`,
        chartType: "none",
        xp: 60,
        durationMin: 8,
        quiz: [
          {
            question: "Which join keeps every row from the left table even without a match?",
            options: ["inner", "left", "cross", "semi"],
            correctAnswer: 1,
            explanation: "A left join preserves all left rows; unmatched right-hand columns are filled with NaN.",
          },
          {
            question: "Which function stacks two DataFrames with the same columns on top of each other?",
            options: ["pd.merge", "pd.concat", "df.join", "df.append_rows"],
            correctAnswer: 1,
            explanation: "pd.concat([a, b]) concatenates along the row axis by default.",
          },
        ],
      },
    ],
  },
  {
    id: "matplotlib-viz",
    title: "Visualization with Matplotlib",
    description: "Create static, animated, and interactive visualizations in Python - from your first line plot to polished multi-panel figures.",
    library: "Matplotlib",
    icon: "LineChart",
    color: "emerald",
    level: "Beginner",
    lessons: [
      {
        id: "plt-plot",
        title: "Basic Line Plot",
        summary: "plot() draws points and connects them with lines. It is the most versatile command in Matplotlib.",
        content: `## Your first plot

\`plt.plot(x, y)\` draws a line through the (x, y) points; \`plt.show()\` renders the figure. Every plot deserves a title and axis labels: \`plt.title\`, \`plt.xlabel\`, \`plt.ylabel\`.

## Styling the line

The third positional argument is a *format string*: \`"r--"\` means a red dashed line, \`"go-"\` green circles joined by a solid line. Or be explicit with keyword arguments: \`color="tab:blue"\`, \`linestyle="--"\`, \`marker="o"\`, \`linewidth=2\`.

## Multiple series

Call \`plt.plot\` several times before \`plt.show()\` and pass \`label="..."\` to each, then \`plt.legend()\` draws a legend. \`plt.grid(True, alpha=0.3)\` adds a subtle grid.

## Figure vs. axes

For anything beyond a quick look, use the object-oriented interface: \`fig, ax = plt.subplots()\` then \`ax.plot(...)\`, \`ax.set_title(...)\`. It scales cleanly to multi-panel figures (see the last lesson of this module).

The chart below reproduces the example data with an interactive renderer.`,
        codeExample: `import matplotlib.pyplot as plt
import numpy as np

x = np.array([0, 6, 12, 18])
y = np.array([0, 250, 100, 300])

plt.plot(x, y, "o-", color="tab:blue", linewidth=2, label="Signal")
plt.plot(x, y / 2, "s--", color="tab:orange", label="Half signal")

plt.title("A Basic Line Plot")
plt.xlabel("Hour")
plt.ylabel("Value")
plt.grid(True, alpha=0.3)
plt.legend()
plt.show()`,
        chartType: "line",
        xp: 50,
        durationMin: 7,
        quiz: [
          {
            question: "Which function creates a standard line chart?",
            options: ["plt.line()", "plt.chart()", "plt.plot()", "plt.draw()"],
            correctAnswer: 2,
            explanation: "plt.plot() is the standard function for drawing line charts in Matplotlib.",
          },
          {
            question: "What does the format string 'r--' produce?",
            options: ["Red dotted markers", "Red dashed line", "Right-aligned labels", "A red bar chart"],
            correctAnswer: 1,
            explanation: "'r' sets the color to red and '--' selects a dashed line style.",
          },
        ],
      },
      {
        id: "plt-scatter",
        title: "Scatter Plots",
        summary: "Scatter plots are essential for identifying relationships or correlations between two numeric variables.",
        content: `## When to use a scatter plot

A scatter plot places one marker per observation at (x, y) and never connects them. It is the go-to chart for asking "as *x* increases, what happens to *y*?" - the visual counterpart of a correlation coefficient.

## Encoding more dimensions

\`plt.scatter\` can encode extra variables:

- \`s=\` marker size (a bubble chart)
- \`c=\` marker color, with \`cmap="viridis"\` and \`plt.colorbar()\` for a continuous scale
- \`alpha=\` transparency to reveal dense clusters

## Adding a trend line

Fit a straight line with \`np.polyfit(x, y, 1)\` and draw it with \`plt.plot\` to show the direction of the relationship. Report the Pearson correlation with \`np.corrcoef(x, y)[0, 1]\`.

The interactive chart below shows the example observations.`,
        codeExample: `import matplotlib.pyplot as plt
import numpy as np

x = np.array([5, 7, 8, 7, 2, 17, 2, 9, 4, 11])
y = np.array([99, 86, 87, 88, 111, 86, 103, 87, 94, 78])

plt.scatter(x, y, s=80, c=y, cmap="viridis", alpha=0.85, edgecolor="k")
plt.colorbar(label="y value")

# Trend line
slope, intercept = np.polyfit(x, y, 1)
xs = np.linspace(x.min(), x.max(), 50)
plt.plot(xs, slope * xs + intercept, "r--", label=f"trend (r={np.corrcoef(x, y)[0,1]:.2f})")

plt.title("Age of car vs. speed")
plt.xlabel("Age (years)")
plt.ylabel("Speed (km/h)")
plt.legend()
plt.show()`,
        chartType: "scatter",
        xp: 50,
        durationMin: 7,
        quiz: [
          {
            question: "What are scatter plots best used for?",
            options: [
              "Showing parts of a whole",
              "Identifying relationships between two variables",
              "Tracking changes over time",
              "Comparing categorical data",
            ],
            correctAnswer: 1,
            explanation: "Scatter plots visualize the correlation or relationship between two numerical variables.",
          },
          {
            question: "Which argument of plt.scatter controls marker size?",
            options: ["size=", "s=", "marker=", "lw="],
            correctAnswer: 1,
            explanation: "s= sets the marker area; c= sets the color.",
          },
        ],
      },
      {
        id: "plt-bar",
        title: "Bar Charts",
        summary: "Compare categories with vertical or horizontal bars, group them side by side, or stack them.",
        content: `## Comparing categories

\`plt.bar(categories, values)\` draws one bar per category. Use \`plt.barh\` for horizontal bars - they leave room for long labels.

## Grouped bars

To compare two series per category, shift each group of bars by a fraction of the bar width:

\`\`\`python
x = np.arange(len(labels))
plt.bar(x - 0.2, series_a, width=0.4, label="A")
plt.bar(x + 0.2, series_b, width=0.4, label="B")
plt.xticks(x, labels)
\`\`\`

## Stacked bars

Pass \`bottom=series_a\` to the second call to stack series B on top of series A.

## Annotating values

\`ax.bar_label(bars)\` (Matplotlib 3.4+) prints the value above each bar - readers love it.

The chart below groups the example's two series side by side.`,
        codeExample: `import matplotlib.pyplot as plt
import numpy as np

days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
calories = [420, 380, 390, 450, 410]
duration = [50, 40, 45, 60, 55]

x = np.arange(len(days))
fig, ax = plt.subplots(figsize=(7, 4))

b1 = ax.bar(x - 0.2, calories, width=0.4, label="Calories", color="#8b5cf6")
b2 = ax.bar(x + 0.2, [d * 6 for d in duration], width=0.4, label="Duration x6", color="#3b82f6")

ax.bar_label(b1, padding=2, fontsize=8)
ax.set_xticks(x, days)
ax.set_title("Workouts this week")
ax.set_ylabel("Value")
ax.legend()
plt.tight_layout()
plt.show()`,
        chartType: "bar",
        xp: 50,
        durationMin: 7,
        quiz: [
          {
            question: "How do you draw horizontal bars?",
            options: ["plt.bar(orientation='h')", "plt.barh()", "plt.hbar()", "plt.bar().rotate()"],
            correctAnswer: 1,
            explanation: "plt.barh() is the horizontal counterpart of plt.bar().",
          },
          {
            question: "Which argument stacks a second series on top of the first?",
            options: ["stack=True", "bottom=", "base=", "offset="],
            correctAnswer: 1,
            explanation: "bottom= tells Matplotlib where each bar of the second series should start.",
          },
        ],
      },
      {
        id: "plt-hist",
        title: "Histograms & Distributions",
        summary: "Histograms reveal the shape of a distribution - its center, spread, skew and outliers - in one glance.",
        content: `## What a histogram shows

A histogram divides the range of a numeric variable into **bins** and counts how many observations fall into each. Tall bars mean common values; the overall silhouette tells you whether the data is symmetric, skewed, or has several peaks.

## Choosing bins

\`plt.hist(data, bins=30)\` - too few bins hide detail, too many add noise. Try \`bins="auto"\` or the square root of the sample size as a starting point.

## Overlaying distributions

Draw two histograms with \`alpha=0.5\` to compare groups. Set \`density=True\` to normalize the areas so groups of different sizes are comparable.

## Box plots

\`plt.boxplot\` summarizes a distribution with its median, quartiles and outliers - handy when you need to compare many groups at once.

The interactive chart below bins 1,000 normally distributed samples.`,
        codeExample: `import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(7)
group_a = rng.normal(50, 10, 1000)
group_b = rng.normal(65, 8, 800)

plt.hist(group_a, bins=30, alpha=0.6, label="Group A", color="#3b82f6")
plt.hist(group_b, bins=30, alpha=0.6, label="Group B", color="#f59e0b")

plt.axvline(group_a.mean(), color="#1d4ed8", linestyle="--")
plt.axvline(group_b.mean(), color="#b45309", linestyle="--")

plt.title("Distribution of scores")
plt.xlabel("Score")
plt.ylabel("Count")
plt.legend()
plt.show()`,
        chartType: "hist",
        xp: 50,
        durationMin: 7,
        quiz: [
          {
            question: "In a histogram, what does the height of a bar represent?",
            options: ["The value of one observation", "The number of observations in that bin", "The mean of the bin", "The bin width"],
            correctAnswer: 1,
            explanation: "Each bar counts how many observations fall inside the bin's value range.",
          },
          {
            question: "Why set density=True when overlaying histograms of different sample sizes?",
            options: ["It makes the bars thinner", "It normalizes the areas so shapes are comparable", "It sorts the data", "It removes outliers"],
            correctAnswer: 1,
            explanation: "density=True scales each histogram so its total area is 1, removing the effect of sample size.",
          },
        ],
      },
      {
        id: "plt-subplots",
        title: "Subplots & Styling",
        summary: "Build multi-panel figures with the object-oriented API and apply consistent, publication-quality styling.",
        content: `## The object-oriented API

\`fig, axes = plt.subplots(nrows, ncols, figsize=(w, h))\` returns a Figure and an array of Axes. Each Axes is an independent plotting area with its own \`plot\`, \`set_title\`, \`set_xlabel\` methods. Use \`sharex=True\` / \`sharey=True\` to align scales across panels.

## Laying out panels

\`fig.tight_layout()\` removes overlapping labels; \`fig.suptitle\` adds an overall title. For irregular grids use \`plt.subplot_mosaic\`.

## Styling

- \`plt.style.use("ggplot")\` (or \`"seaborn-v0_8"\`, \`"bmh"\`) changes the entire look
- \`ax.spines["top"].set_visible(False)\` removes chart junk
- Set consistent colors from the \`tab10\` palette or your brand palette

## Saving

\`fig.savefig("figure.png", dpi=200, bbox_inches="tight")\` exports a crisp image for reports and slides.`,
        codeExample: `import matplotlib.pyplot as plt
import numpy as np

plt.style.use("ggplot")
x = np.linspace(0, 2 * np.pi, 200)

fig, axes = plt.subplots(2, 2, figsize=(9, 6), sharex=True)
axes[0, 0].plot(x, np.sin(x));      axes[0, 0].set_title("sin")
axes[0, 1].plot(x, np.cos(x), "g"); axes[0, 1].set_title("cos")
axes[1, 0].plot(x, np.sin(2 * x));  axes[1, 0].set_title("sin(2x)")
axes[1, 1].fill_between(x, np.sin(x), alpha=0.4); axes[1, 1].set_title("area")

for ax in axes.flat:
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

fig.suptitle("Trigonometric functions", fontsize=14)
fig.tight_layout()
plt.show()`,
        chartType: "none",
        xp: 60,
        durationMin: 9,
        quiz: [
          {
            question: "What does plt.subplots(2, 2) return?",
            options: ["Four figures", "A figure and a 2x2 array of axes", "A list of four lines", "Two figures"],
            correctAnswer: 1,
            explanation: "subplots returns one Figure plus an array of Axes objects arranged in the requested grid.",
          },
          {
            question: "Which call fixes overlapping titles and labels in a multi-panel figure?",
            options: ["fig.tight_layout()", "plt.fix()", "fig.autoscale()", "plt.spacing(1)"],
            correctAnswer: 0,
            explanation: "tight_layout automatically adjusts subplot spacing to prevent overlap.",
          },
        ],
      },
    ],
  },
  {
    id: "sklearn-intro",
    title: "Machine Learning with Scikit-Learn",
    description: "Take the leap from analysis to prediction: split data, train regression and classification models, and evaluate them honestly.",
    library: "Scikit-Learn",
    icon: "Brain",
    color: "amber",
    level: "Intermediate",
    lessons: [
      {
        id: "sk-workflow",
        title: "The ML Workflow & Train/Test Split",
        summary: "Every supervised model follows the same recipe: features, target, split, fit, predict, evaluate.",
        content: `## The recipe

1. **Features (X)** - a 2-D array of inputs, one row per example.
2. **Target (y)** - what you want to predict.
3. **Split** the data into a training set and a held-out test set.
4. **Fit** a model on the training set.
5. **Predict** on the test set and **evaluate**.

## Why split?

A model that memorizes the training data will look perfect on it and fail on new data. \`train_test_split(X, y, test_size=0.2, random_state=42)\` holds back 20% of the rows so you can measure how the model performs on data it has never seen.

## The estimator API

Every scikit-learn model exposes the same methods - \`fit(X, y)\`, \`predict(X)\` and often \`score(X, y)\` - so swapping algorithms is a one-line change.

## Scaling

Many algorithms assume features are on similar scales. \`StandardScaler\` standardizes each column; fit it on the training data only, then transform both sets.`,
        codeExample: `import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(0)
X = rng.normal(size=(100, 3)) * [1, 100, 0.01]   # three features on wildly different scales
y = X[:, 0] * 2 + rng.normal(scale=0.1, size=100)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print("train rows:", X_train.shape[0], "| test rows:", X_test.shape[0])

scaler = StandardScaler().fit(X_train)          # learn mean/std on TRAIN only
X_train_s = scaler.transform(X_train)
X_test_s = scaler.transform(X_test)

print("scaled train means:", np.round(X_train_s.mean(axis=0), 3))
print("scaled train stds :", np.round(X_train_s.std(axis=0), 3))`,
        chartType: "none",
        xp: 70,
        durationMin: 9,
        quiz: [
          {
            question: "Why do we hold back a test set?",
            options: ["To train faster", "To measure performance on unseen data", "To remove outliers", "To balance classes"],
            correctAnswer: 1,
            explanation: "The test set estimates how the model will generalize; evaluating on training data is misleadingly optimistic.",
          },
          {
            question: "On which data should StandardScaler be fitted?",
            options: ["The whole dataset", "The test set", "The training set only", "It does not matter"],
            correctAnswer: 2,
            explanation: "Fitting on the full data leaks information from the test set into training (data leakage).",
          },
        ],
      },
      {
        id: "sk-regression",
        title: "Linear Regression",
        summary: "Predict a continuous number by fitting a straight line - the simplest, most interpretable model there is.",
        content: `## The model

Linear regression finds coefficients \`w\` and an intercept \`b\` so that \`y ~ w * x + b\` is as close as possible to the data, minimizing the squared errors.

## Fit and inspect

\`\`\`python
model = LinearRegression().fit(X_train, y_train)
model.coef_, model.intercept_
\`\`\`

The coefficients are interpretable: "each additional hour of study adds about 5 points".

## Evaluate

- **R^2** (\`model.score\`) - the fraction of variance explained; 1.0 is perfect.
- **MAE** - mean absolute error, in the units of the target.
- **RMSE** - root mean squared error, penalizes big misses.

## Beyond straight lines

Regularized variants \`Ridge\` and \`Lasso\` shrink coefficients to reduce overfitting; \`PolynomialFeatures\` lets a linear model fit curves. The scatter chart below shows the kind of relationship a regression line captures.`,
        codeExample: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

rng = np.random.default_rng(1)
hours = rng.uniform(0, 10, 80).reshape(-1, 1)          # feature matrix (80, 1)
score = 40 + 5 * hours[:, 0] + rng.normal(0, 4, 80)    # target

X_train, X_test, y_train, y_test = train_test_split(hours, score, test_size=0.25, random_state=0)

model = LinearRegression().fit(X_train, y_train)
print("slope:", round(model.coef_[0], 2), "| intercept:", round(model.intercept_, 2))

pred = model.predict(X_test)
print("R^2 :", round(r2_score(y_test, pred), 3))
print("MAE :", round(mean_absolute_error(y_test, pred), 2))
print("7 hours of study ->", round(model.predict([[7]])[0], 1), "points")`,
        chartType: "scatter",
        xp: 70,
        durationMin: 9,
        quiz: [
          {
            question: "What does an R^2 score of 0.9 mean?",
            options: ["90% of predictions are correct", "The model explains 90% of the variance in the target", "The error is 0.9", "90% of rows were used"],
            correctAnswer: 1,
            explanation: "R^2 measures the proportion of target variance captured by the model.",
          },
          {
            question: "Which attribute holds the learned slope(s) of a fitted LinearRegression?",
            options: ["model.slope_", "model.weights", "model.coef_", "model.params"],
            correctAnswer: 2,
            explanation: "coef_ stores one coefficient per feature; intercept_ stores the bias term.",
          },
        ],
      },
      {
        id: "sk-classification",
        title: "Classification",
        summary: "Predict categories - spam or not, churn or stay - with logistic regression and tree-based models.",
        content: `## Regression vs. classification

Regression predicts a number; classification predicts a **class label**. Despite its name, \`LogisticRegression\` is a classifier: it outputs the probability that an example belongs to the positive class and thresholds it at 0.5.

## Fitting a classifier

The workflow is identical to regression: split, \`fit\`, \`predict\`. Use \`predict_proba\` when you need probabilities (for ranking or custom thresholds).

## Other algorithms

- \`DecisionTreeClassifier\` - interpretable if/else rules
- \`RandomForestClassifier\` - an ensemble of trees; strong default choice for tabular data
- \`SVC\` - support vector machine; great on small, clean datasets
- \`KNeighborsClassifier\` - predicts by majority vote of the nearest examples

## Class imbalance

If 95% of rows are "no churn", a model that always says "no" is 95% accurate and useless. Pass \`class_weight="balanced"\` and look at precision/recall (next lesson).`,
        codeExample: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=300, n_features=4, n_informative=3,
                           n_redundant=0, random_state=3)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=3)

log_reg = LogisticRegression().fit(X_train, y_train)
forest = RandomForestClassifier(n_estimators=100, random_state=3).fit(X_train, y_train)

print("logistic accuracy:", round(log_reg.score(X_test, y_test), 3))
print("forest accuracy  :", round(forest.score(X_test, y_test), 3))

probs = log_reg.predict_proba(X_test[:3])
print("first 3 probabilities [class0, class1]:\\n", np.round(probs, 3))
print("predicted labels:", log_reg.predict(X_test[:3]))`,
        chartType: "none",
        xp: 70,
        durationMin: 9,
        quiz: [
          {
            question: "LogisticRegression is used for...",
            options: ["Predicting continuous values", "Classification", "Clustering", "Dimensionality reduction"],
            correctAnswer: 1,
            explanation: "Despite the name, logistic regression models the probability of a class and is a classifier.",
          },
          {
            question: "Which method returns class probabilities instead of labels?",
            options: ["predict()", "score()", "predict_proba()", "transform()"],
            correctAnswer: 2,
            explanation: "predict_proba returns one probability per class for each row.",
          },
        ],
      },
      {
        id: "sk-evaluation",
        title: "Evaluating Models",
        summary: "Accuracy is not enough. Learn confusion matrices, precision, recall, F1, ROC-AUC and cross-validation.",
        content: `## The confusion matrix

For a binary classifier, four counts tell the whole story: true positives, false positives, true negatives and false negatives. \`confusion_matrix(y_true, y_pred)\` returns them as a 2x2 table.

## Precision, recall, F1

- **Precision** - of the rows predicted positive, how many really are? (Avoid false alarms.)
- **Recall** - of the truly positive rows, how many did we catch? (Avoid misses.)
- **F1** - the harmonic mean of the two.

\`classification_report\` prints all three per class.

## ROC-AUC

\`roc_auc_score\` measures how well the model ranks positives above negatives across every threshold; 0.5 is random, 1.0 is perfect.

## Cross-validation

A single train/test split can be lucky or unlucky. \`cross_val_score(model, X, y, cv=5)\` trains and tests five times on different folds and reports the mean and spread - a far more reliable estimate.

## Regression metrics

For regression use \`mean_squared_error\`, \`mean_absolute_error\` and \`r2_score\` from \`sklearn.metrics\`.`,
        codeExample: `from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (confusion_matrix, classification_report,
                             roc_auc_score, accuracy_score)

X, y = make_classification(n_samples=400, n_features=6, weights=[0.8, 0.2], random_state=5)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=5)

model = LogisticRegression(class_weight="balanced", max_iter=500).fit(X_train, y_train)
pred = model.predict(X_test)

print("accuracy:", round(accuracy_score(y_test, pred), 3))
print("confusion matrix:\\n", confusion_matrix(y_test, pred))
print(classification_report(y_test, pred, digits=3))
print("ROC-AUC:", round(roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]), 3))

scores = cross_val_score(model, X, y, cv=5, scoring="f1")
print("5-fold F1: %.3f +/- %.3f" % (scores.mean(), scores.std()))`,
        chartType: "none",
        xp: 80,
        durationMin: 10,
        quiz: [
          {
            question: "Recall answers which question?",
            options: [
              "Of the predicted positives, how many were right?",
              "Of the actual positives, how many did we find?",
              "How many predictions were made?",
              "How fast is the model?",
            ],
            correctAnswer: 1,
            explanation: "Recall = TP / (TP + FN): the share of real positives the model caught.",
          },
          {
            question: "Why use cross-validation instead of one train/test split?",
            options: ["It is faster", "It gives a more reliable performance estimate", "It needs less data", "It removes the need for a test set"],
            correctAnswer: 1,
            explanation: "Averaging over several folds reduces the luck of a single split and shows the variance of the estimate.",
          },
          {
            question: "A ROC-AUC of 0.5 indicates...",
            options: ["A perfect model", "Random ranking", "50% accuracy", "An overfitted model"],
            correctAnswer: 1,
            explanation: "AUC 0.5 means the model ranks positives above negatives no better than chance.",
          },
        ],
      },
    ],
  },
];
