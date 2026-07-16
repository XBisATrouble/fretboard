"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MidiMessage = { data: Uint8Array };
type MidiInput = {
  id: string;
  name: string | null;
  onmidimessage: ((event: MidiMessage) => void) | null;
};
type MidiAccess = {
  inputs: Map<string, MidiInput>;
  onstatechange: (() => void) | null;
};

type MidiState = "connecting" | "connected" | "waiting" | "unsupported" | "denied";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const LOWEST_MIDI_NOTE = 48; // C3
const HIGHEST_MIDI_NOTE = 79; // G5

function midiNumberToNote(number: number) {
  if (number < LOWEST_MIDI_NOTE || number > HIGHEST_MIDI_NOTE) return null;
  return `${NOTE_NAMES[number % 12]}${Math.floor(number / 12) - 1}`;
}

export function useMidiInput(onNote: (note: string) => void) {
  const onNoteRef = useRef(onNote);
  const accessRef = useRef<MidiAccess | null>(null);
  const inputsRef = useRef<MidiInput[]>([]);
  const [state, setState] = useState<MidiState>("connecting");
  const [deviceNames, setDeviceNames] = useState<string[]>([]);

  useEffect(() => { onNoteRef.current = onNote; }, [onNote]);

  const detach = useCallback(() => {
    inputsRef.current.forEach((input) => { input.onmidimessage = null; });
    inputsRef.current = [];
    if (accessRef.current) accessRef.current.onstatechange = null;
  }, []);

  const connect = useCallback(async () => {
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
      setState("unsupported");
      return;
    }

    setState("connecting");
    try {
      const access = await (navigator as Navigator & { requestMIDIAccess: () => Promise<MidiAccess> }).requestMIDIAccess();
      detach();
      accessRef.current = access;

      const attachInputs = () => {
        inputsRef.current.forEach((input) => { input.onmidimessage = null; });
        const inputs = Array.from(access.inputs.values());
        inputsRef.current = inputs;
        setDeviceNames(inputs.map((input) => input.name?.trim() || "MIDI 键盘"));
        setState(inputs.length ? "connected" : "waiting");
        inputs.forEach((input) => {
          input.onmidimessage = (event) => {
            const [status, noteNumber, velocity] = event.data;
            // 0x90 is Note On. A zero velocity Note On is conventionally Note Off.
            if ((status & 0xf0) !== 0x90 || velocity === 0) return;
            const note = midiNumberToNote(noteNumber);
            if (note) onNoteRef.current(note);
          };
        });
      };

      access.onstatechange = attachInputs;
      attachInputs();
    } catch {
      setState("denied");
      setDeviceNames([]);
    }
  }, [detach]);

  useEffect(() => {
    void connect();
    return detach;
  }, [connect, detach]);

  return { state, deviceNames, connect };
}
