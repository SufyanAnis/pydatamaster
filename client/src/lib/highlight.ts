// Dependency-free Python syntax highlighter. Produces HTML with `tok-*` classes (styled in index.css).

const KEYWORDS =
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(
    " ",
  );
const BUILTINS =
  "print len range enumerate zip map filter sorted reversed sum min max abs round int float str list dict set tuple bool type isinstance open input super object iter next any all format repr getattr setattr hasattr id hash".split(
    " ",
  );

const kwSet = new Set(KEYWORDS);
const biSet = new Set(BUILTINS);

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const TOKEN_RE =
  /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?''')|([rbfu]{0,2}"(?:\\.|[^"\\\n])*"|[rbfu]{0,2}'(?:\\.|[^'\\\n])*')|(@[A-Za-z_][\w.]*)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?j?\b)|(\b[A-Za-z_]\w*\b)/g;

export function highlightPython(code: string): string {
  let out = "";
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    const [full, comment, triple, str, decorator, num, ident] = m;
    if (comment) out += `<span class="tok-c">${escapeHtml(comment)}</span>`;
    else if (triple || str) out += `<span class="tok-s">${escapeHtml(full)}</span>`;
    else if (decorator) out += `<span class="tok-d">${escapeHtml(decorator)}</span>`;
    else if (num) out += `<span class="tok-n">${escapeHtml(num)}</span>`;
    else if (ident) {
      if (kwSet.has(ident)) out += `<span class="tok-k">${ident}</span>`;
      else if (biSet.has(ident)) out += `<span class="tok-b">${ident}</span>`;
      else {
        // function call?
        const after = code.slice(m.index + full.length, m.index + full.length + 1);
        out += after === "(" ? `<span class="tok-f">${ident}</span>` : ident;
      }
    } else out += escapeHtml(full);
    last = m.index + full.length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}

export function highlight(code: string, lang?: string): string {
  const l = (lang || "").toLowerCase();
  if (!l || l === "python" || l === "py" || l === "python3") return highlightPython(code);
  return escapeHtml(code);
}
