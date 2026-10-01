import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAttachments, getAttachmentKind, getAttachmentLabel } from './noteAttachments.js';

test('normalizeAttachments preserves valid attachments and removes bad values', () => {
  const result = normalizeAttachments([
    { id: 'a1', name: 'photo.png', type: 'image', dataUrl: 'data:image/png;base64,abc' },
    { name: 'document.pdf', type: 'pdf', dataUrl: 'data:application/pdf;base64,def' },
    null,
    undefined,
    { id: 'a3', name: 'fallback' },
  ]);

  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'photo.png');
  assert.equal(result[1].type, 'pdf');
  assert.equal(getAttachmentKind('document.pdf'), 'pdf');
  assert.equal(getAttachmentLabel({ name: 'notes.jpg', type: 'image' }), 'notes.jpg');
});
