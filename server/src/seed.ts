import "dotenv/config";
import { q, migrate, nowIso, countRows } from "./db.js";
import { hashPassword, pickAvatarColor } from "./auth.js";
import { CURRICULUM } from "./seed-curriculum.js";
import { POSTS, PIPELINE, RESOURCES } from "./seed-content.js";
import { seedBlog } from "./seed-blog.js";

export interface SeedReport {
  modules: number;
  lessons: number;
  posts: number;
  pipeline: number;
  resources: number;
  categories: number;
  pages: number;
  blogPosts: number;
  adminCreated: boolean;
  adminEmail: string;
}

/**
 * Populates empty tables with the default content and guarantees an admin account exists.
 * Safe to run repeatedly: existing content is never overwritten.
 */
export async function seedDatabase(opts: { force?: boolean } = {}): Promise<SeedReport> {
  await migrate();
  const now = nowIso();
  const report: SeedReport = { modules: 0, lessons: 0, posts: 0, pipeline: 0, resources: 0, categories: 0, pages: 0, blogPosts: 0, adminCreated: false, adminEmail: "" };

  if (opts.force) {
    await q.exec("DELETE FROM quiz_questions; DELETE FROM lessons; DELETE FROM modules; DELETE FROM posts; DELETE FROM pipeline_steps; DELETE FROM resources;");
  }

  // ---- Curriculum -------------------------------------------------------
  if ((await countRows("modules")) === 0) {
    let mi = 0;
    for (const m of CURRICULUM) {
      await q.run(
        `INSERT INTO modules (id, title, description, library, icon, color, level, order_index, published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.title, m.description, m.library, m.icon, m.color, m.level, mi++, m.published === false ? 0 : 1, now, now],
      );
      report.modules++;
      let li = 0;
      for (const l of m.lessons) {
        await q.run(
          `INSERT INTO lessons (id, module_id, title, summary, content, code_example, chart_type, xp, duration_min, order_index, published, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [l.id, m.id, l.title, l.summary, l.content, l.codeExample, l.chartType, l.xp, l.durationMin, li++, l.published === false ? 0 : 1, now, now],
        );
        report.lessons++;
        let qi = 0;
        for (const quiz of l.quiz) {
          await q.run(`INSERT INTO quiz_questions (lesson_id, question, options, correct_index, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?)`, [
            l.id,
            quiz.question,
            JSON.stringify(quiz.options),
            quiz.correctAnswer,
            quiz.explanation,
            qi++,
          ]);
        }
      }
    }
  }

  // ---- Blog -------------------------------------------------------------
  if ((await countRows("posts")) === 0) {
    for (const p of POSTS) {
      await q.run(
        `INSERT INTO posts (id, title, excerpt, content, category, author, read_time, published, published_at, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.title, p.excerpt, p.content, p.category, p.author, p.readTime, p.published === false ? 0 : 1, p.publishedAt, 0, now, now],
      );
      report.posts++;
    }
  }

  // ---- Pipeline ---------------------------------------------------------
  if ((await countRows("pipeline_steps")) === 0) {
    for (const s of PIPELINE) {
      await q.run(
        `INSERT INTO pipeline_steps (id, number, title, subtitle, purpose, key_concepts, core_label, core_items, scope, outcome, phase, group_name, color, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.number, s.title, s.subtitle, s.purpose, JSON.stringify(s.keyConcepts), s.coreLabel, JSON.stringify(s.coreItems), s.scope, s.outcome, s.phase, s.group, s.color, s.icon],
      );
      report.pipeline++;
    }
  }

  // ---- Resources --------------------------------------------------------
  if ((await countRows("resources")) === 0) {
    let i = 0;
    for (const r of RESOURCES) {
      await q.run(`INSERT INTO resources (name, url, description, category, icon, content, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        r.name,
        r.url,
        r.description,
        r.category,
        r.icon,
        r.content ?? "",
        i++,
      ]);
      report.resources++;
    }
  }

  // ---- Blog (categories, pages, lesson-to-article conversion) -----------
  const blog = await seedBlog();
  report.categories = blog.categories;
  report.pages = blog.pages;
  report.blogPosts = blog.extraPosts + blog.lessonPosts;

  // ---- Admin account ----------------------------------------------------
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@pydatamaster.io").trim();
  report.adminEmail = adminEmail;
  if ((await countRows("users", "WHERE role = 'admin'")) === 0) {
    const password = process.env.ADMIN_PASSWORD || "Admin@12345";
    const name = process.env.ADMIN_NAME || "Site Admin";
    const existing = await q.get<{ id: number }>("SELECT id FROM users WHERE lower(email) = lower(?)", [adminEmail]);
    if (existing) {
      await q.run("UPDATE users SET role = 'admin' WHERE id = ?", [existing.id]);
    } else {
      await q.run(
        `INSERT INTO users (name, email, password_hash, role, goal, level, status, avatar_color, created_at)
         VALUES (?, ?, ?, 'admin', 'Data Scientist', 'Advanced', 'active', ?, ?)`,
        [name, adminEmail, await hashPassword(password), pickAvatarColor(adminEmail), now],
      );
    }
    report.adminCreated = true;
  }

  return report;
}

// Run directly: `npm run seed` (add --force to reset content tables)
const isDirect = process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1]);
if (isDirect) {
  const force = process.argv.includes("--force");
  seedDatabase({ force })
    .then((r) => {
      console.log("Seed complete:", r);
      if (r.adminCreated) console.log(`Admin login -> ${r.adminEmail} / ${process.env.ADMIN_PASSWORD || "Admin@12345"}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
