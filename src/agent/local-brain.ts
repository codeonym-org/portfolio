/**
 * ── THE LOCAL INDEX ───────────────────────────────────────────
 * What answers when the link to the model is down (no key, rate
 * limit, offline): a keyword router over the record. It cannot
 * reason, but it can still drive everything — it returns the same
 * commands the agent would call, so the interface behaves the same.
 *
 * Pure and dependency-free: the record comes in as plain data
 * (unit-tested with `node --test`).
 */

export interface BrainIndex {
  player: { name: string; title: string; job: string; guild: string; location: string; creed: string };
  sectors: { id: string; name: string; section: string }[];
  quests: { id: string; name: string; summary: string; stack: string[] }[];
  skills: { id: string; name: string }[];
  items: { id: string; name: string }[];
  /** the case shown for "why hire him" — built from the record by the caller */
  defaultCase: Record<string, unknown>;
}

export interface BrainAction {
  name: string;
  args: Record<string, unknown>;
}

export interface BrainReply {
  text: string;
  actions: BrainAction[];
  /** show the contact buttons under the reply */
  contact?: boolean;
  /** show the map card under the reply */
  map?: boolean;
}

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const has = (text: string, ...words: string[]) => words.some((w) => new RegExp(`(^|[^a-z0-9])${w}`).test(text));

/** sector keywords, English and French */
const SECTOR_WORDS: Record<string, string[]> = {
  contact: ["contact", "reach", "email", "e-mail", "mail", "linkedin", "github", "hire him", "get in touch", "joindre", "contacter", "message"],
  experience: ["experience", "career", "job", "work history", "worked", "company", "employer", "education", "degree", "study", "studied", "university", "master", "opensnz", "parcours", "etudes", "formation", "diplome"],
  projects: ["project", "built", "build", "shipped", "quest", "shadow", "case stud", "projet", "realisation", "portfolio"],
  skills: ["skill", "stack", "tech", "tool", "framework", "arsenal", "competence", "language", "langage", "know"],
  inventory: ["inventory", "vault", "credential", "certificate", "item", "relic", "license", "inventaire", "document", "degree", "diploma", "diplome"],
  status: ["who", "about", "profile", "status", "player", "ayoub", "codeonym", "level", "rank", "creed", "title", "qui", "profil", "bio", "introduce", "himself"],
};

const GENERIC = new Set(["skills", "project", "projects", "system", "systems", "agents", "record", "portfolio"]);

function mention<T extends { id: string; name: string }>(text: string, list: T[]): T | undefined {
  // the longest name first, so "LangGraph" wins over "Lang"
  return [...list]
    .sort((a, b) => b.name.length - a.name.length)
    .find((e) => {
      const name = fold(e.name);
      if (name.length < 3) return false;
      if (text.includes(name) || text.includes(e.id)) return true;
      // "the pharma project" → "Multi-Agent Pharmaceutical Catalog System"
      // …but not on a word that names a whole sector: "his skills" is not the project "design-skills"
      const words = name.split(/[\s·/-]+/).filter((w) => w.length >= 6 && !GENERIC.has(w));
      return words.some((w) => text.includes(w.slice(0, 6)));
    });
}

export function answerLocally(input: string, index: BrainIndex): BrainReply {
  const text = fold(input);
  const p = index.player;
  const open = (sector: string): BrainAction => ({ name: "open_sector", args: { sector } });

  if (!text) return { text: "The System heard nothing.", actions: [] };

  if (has(text, "cv", "resume", "curriculum", "hunter card")) {
    if (has(text, "download", "save", "telecharg")) return { text: "The CV is downloading.", actions: [{ name: "download_cv", args: {} }] };
    return { text: "The full CV, as a document.", actions: [{ name: "open_cv", args: {} }] };
  }

  if (has(text, "brief", "summary", "overview", "short version", "in short", "tl;dr", "tldr", "one minute", "resume rapide", "en bref")) {
    return { text: "The record in one minute. Every line opens its full entry.", actions: [{ name: "open_brief", args: {} }] };
  }

  if (has(text, "hire", "fit", "why him", "why should", "convince", "recruit", "embauch", "strongest", "case")) {
    return {
      text: "I cannot argue from the local index — but the evidence does not need me to. This is the case the record makes on its own.",
      actions: [{ name: "assemble_case", args: index.defaultCase }],
    };
  }

  if (has(text, "where is he", "where does he", "based", "location", "located", "time zone", "timezone", "what time", "ou est-il", "fuseau")) {
    return { text: `${p.name} is based in ${p.location}. The map shows his local time against yours.`, actions: [], map: true };
  }

  if (has(text, ...SECTOR_WORDS.contact)) {
    return { text: `Every channel below reaches ${p.name} directly.`, actions: [open("contact")], contact: true };
  }

  const quest = mention(text, index.quests);
  if (quest) {
    return { text: `${quest.name}. ${quest.summary}`, actions: [{ name: "inspect_entity", args: { kind: "quest", id: quest.id } }] };
  }
  const skill = mention(text, index.skills);
  if (skill) return { text: `${skill.name}. Its entry is open.`, actions: [{ name: "inspect_entity", args: { kind: "skill", id: skill.id } }] };
  const item = mention(text, index.items);
  if (item) return { text: `${item.name}, from the documents.`, actions: [{ name: "inspect_entity", args: { kind: "item", id: item.id } }] };

  if (has(text, "close", "back", "home", "reset view", "fermer", "retour")) return { text: "The record returns to orbit.", actions: [{ name: "close_windows", args: {} }] };

  for (const id of ["experience", "projects", "skills", "inventory", "status"]) {
    if (!has(text, ...SECTOR_WORDS[id])) continue;
    const sector = index.sectors.find((s) => s.id === id);
    if (!sector) continue;
    const line =
      id === "status"
        ? `${p.name} — ${p.job}, ${p.title}, at ${p.guild} (${p.location}).`
        : id === "projects"
          ? `${index.quests.length} projects on record. Pick one to read its details.`
          : `${sector.name}: ${sector.section.toLowerCase()}.`;
    return { text: line, actions: [open(id)] };
  }

  if (has(text, "hello", "hi", "hey", "salam", "bonjour", "salut", "yo")) {
    return { text: `Hello. Ask about ${p.name}'s projects, skills or experience — or say "contact".`, actions: [] };
  }

  return {
    text: `The local index cannot reason about that. It can show: ${index.sectors.map((s) => s.section.toLowerCase()).join(", ")} — or name a project or a skill.`,
    actions: [],
  };
}
