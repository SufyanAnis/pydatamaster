// Seed data for the blog pivot: nav categories, footer pages and additional articles.
// Also converts curriculum lessons into blog posts so every category has content.
import { db, nowIso, countRows } from "./db.js";

export const CATEGORIES: { slug: string; name: string; description: string; showInNav: boolean }[] = [
  { slug: "python", name: "Python", description: "Core Python language tutorials: syntax, data structures, functions and everyday idioms for data work.", showInNav: true },
  { slug: "basic-libraries", name: "Basic Libraries of Python", description: "Overviews and comparisons of the essential Python data libraries and how they fit together.", showInNav: true },
  { slug: "numpy", name: "NumPy", description: "Arrays, vectorized math, broadcasting and numerical computing with NumPy.", showInNav: true },
  { slug: "pandas", name: "Pandas", description: "DataFrames, cleaning, grouping, joining and everything tabular with Pandas.", showInNav: true },
  { slug: "matplotlib", name: "Matplotlib", description: "Charts, figures and publication-quality visualization with Matplotlib.", showInNav: true },
  { slug: "seaborn", name: "Seaborn", description: "Statistical visualization made easy: beautiful charts on top of Matplotlib.", showInNav: true },
  { slug: "scikit-learn", name: "Scikit-Learn", description: "Practical machine learning with Scikit-Learn: models, evaluation and workflows.", showInNav: false },
];

/** Old free-text post categories -> category slugs. */
const CATEGORY_REMAP: Record<string, string> = {
  News: "pandas",
  Tutorial: "numpy",
  Guide: "matplotlib",
  Career: "python",
};
const POST_REMAP: Record<string, string> = {
  "pandas-3-update": "pandas",
  "numpy-efficiency": "numpy",
  "pandas-one-liners": "pandas",
  "matplotlib-seaborn-plotly": "matplotlib",
  "data-science-roadmap-2026": "python",
};

export const PAGES: { slug: string; title: string; content: string }[] = [
  {
    slug: "about",
    title: "About",
    content: `PyDataMaster is an educational blog dedicated to sharing expert knowledge, practical insights, and up-to-date resources on Python-driven technologies and the modern data ecosystem. Founded on the belief that technology should be accessible, clear, and actionable, we strive to bridge the gap between theoretical learning and real-world application.

## Our Mission

Our mission is to empower learners, developers, and data enthusiasts with high-quality, structured educational content. We aim to:

- Share expert-level insights through well-researched, informative articles and tutorials
- Educate our audience on emerging technologies and trends powered by Python
- Help individuals and teams apply modern tools and techniques to solve real-world challenges

We believe in making complex topics understandable and practical - turning knowledge into value.

## What We Offer

- In-depth educational articles and tutorials
- Insights into Python-based frameworks, libraries, and tools
- Practical explanations of data science, analytics, and engineering concepts
- Content designed to support continuous learning, skill growth, and professional development

Every piece of content is crafted with accuracy, clarity, and usefulness in mind - ensuring our readers gain tangible takeaways.

## Our Values

- **Transparency** - We communicate openly and honestly about what we share.
- **Ethical Knowledge Sharing** - We prioritize integrity and responsible content creation.
- **Quality Over Quantity** - Every article is thoughtfully developed to deliver lasting value.
- **Continuous Learning** - We grow alongside our community, always staying curious and current.

> We are committed to providing reliable, original, and meaningful content - never misleading claims, false promises, or low-effort information.`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content: `_Last updated: August 2026_

## 1. Introduction

Welcome to PyDataMaster. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we handle information when you visit our website and tells you about your privacy rights.

## 2. Data We Collect

- **Technical data** - browser type, device type and pages visited, used in aggregate to understand what content is useful.
- **Usage data** - anonymous page-view counts that help us improve articles.
- **Contact data** - if you use the contact form, we receive the name, email address and message you choose to share. It is used only to reply to you.

We do not sell personal data.

## 3. Cookies and Advertising

This website may display advertisements (for example through Google AdSense). Advertising partners may use cookies to serve ads based on your prior visits to this or other websites. You can opt out of personalised advertising by visiting [Google Ads Settings](https://www.google.com/settings/ads).

## 4. Third-Party Links

Articles may link to external documentation and resources. We are not responsible for the privacy practices of external websites.

## 5. Contact Us

If you have questions about this policy, please reach out through our [contact page](/contact).`,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    content: `_Last updated: August 2026_

## 1. Agreement to Terms

By accessing this website, you agree to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.

## 2. Educational Disclaimer

The materials on this website are provided for educational purposes only. While we strive for accuracy, the software libraries covered (Python, NumPy, Pandas, Matplotlib, Seaborn and others) are subject to change. We make no warranties, expressed or implied, regarding the accuracy or reliability of the code examples provided.

## 3. Use License

Permission is granted to temporarily view the materials on this website for personal, non-commercial use only. Republishing articles without permission and attribution is not allowed.

## 4. Limitations

In no event shall this website or its authors be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this website.

## 5. Changes

We may revise these terms at any time without notice. By using this website you agree to be bound by the current version of these terms.`,
  },
  {
    slug: "dmca",
    title: "DMCA Policy",
    content: `_Last updated: August 2026_

This website respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (DMCA).

## Filing a DMCA Notice

If you believe that content on this website infringes your copyright, please send us a notice through the [contact page](/contact) that includes:

1. Identification of the copyrighted work you claim has been infringed.
2. The exact URL on this website where the allegedly infringing material is located.
3. Your full name, mailing address, and email address.
4. A statement that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.
5. A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the owner's behalf.
6. Your physical or electronic signature.

## Our Response

Upon receiving a valid DMCA notice, we will:

- Review the claim promptly and in good faith.
- Remove or disable access to the allegedly infringing material where appropriate.
- Notify the person who posted the material, where applicable.

## Counter-Notification

If you believe material you posted was removed by mistake or misidentification, you may submit a counter-notification containing your contact details, identification of the removed material and its previous location, a statement under penalty of perjury that you have a good-faith belief the removal was a mistake, and your consent to the jurisdiction of your local federal court.

## Repeat Infringers

We reserve the right to remove content and, where applicable, terminate accounts of repeat infringers.`,
  },
  {
    slug: "contact",
    title: "Contact Us",
    content: `We believe in respectful, thoughtful, and transparent communication. We value every message we receive and make a sincere effort to listen, understand, and respond in a helpful manner.

**You are welcome to contact us for:**

- Questions about our articles or learning resources
- Suggestions to improve our tutorials and guides
- Reporting inaccuracies, outdated information, or broken links
- Collaboration, partnership, or advertising enquiries
- General feedback about your experience on the website

We aim to respond to most inquiries within one to two business days. Information shared through the contact form is used only for communication purposes and is handled responsibly.`,
  },
];

interface SeedBlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  content: string;
}

export const EXTRA_POSTS: SeedBlogPost[] = [
  {
    id: "basic-libraries-overview",
    title: "The Essential Python Libraries for Data Work (and How They Fit Together)",
    excerpt: "NumPy, Pandas, Matplotlib and Seaborn each solve one problem extremely well. Here is what each one does and when to reach for it.",
    category: "basic-libraries",
    readTime: "7 min read",
    publishedAt: "2026-07-01T09:00:00.000Z",
    content: `If you are getting into data work with Python, four libraries come up in almost every project. They are not competitors - they form a stack, and each layer builds on the one below it.

## NumPy - the numeric foundation

NumPy provides the \`ndarray\`: a fast, memory-efficient array that lives in one contiguous block of memory. Every numeric operation - adding columns, computing means, matrix multiplication - ultimately runs through NumPy or something built on it.

\`\`\`python
import numpy as np
arr = np.array([1, 2, 3, 4])
print(arr * 10)        # [10 20 30 40] - no loop needed
\`\`\`

Reach for NumPy when you work with raw numbers: simulations, math, image data, anything shaped like a grid.

## Pandas - tables with superpowers

Pandas wraps NumPy arrays into **DataFrames**: tables with named columns and labeled rows. It is the tool for loading CSVs and Excel files, cleaning messy values, filtering rows, grouping and joining.

\`\`\`python
import pandas as pd
df = pd.read_csv("sales.csv")
print(df.groupby("region")["revenue"].sum())
\`\`\`

Reach for Pandas whenever your data looks like a spreadsheet.

## Matplotlib - the drawing engine

Matplotlib draws the actual charts: lines, bars, scatters, histograms, subplots. It is verbose but infinitely controllable, and nearly every other Python plotting tool is built on top of it.

\`\`\`python
import matplotlib.pyplot as plt
plt.plot([1, 2, 3], [10, 25, 18])
plt.title("My first chart")
plt.show()
\`\`\`

## Seaborn - statistics, beautifully

Seaborn sits on top of Matplotlib and understands DataFrames directly. One line gives you a polished statistical chart that would take twenty lines of raw Matplotlib.

\`\`\`python
import seaborn as sns
sns.boxplot(data=df, x="region", y="revenue")
\`\`\`

## How they fit together

| Layer | Library | Job |
| --- | --- | --- |
| 4 | Seaborn | statistical charts in one line |
| 3 | Matplotlib | drawing figures |
| 2 | Pandas | labeled tables |
| 1 | NumPy | fast arrays |

Learn them roughly in that order, bottom-up - each one makes the next easier to understand. Explore the dedicated sections of this site for hands-on tutorials on each library.`,
  },
  {
    id: "seaborn-getting-started",
    title: "Getting Started with Seaborn: Beautiful Charts in Five Lines",
    excerpt: "Seaborn turns a Pandas DataFrame into a polished statistical chart with a single function call. Here are the six plots you will use the most.",
    category: "seaborn",
    readTime: "8 min read",
    publishedAt: "2026-07-20T09:00:00.000Z",
    content: `Seaborn is a statistical visualization library built on top of Matplotlib. Its two superpowers: it accepts **Pandas DataFrames directly** (you name columns instead of passing arrays), and its defaults simply look good.

## Setup

\`\`\`python
import seaborn as sns
import matplotlib.pyplot as plt

sns.set_theme(style="whitegrid")     # sensible, clean defaults
tips = sns.load_dataset("tips")      # a practice DataFrame that ships with seaborn
\`\`\`

## The six charts you will actually use

**1. Scatter with automatic grouping**

\`\`\`python
sns.scatterplot(data=tips, x="total_bill", y="tip", hue="time")
\`\`\`

The \`hue\` argument colors points by a category - no manual loops over groups.

**2. Distribution of one variable**

\`\`\`python
sns.histplot(data=tips, x="total_bill", bins=25, kde=True)
\`\`\`

\`kde=True\` overlays a smooth density curve on the histogram.

**3. Compare groups with box plots**

\`\`\`python
sns.boxplot(data=tips, x="day", y="total_bill")
\`\`\`

**4. Count categories**

\`\`\`python
sns.countplot(data=tips, x="day")
\`\`\`

**5. Correlation heatmap**

\`\`\`python
sns.heatmap(tips.corr(numeric_only=True), annot=True, cmap="YlOrBr")
\`\`\`

**6. Everything at once**

\`\`\`python
sns.pairplot(tips, hue="time")
\`\`\`

\`pairplot\` draws a scatter for every pair of numeric columns - the fastest way to get a feel for a new dataset.

## Styling in one place

\`\`\`python
sns.set_theme(style="white", palette="YlOrBr", font_scale=1.1)
\`\`\`

Because Seaborn draws with Matplotlib, everything you know about Matplotlib still applies: \`plt.title()\`, \`plt.savefig()\` and subplots all work exactly the same. When Seaborn's shortcuts run out, drop down a level and adjust the figure by hand.

## When to use which library

- Exploring a DataFrame quickly -> **Seaborn**
- Pixel-perfect control for a report or paper -> **Matplotlib**
- Both, together -> perfectly normal, and how most professionals work.`,
  },
  {
    id: "python-lists-dictionaries",
    title: "Python Lists and Dictionaries: The Two Structures You Will Use Every Day",
    excerpt: "Before NumPy and Pandas, master the two built-in containers that every Python program leans on - with the idioms that make code readable.",
    category: "python",
    readTime: "8 min read",
    publishedAt: "2026-06-25T09:00:00.000Z",
    content: `Every dataset you will ever touch in Python starts life in one of two containers: the **list** (ordered items) and the **dictionary** (key-value pairs). Master these two and everything else - DataFrames included - will feel familiar.

## Lists: ordered collections

\`\`\`python
prices = [120, 95, 130, 80]

prices.append(150)        # add to the end
prices[0]                 # first item -> 120
prices[-1]                # last item  -> 150
prices[1:3]               # slice      -> [95, 130]
len(prices)               # 5
sorted(prices)            # new sorted list
\`\`\`

### List comprehensions

The most Pythonic pattern you will ever learn - build a new list from an old one in a single readable line:

\`\`\`python
discounted = [p * 0.9 for p in prices]
expensive  = [p for p in prices if p > 100]
\`\`\`

Compare that to the loop version - four lines, a temporary variable, and more places for bugs. If you later learn NumPy, you will recognize this as the same idea as vectorization.

## Dictionaries: labeled data

\`\`\`python
product = {"name": "Keyboard", "price": 45.0, "stock": 12}

product["price"]              # 45.0
product.get("color", "n/a")   # safe lookup with a default
product["stock"] -= 1         # update a value
"name" in product             # True
\`\`\`

### Looping over both keys and values

\`\`\`python
for key, value in product.items():
    print(f"{key}: {value}")
\`\`\`

### Dictionary comprehensions

\`\`\`python
stock_by_name = {p["name"]: p["stock"] for p in products}
\`\`\`

## Why this matters for data work

A Pandas DataFrame is conceptually a dictionary of columns, where each column behaves like a list:

\`\`\`python
import pandas as pd
df = pd.DataFrame({
    "name":  ["Keyboard", "Mouse", "Monitor"],
    "price": [45.0, 19.0, 220.0],
})
\`\`\`

That is a dict whose values are lists - exactly the structures above. Everything you practice with lists and dictionaries transfers directly to real data analysis.

## Three habits worth building

1. Prefer comprehensions to hand-written loops when creating collections.
2. Use \`.get()\` with a default instead of risking a \`KeyError\`.
3. Give collections plural names (\`prices\`), items singular names (\`price\`) - future-you will thank you.`,
  },
];

export interface BlogSeedReport {
  categories: number;
  pages: number;
  extraPosts: number;
  lessonPosts: number;
}

/** Idempotent: only inserts what does not exist yet. */
export function seedBlog(): BlogSeedReport {
  const report: BlogSeedReport = { categories: 0, pages: 0, extraPosts: 0, lessonPosts: 0 };
  const now = nowIso();

  if (countRows("categories") === 0) {
    const ins = db.prepare("INSERT INTO categories (slug, name, description, order_index, show_in_nav) VALUES (?, ?, ?, ?, ?)");
    CATEGORIES.forEach((c, i) => {
      ins.run(c.slug, c.name, c.description, i, c.showInNav ? 1 : 0);
      report.categories++;
    });
  }

  if (countRows("pages") === 0) {
    const ins = db.prepare("INSERT INTO pages (slug, title, content, updated_at) VALUES (?, ?, ?, ?)");
    for (const p of PAGES) {
      ins.run(p.slug, p.title, p.content, now);
      report.pages++;
    }
  }

  // Re-map legacy free-text post categories to category slugs.
  const remapById = db.prepare("UPDATE posts SET category = ? WHERE id = ? AND category NOT IN (SELECT slug FROM categories)");
  for (const [id, slug] of Object.entries(POST_REMAP)) remapById.run(slug, id);
  const remapByName = db.prepare("UPDATE posts SET category = ? WHERE category = ?");
  for (const [oldName, slug] of Object.entries(CATEGORY_REMAP)) remapByName.run(slug, oldName);

  const insPost = db.prepare(
    `INSERT OR IGNORE INTO posts (id, title, excerpt, content, category, cover_image, author, read_time, published, published_at, views, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '', 'PyData Team', ?, 1, ?, 0, ?, ?)`,
  );
  for (const p of EXTRA_POSTS) {
    const r = insPost.run(p.id, p.title, p.excerpt, p.content, p.category, p.readTime, p.publishedAt, now, now);
    if (Number(r.changes) > 0) report.extraPosts++;
  }

  // Convert curriculum lessons into blog articles under their library's category.
  const LIB_TO_CATEGORY: Record<string, string> = { NumPy: "numpy", Pandas: "pandas", Matplotlib: "matplotlib", "Scikit-Learn": "scikit-learn" };
  const lessons = db
    .prepare(
      `SELECT l.id, l.title, l.summary, l.content, l.code_example, l.duration_min, m.library, m.order_index AS m_order, l.order_index AS l_order
       FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.published = 1 ORDER BY m.order_index, l.order_index`,
    )
    .all() as Record<string, any>[];
  const base = new Date("2026-05-01T09:00:00.000Z").getTime();
  lessons.forEach((l, i) => {
    const category = LIB_TO_CATEGORY[String(l.library)] ?? "python";
    let content = String(l.content);
    if (l.code_example) content += `\n\n## Try it yourself\n\n\`\`\`python\n${l.code_example}\n\`\`\``;
    const publishedAt = new Date(base + i * 2 * 24 * 60 * 60 * 1000).toISOString();
    const r = insPost.run(String(l.id), String(l.title), String(l.summary), content, category, `${Math.max(3, Number(l.duration_min))} min read`, publishedAt, now, now);
    if (Number(r.changes) > 0) report.lessonPosts++;
  });

  return report;
}
