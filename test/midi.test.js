import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleMessage } from '../src/midi.js';

function record() {
  const events = [];
  return {
    events,
    handlers: {
      onNoteOn: (note, velocity) => events.push(['on', note, velocity]),
      onNoteOff: (note) => events.push(['off', note]),
      onDevicesChange: () => {},
    },
  };
}

test('reads note-on and note-off on any channel', () => {
  const { events, handlers } = record();
  handleMessage(new Uint8Array([0x90, 60, 100]), handlers);
  handleMessage(new Uint8Array([0x83, 60, 0]), handlers);
  assert.deepEqual(events, [['on', 60, 100], ['off', 60]]);
});

test('treats note-on with velocity 0 as note-off', () => {
  const { events, handlers } = record();
  handleMessage(new Uint8Array([0x90, 64, 0]), handlers);
  assert.deepEqual(events, [['off', 64]]);
});

test('ignores other messages', () => {
  const { events, handlers } = record();
  handleMessage(new Uint8Array([0xb0, 64, 127]), handlers);
  handleMessage(new Uint8Array([0xf8]), handlers);
  assert.deepEqual(events, []);
});
