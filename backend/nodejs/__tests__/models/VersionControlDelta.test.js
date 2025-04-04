import { jest } from '@jest/globals';
import VersionControlDelta from '../../models/VersionControlDelta.js';

/**
 * Test suite for the VersionControlDelta model
 * Tests include:
 * - Creating deltas with default values
 * - Creating deltas with custom values
 * - Setting and getting content
 * - Retrieving noteID
 */
describe('VersionControlDelta Model', () => {
    // Test default initialization
    test('creates VersionControlDelta with default values', () => {
        const delta = new VersionControlDelta();
        
        expect(delta.noteID).toBeUndefined();
        expect(delta.version).toBeUndefined();
        expect(delta.user).toBe('');
        expect(delta.timestamp).toBe('');
        expect(delta.content).toBe('{"ops":[]}');
    });

    // Test initialization with custom values
    test('creates VersionControlDelta with provided values', () => {
        const customData = {
            noteid: 'note123',
            version: 2,
            user: 'testuser',
            timestamp: '2023-01-01T12:00:00Z',
            content: '{"ops":[{"insert":"Hello World"}]}'
        };
        
        const delta = new VersionControlDelta(customData);
        
        expect(delta.noteID).toBe('note123');
        expect(delta.version).toBe(2);
        expect(delta.user).toBe('testuser');
        expect(delta.timestamp).toBe('2023-01-01T12:00:00Z');
        expect(delta.content).toBe('{"ops":[{"insert":"Hello World"}]}');
    });

    // Test setContent method
    test('setContent should set delta property', () => {
        const delta = new VersionControlDelta();
        const content = { ops: [{ insert: 'Hello World' }] };
        
        delta.setContent(content);
        
        expect(delta.delta).toBe(JSON.stringify(content));
    });

    // Test getContent method
    test('getContent should return the delta', () => {
        const delta = new VersionControlDelta();
        const content = { ops: [{ insert: 'Hello World' }] };
        
        delta.delta = JSON.stringify(content);
        
        expect(delta.getContent()).toBe(JSON.stringify(content));
    });

    // Test getNoteID method
    test('getNoteID should return the noteID', () => {
        const noteid = 'note123';
        const delta = new VersionControlDelta({ noteid });
        
        expect(delta.getNoteID()).toBe(noteid);
    });
});