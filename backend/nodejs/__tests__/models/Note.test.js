import { jest } from '@jest/globals';
import Note from '../../models/Note.js';

describe('Note Model', () => {
    test('creates note with default values', () => {
        const note = new Note();
        expect(note.id).toBeDefined();
        expect(note.name).toBe('');
        expect(note.content).toBe('{"ops":[]}');
    });
});