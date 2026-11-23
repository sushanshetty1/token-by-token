/**
 * A small Python highlighter. Enough for nanoGPT/micrograd-style code, with
 * no dependencies and colors taken from the design tokens.
 */

export type TokKind = "kw" | "builtin" | "str" | "num" | "com" | "def" | "deco" | "self" | "op" | "plain";

export interface Tok {
  t: string;
  k: TokKind;
}

const KEYWORDS = new Set(
  "def class return if elif else for while in import from as with not and or is None True False lambda yield pass break continue raise try except finally assert global nonlocal del".split(
    " ",
  ),
);
const BUILTINS = new Set(
  "print range len super int float str list dict tuple set zip enumerate sum max min abs isinstance sorted reversed open any all map filter torch nn F math".split(
    " ",
  ),
);

const RE =
  /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfu]{0,2}"(?:\\.|[^"\\])*"|[rbfu]{0,2}'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|(@[\w.]+)|([A-Za-z_]\w*)|([-+*/%=<>!&|^~@:.,()[\]{}]+)|(\s+)/gm;

export function highlightPython(source: string): Tok[][] {
  const lines = source.replace(/\t/g, "    ").split("\n");
  let inTriple: string | null = null;
  return lines.map((line) => {
    const toks: Tok[] = [];
    let rest = line;
    if (inTriple) {
      const end = rest.indexOf(inTriple);
      if (end === -1) return [{ t: rest, k: "str" }];
      toks.push({ t: rest.slice(0, end + 3), k: "str" });
      rest = rest.slice(end + 3);
      inTriple = null;
    }
    const tripleStart = rest.match(/("""|''')/);
    if (tripleStart && rest.split(tripleStart[1]).length === 2) {
      const idx = rest.indexOf(tripleStart[1]);
      toks.push(...tokenize(rest.slice(0, idx)));
      toks.push({ t: rest.slice(idx), k: "str" });
      inTriple = tripleStart[1];
      return toks;
    }
    toks.push(...tokenize(rest));
    return toks;
  });
}

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let prevWord = "";
  let last = 0;
  RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index), k: "plain" });
    last = RE.lastIndex;
    const [tok, com, str, num, deco, word, op, ws] = m;
    if (com) out.push({ t: tok, k: "com" });
    else if (str) out.push({ t: tok, k: "str" });
    else if (num) out.push({ t: tok, k: "num" });
    else if (deco) out.push({ t: tok, k: "deco" });
    else if (word) {
      let k: TokKind = "plain";
      if (prevWord === "def" || prevWord === "class") k = "def";
      else if (KEYWORDS.has(word)) k = "kw";
      else if (word === "self") k = "self";
      else if (BUILTINS.has(word)) k = "builtin";
      out.push({ t: tok, k });
      prevWord = word;
      continue;
    } else if (op) out.push({ t: tok, k: "op" });
    else if (ws) out.push({ t: tok, k: "plain" });
    if (!ws) prevWord = "";
    if (m[0].length === 0) RE.lastIndex++;
  }
  if (last < s.length) out.push({ t: s.slice(last), k: "plain" });
  return out;
}

export const TOK_CLASS: Record<TokKind, string> = {
  kw: "text-violet font-semibold",
  builtin: "text-k",
  str: "text-v",
  num: "text-[color-mix(in_oklab,var(--pos)_75%,var(--ink))]",
  com: "text-ink-3 italic",
  def: "text-accent font-semibold",
  deco: "text-k",
  self: "text-[color-mix(in_oklab,var(--k)_80%,var(--ink))] italic",
  op: "text-ink-2",
  plain: "text-ink",
};
