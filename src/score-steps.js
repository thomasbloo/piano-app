// Reads the notes of a score rendered by OpenSheetMusicDisplay, by walking its cursor.

/**
 * @param {any} osmd  an OpenSheetMusicDisplay instance with a loaded and rendered score
 * @returns {import('./practice.js').Step[]}
 */
export function readSteps(osmd) {
  const cursor = osmd.cursor;
  cursor.reset();
  /** @type {import('./practice.js').Step[]} */
  const steps = [];
  for (let position = 0; !cursor.Iterator.EndReached; position++) {
    /** @type {import('./practice.js').StepNote[]} */
    const notes = [];
    for (const note of cursor.NotesUnderCursor()) {
      if (note.isRest() || note.ParentVoiceEntry?.IsGrace) continue;
      // A tied note is held, not played again.
      if (note.NoteTie && note.NoteTie.StartNote !== note) continue;
      notes.push({
        // OSMD counts half tones from C0 as 0; MIDI puts C0 at 12.
        midi: note.halfTone + 12,
        // First staff is the right hand, every other staff the left.
        hand: note.ParentStaffEntry.ParentStaff.idInMusicSheet === 0 ? 'right' : 'left',
        length: note.Length.RealValue,
      });
    }
    if (notes.length) steps.push({ cursor: position, time: cursor.Iterator.currentTimeStamp.RealValue, notes });
    cursor.next();
  }
  cursor.reset();
  return steps;
}

/** Tempo of the score in quarter notes per minute. @param {any} osmd */
export function scoreTempo(osmd) {
  return osmd.Sheet?.DefaultStartTempoInBpm || 100;
}
