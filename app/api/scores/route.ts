import { env } from "cloudflare:workers";

const createScoresTable = `CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  composer TEXT NOT NULL DEFAULT '社区谱目',
  level TEXT NOT NULL DEFAULT '自定义',
  notes_json TEXT NOT NULL,
  music_xml TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
const playableNotes = new Set([
  "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
  "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5",
]);
const flatToSharp: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", Fb: "E" };

function normalizeNote(note: string) {
  const match = /^([A-G])([#b]?)([0-8])$/.exec(note);
  if (!match) return null;
  const [, step, accidental, octave] = match;
  const base = `${step}${accidental}`;
  if (base === "B#") return `C${Number(octave) + 1}`;
  if (base === "E#") return `F${octave}`;
  return `${flatToSharp[base] ?? base}${octave}`;
}

async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare(createScoresTable),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores(created_at DESC)"),
  ]);
}

export async function GET() {
  await ensureSchema();
  const { results } = await env.DB.prepare(
    "SELECT id, title, composer, level, notes_json, created_at FROM scores ORDER BY id DESC LIMIT 100",
  ).all<{ id: number; title: string; composer: string; level: string; notes_json: string; created_at: string }>();

  return Response.json(results.map((score) => ({
    id: `shared-${score.id}`,
    title: score.title,
    composer: score.composer,
    level: score.level,
    notes: JSON.parse(score.notes_json),
    shared: true,
    createdAt: score.created_at,
  })));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    title?: unknown; composer?: unknown; level?: unknown; notes?: unknown; musicXml?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const composer = typeof body?.composer === "string" ? body.composer.trim() : "社区谱目";
  const level = typeof body?.level === "string" ? body.level.trim() : "自定义";
  const notes = Array.isArray(body?.notes) ? body.notes : [];
  const normalizedNotes = notes.map((note) => typeof note === "string" ? normalizeNote(note) : null);
  const musicXml = typeof body?.musicXml === "string" ? body.musicXml : "";

  if (!title || title.length > 80 || !musicXml || musicXml.length > 180_000 || notes.length < 1 || notes.length > 256 || normalizedNotes.some((note) => !note || !playableNotes.has(note))) {
    return Response.json({ error: "谱目格式无效，或音高超出 C3–G5 的 32 键练习范围。" }, { status: 400 });
  }

  await ensureSchema();
  const result = await env.DB.prepare(
    "INSERT INTO scores (title, composer, level, notes_json, music_xml) VALUES (?, ?, ?, ?, ?)",
  ).bind(title, composer || "社区谱目", level || "自定义", JSON.stringify(normalizedNotes), musicXml).run();

  return Response.json({
    id: `shared-${result.meta.last_row_id}`,
    title,
    composer: composer || "社区谱目",
    level: level || "自定义",
    notes: normalizedNotes,
    shared: true,
  }, { status: 201 });
}
