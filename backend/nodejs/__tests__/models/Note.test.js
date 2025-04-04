import { jest } from '@jest/globals';
import Note from '../../models/Note.js';

/**
 * Comprehensive test suite for the Note model
 * Tests include:
 * - Creating notes with default and custom values
 * - Setting and getting content
 * - ID generation and retrieval
 */
describe('Note Model', () => {
    // Test default initialization
    test('creates note with default values', () => {
        const note = new Note();
        expect(note.id).toBeDefined();
        expect(note.name).toBe('');
        expect(note.content).toBe('{"ops":[]}');
    });

    // Test initialization with custom values
    test('creates note with provided values', () => {
        const customData = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Note',
            content: '{"ops":[{"insert":"Hello World"}]}'
        };
        
        const note = new Note(customData);
        
        expect(note.id).toBe(customData.id);
        expect(note.name).toBe(customData.name);
        expect(note.content).toBe(customData.content);
    });

    // Test setContent method
    test('setContent should store stringified content', () => {
        const note = new Note();
        const content = { ops: [{ insert: 'Hello World' }] };
        
        note.setContent(content);
        
        expect(note.content).toBe(JSON.stringify(content));
    });

    // Test getContent method
    test('getContent should return the content', () => {
        const content = '{"ops":[{"insert":"Hello World"}]}';
        const note = new Note({ content });
        
        expect(note.getContent()).toBe(content);
    });

    // Test getID method
    test('getID should return the note ID', () => {
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const note = new Note({ id });
        
        expect(note.getID()).toBe(id);
    });

    // Test ID generation
    test('should generate UUID when ID is not provided', () => {
        // Mock crypto.randomUUID for consistent testing
        const mockUUID = '00000000-0000-0000-0000-000000000000';
        global.crypto = { randomUUID: () => mockUUID };
        
        const note = new Note();
        
        expect(note.id).toBe(mockUUID);
        expect(note.getID()).toBe(mockUUID);
        
        // Clean up mock
        delete global.crypto;
    });
});