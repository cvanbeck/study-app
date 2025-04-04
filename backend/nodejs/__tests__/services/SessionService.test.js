import { jest } from '@jest/globals';
import SessionService from '../../services/SessionService.js';
import Note from '../../models/Note.js';
import NoteService from '../../services/NoteService.js';

/**
 * Test suite for the SessionService
 * This service manages session codes that link to notes
 */
describe('SessionService', () => {
    let mockDbContext;
    let sessionService;
    let mockNoteService;

    beforeEach(() => {
        // Mock the database context
        mockDbContext = {
            query: jest.fn()
        };

        // Create a mock for NoteService
        mockNoteService = {
            getDeltas: jest.fn(),
            buildNote: jest.fn()
        };

        // Create an instance of SessionService with the mock database
        sessionService = new SessionService(mockDbContext);
        
        // Override the internal NoteService with our mock
        sessionService.noteService = mockNoteService;
    });

    describe('storeCode', () => {
        test('should store a code with a note id', async () => {
            // Setup mock implementation
            mockDbContext.query.mockResolvedValue({ rowsAffected: 1 });
            
            // Define test parameters
            const code = 'ABC123';
            const page = 'notes';
            const id = 'note-uuid-123';
            
            // Call the method
            await sessionService.storeCode(code, page, id);
            
            // Verify database was called with correct params
            expect(mockDbContext.query).toHaveBeenCalledWith(
                "INSERT INTO SessionCodes VALUES (?, ?, ?)",
                [code, page, id]
            );
        });

        test('should handle database errors', async () => {
            // Setup mock implementation to throw an error
            const mockError = new Error('Database error');
            mockDbContext.query.mockRejectedValue(mockError);
            
            // Spy on console.error
            jest.spyOn(console, 'error').mockImplementation(() => {});
            
            // Define test parameters
            const code = 'ABC123';
            const page = 'notes';
            const id = 'note-uuid-123';
            
            // Call the method
            await sessionService.storeCode(code, page, id);
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalledWith(
                'Error querying SessionCodes table:',
                mockError
            );
        });
    });

    describe('getNote', () => {
        test('should retrieve a note based on session code', async () => {
            // Setup mock data
            const mockNoteData = {
                id: 'note-uuid-123',
                name: 'Test Note',
                content: '{"ops":[]}',
                page: 'notes'
            };
            
            // Convert keys to uppercase to simulate database return format
            const mockDbResponse = [{
                ID: mockNoteData.id,
                NAME: mockNoteData.name,
                CONTENT: mockNoteData.content,
                PAGE: mockNoteData.page
            }];
            
            // Setup mock implementations
            mockDbContext.query.mockResolvedValue(mockDbResponse);
            mockNoteService.getDeltas.mockResolvedValue([]);
            mockNoteService.buildNote.mockReturnValue({ ops: [] });
            
            // Define test parameters
            const code = 'ABC123';
            
            // Call the method
            const result = await sessionService.getNote(code);
            
            // Verify database was called with correct params
            expect(mockDbContext.query).toHaveBeenCalledWith(
                expect.stringContaining("SELECT id, name, content, page FROM SessionCodes"),
                [code]
            );
            
            // Verify the result contains a Note instance and page
            expect(result).toHaveProperty('note');
            expect(result).toHaveProperty('page', mockNoteData.page);
            expect(result.note).toBeInstanceOf(Note);
            expect(result.note.id).toBe(mockNoteData.id);
            expect(result.note.name).toBe(mockNoteData.name);
            
            // Verify NoteService methods were called
            expect(mockNoteService.getDeltas).toHaveBeenCalledWith(mockNoteData.id);
            expect(mockNoteService.buildNote).toHaveBeenCalled();
        });

        test('should return null when note is not found', async () => {
            // Setup mock implementation to return empty result
            mockDbContext.query.mockResolvedValue([]);
            
            // Spy on console.log
            jest.spyOn(console, 'log').mockImplementation(() => {});
            
            // Define test parameters
            const code = 'ABC123';
            
            // Call the method
            const result = await sessionService.getNote(code);
            
            // Verify null was returned
            expect(result).toBeNull();
            expect(console.log).toHaveBeenCalledWith(`Note with code ${code} not found`);
        });

        test('should handle database errors', async () => {
            // Setup mock implementation to throw an error
            const mockError = new Error('Database error');
            mockDbContext.query.mockRejectedValue(mockError);
            
            // Spy on console.error
            jest.spyOn(console, 'error').mockImplementation(() => {});
            
            // Define test parameters
            const code = 'ABC123';
            
            // Call the method
            const result = await sessionService.getNote(code);
            
            // Verify null was returned and error was logged
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(
                'Error querying SessionCodes table:',
                mockError
            );
        });
    });

    describe('deleteCode', () => {
        test('should delete a session code', async () => {
            // Setup mock implementation
            mockDbContext.query.mockResolvedValue({ rowsAffected: 1 });
            
            // Define test parameters
            const code = 'ABC123';
            const id = 'note-uuid-123';
            
            // Call the method
            const result = await sessionService.deleteCode(code, id);
            
            // Verify database was called with correct params
            expect(mockDbContext.query).toHaveBeenCalledWith(
                "DELETE FROM SessionCodes WHERE Code = ? AND NoteID = ?",
                [code, id]
            );
            
            // Verify the result is the code
            expect(result).toBe(code);
        });

        test('should handle database errors', async () => {
            // Setup mock implementation to throw an error
            const mockError = new Error('Database error');
            mockDbContext.query.mockRejectedValue(mockError);
            
            // Spy on console.error
            jest.spyOn(console, 'error').mockImplementation(() => {});
            
            // Define test parameters
            const code = 'ABC123';
            const id = 'note-uuid-123';
            
            // Call the method
            await sessionService.deleteCode(code, id);
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalledWith(
                'Error querying SessionCodes table:',
                mockError
            );
        });
    });
});