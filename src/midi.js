/**
 * @typedef {object} MidiHandlers
 * @property {(midi: number, velocity: number) => void} onNoteOn
 * @property {(midi: number) => void} onNoteOff
 * @property {(names: string[]) => void} onDevicesChange
 */

export function midiSupported() {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

/**
 * Listen to every connected MIDI input, including devices plugged in later.
 * @param {MidiHandlers} handlers
 */
export async function connectMidi(handlers) {
  const access = await navigator.requestMIDIAccess();
  const bind = () => {
    /** @type {string[]} */
    const names = [];
    access.inputs.forEach((input) => {
      names.push(input.name ?? 'Appareil MIDI');
      input.onmidimessage = (event) => handleMessage(event.data, handlers);
    });
    handlers.onDevicesChange(names);
  };
  access.onstatechange = bind;
  bind();
}

/**
 * @param {Uint8Array | null} data
 * @param {MidiHandlers} handlers
 */
export function handleMessage(data, handlers) {
  if (!data || data.length < 3) return;
  const command = data[0] & 0xf0;
  const note = data[1];
  const velocity = data[2];
  // A note-on with velocity 0 is how many keyboards send note-off.
  if (command === 0x90 && velocity > 0) handlers.onNoteOn(note, velocity);
  else if (command === 0x80 || command === 0x90) handlers.onNoteOff(note);
}
