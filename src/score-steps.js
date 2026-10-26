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
    if (notes.length) {
      steps.push({ cursor: position, time: cursor.Iterator.currentTimeStamp.RealValue, measure: cursor.Iterator.CurrentMeasureIndex, notes });
    }
    cursor.next();
  }
  cursor.reset();
  return steps;
}

/** Tempo of the score in quarter notes per minute. @param {any} osmd */
export function scoreTempo(osmd) {
  return osmd.Sheet?.DefaultStartTempoInBpm || 100;
}

/** Colours of each hand, on the score and on the keys. */
export const HAND_COLORS = { right: '#e07a1f', left: '#2f6fd6' };

/**
 * Colour the notes of a loaded score by hand, before it is rendered.
 * @param {any} osmd
 */
export function colorHands(osmd) {
  for (const measure of osmd.Sheet?.SourceMeasures ?? []) {
    for (const container of measure.VerticalSourceStaffEntryContainers) {
      for (const entry of container.StaffEntries) {
        if (!entry) continue;
        const color = entry.ParentStaff.idInMusicSheet === 0 ? HAND_COLORS.right : HAND_COLORS.left;
        for (const voiceEntry of entry.VoiceEntries) {
          voiceEntry.StemColor = color;
          for (const note of voiceEntry.Notes) note.NoteheadColor = color;
        }
      }
    }
  }
}
