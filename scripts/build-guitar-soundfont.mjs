import { mkdir, writeFile } from "node:fs/promises";

const sourceUrl = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3.js";
const sampleMidis = Array.from({ length: 17 }, (_, index) => 40 + index * 3);
const noteNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const noteName = (midi) => `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`;

const response = await fetch(sourceUrl);
if (!response.ok) throw new Error(`Unable to download guitar soundfont: ${response.status}`);
const source = await response.text();
const assignment = source.indexOf("MIDI.Soundfont.acoustic_guitar_nylon =");
const objectStart = source.indexOf("{", assignment);
const objectEnd = source.lastIndexOf("}");
const samples = JSON.parse(source.slice(objectStart, objectEnd + 1).replace(/,\s*}$/, "}"));
const selected = Object.fromEntries(sampleMidis.map((midi) => {
  const name = noteName(midi);
  if (!samples[name]) throw new Error(`Missing guitar sample ${name}`);
  return [name, samples[name]];
}));

const sampleEntries = Object.entries(selected)
  .map(([name, data]) => `  ${JSON.stringify(name)}: ${JSON.stringify(data)},`)
  .join("\n");
const output = `/* FluidR3_GM acoustic guitar samples, CC BY 3.0.\n`+
  `   Source: https://github.com/gleitz/midi-js-soundfonts */\n`+
  `if (typeof(MIDI) === 'undefined') var MIDI = {};\n`+
  `if (typeof(MIDI.Soundfont) === 'undefined') MIDI.Soundfont = {};\n`+
  `MIDI.Soundfont.acoustic_guitar_nylon = {\n${sampleEntries}\n};\n`;

await mkdir(new URL("../public/audio/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/audio/acoustic_guitar_nylon-mp3.js", import.meta.url), output);
console.log(`Wrote ${Object.keys(selected).length} guitar samples.`);
