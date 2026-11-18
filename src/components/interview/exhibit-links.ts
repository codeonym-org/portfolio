/**
 * ── WHAT LEADS TO WHAT ON THE TABLE ───────────────────────────
 * A skill and the projects that used it are named differently in the
 * record ("LangChain / LangGraph" and "LangChain/LangGraph", "RAG
 * Systems" and "RAG"). Both are cut into parts at their separators,
 * and a part matches another when they are the same words, or when
 * one holds the other's words as a whole ("MCP Protocol" and "MCP"),
 * never a word inside a word ("Java", "JavaScript").
 */

const parts = (name: string): string[] =>
  name
    .toLowerCase()
    .split(/\s*[/·,()]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);

const words = (part: string) => part.split(/\s+/).filter(Boolean);

function holds(longer: string[], shorter: string[]): boolean {
  if (!shorter.length || shorter.length > longer.length) return false;
  for (let i = 0; i + shorter.length <= longer.length; i++) if (shorter.every((w, j) => longer[i + j] === w)) return true;
  return false;
}

/** two names share a part */
export function sameThing(a: string, b: string): boolean {
  for (const x of parts(a))
    for (const y of parts(b)) {
      const wx = words(x);
      const wy = words(y);
      if (holds(wx, wy) || holds(wy, wx)) return true;
    }
  return false;
}

/** the projects whose stack names this skill */
export function usedIn<P extends { stack: readonly string[] }>(skill: string, projects: readonly P[]): P[] {
  return projects.filter((p) => p.stack.some((r) => sameThing(skill, r)));
}

/** the skill a stack entry names, if any */
export function skillNamed<S extends { name: string }>(entry: string, skills: readonly S[]): S | undefined {
  return skills.find((s) => sameThing(s.name, entry));
}
