import { jest } from '@jest/globals';
import NotesController from '../../controllers/NotesController.js';
import Note from '../../models/Note.js';
import NoteService from '../../services/NoteService.js';

// Mock console.error to suppress output during tests
console.error = jest.fn();

// Mock the NoteService module to isolate controller tests
jest.mock('../../services/NoteService.js');

describe('NotesController', () => {
    let mockReq;
    let mockRes;
    let mockNoteService;
    let mockSessionService;
    let controller;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Setup mock response
        mockRes = {
            send: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            redirect: jest.fn(),
            render: jest.fn()
        };

        // Setup mock request
        mockReq = {
            body: {},
            query: {},
            get: jest.fn(),
            session: {}
        };

        // Setup mock services
        mockNoteService = {
            storeNote: jest.fn(),
            getNote: jest.fn(),
            updateNote: jest.fn(),
            newNoteVersion: jest.fn(),
            getNoteVersion: jest.fn(),
            deleteVersion: jest.fn(),
            storeVersion: jest.fn(),
            getVersion: jest.fn()
        };

        mockSessionService = {
            storeCode: jest.fn(),
            getNote: jest.fn(),
            deleteCode: jest.fn()
        };

        // Mock console.error
        console.error = jest.fn();

        // Create controller instance
        controller = new NotesController({
            noteService: mockNoteService,
            sessionService: mockSessionService,
            appData: { title: 'Test App' }
        });
    });

    // Boundary Test (Testing edge cases)
    describe('Boundary Tests', () => {
        test('handles empty note content', async () => {
            mockReq.body = { content: '' };
            await controller.generateNote(mockReq, mockRes);
            
            expect(mockNoteService.storeNote).toHaveBeenCalled();
            const callArg = mockNoteService.storeNote.mock.calls[0][0];
            expect(callArg).toBeInstanceOf(Note);
            expect(callArg.content).toBe('{"ops":[]}');
        });

        test('handles very large note content', async () => {
            const largeContent = 'a'.repeat(10000);
            mockReq.body = { content: largeContent };
            await controller.generateNote(mockReq, mockRes);
            
            expect(mockNoteService.storeNote).toHaveBeenCalled();
            const callArg = mockNoteService.storeNote.mock.calls[0][0];
            expect(callArg).toBeInstanceOf(Note);
            expect(callArg.content).toBe(largeContent);
        });
    });

    // Functionality Tests (Testing main features)
    describe('Functionality Tests', () => {
        test('creates new note successfully', async () => {
            const testContent = 'Test content';
            mockReq.body = { content: testContent };
            await controller.generateNote(mockReq, mockRes);
            
            expect(mockNoteService.storeNote).toHaveBeenCalled();
            const callArg = mockNoteService.storeNote.mock.calls[0][0];
            expect(callArg).toBeInstanceOf(Note);
            expect(mockRes.send).toHaveBeenCalledWith(expect.objectContaining({
                id: expect.any(String),
                content: testContent
            }));
        });

        test('retrieves existing note', async () => {
            // Setup mock response
            const mockNote = { id: 'test-id', content: 'Test content' };
            mockNoteService.getNote.mockResolvedValue(mockNote);
            mockReq.body.result = 'test-id';

            // Execute
            await controller.getExistingNote(mockReq, mockRes);
            
            // Verify
            expect(mockNoteService.getNote).toHaveBeenCalledWith('test-id');
            expect(mockRes.send).toHaveBeenCalledWith(mockNote);
        });

        test('updates note content', async () => {
            // Setup
            const updatedNote = { id: 'test-id', content: 'Updated content' };
            mockNoteService.updateNote.mockResolvedValue(updatedNote);
            mockReq.body = {
                id: 'test-id',
                content: 'Updated content'
            };

            // Execute
            await controller.updateNote(mockReq, mockRes);
            
            // Verify
            expect(mockNoteService.updateNote).toHaveBeenCalledWith(
                'test-id',
                expect.objectContaining({ content: 'Updated content' })
            );
            expect(mockRes.send).toHaveBeenCalledWith(updatedNote);
        });
    });

    /**
     * Error Handling Test Suite
     * Purpose: Verify proper error handling across all controller methods
     * 
     * Key areas tested:
     * - Database errors (connection, query, update failures)
     * - Invalid input validation
     * - Service-level errors
     * - Proper error responses and status codes
     * - Error logging behavior
     */
    describe('Error Handling', () => {
        /**
         * Database Error Tests
         * Purpose: Verify proper handling of database-related failures
         * 
         * Test cases cover:
         * - Connection failures
         * - Query execution errors
         * - Update operation failures
         * 
         * Expected behavior:
         * - Return 500 status code
         * - Send appropriate error message
         * - Log error details for debugging
         */
        describe('Database Errors', () => {
            /**
             * Test: Database Error in Note Generation
             * 
             * Scenario: Database fails while trying to store a new note
             * Setup:
             * - Mock NoteService.storeNote to reject with database error
             * 
             * Expected Results:
             * - Should return 500 status code
             * - Should send "Internal server error" message
             * - Should log error for debugging
             */
            test('handles database error in generateNote', async () => {
                // Mock database connection failure
                mockNoteService.storeNote.mockRejectedValue(new Error('Database connection failed'));
                
                await controller.generateNote(mockReq, mockRes);
                
                // Verify error handling behavior
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.send).toHaveBeenCalledWith('Internal server error');
                expect(console.error).toHaveBeenCalled();
            });

            /**
             * Test: Database Error in Note Retrieval
             * 
             * Scenario: Database fails while trying to retrieve an existing note
             * Setup:
             * - Mock NoteService.getNote to reject with database error
             * - Provide valid note ID in request
             * 
             * Expected Results:
             * - Should return 500 status code
             * - Should send "Internal server error" message
             * - Should log error for debugging
             */
            test('handles database error in getExistingNote', async () => {
                // Setup test with valid ID but failed query
                mockNoteService.getNote.mockRejectedValue(new Error('Database query failed'));
                mockReq.body.result = 'test-id';
                
                await controller.getExistingNote(mockReq, mockRes);
                
                // Verify proper error response
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.send).toHaveBeenCalledWith('Internal server error');
                expect(console.error).toHaveBeenCalled();
            });

            /**
             * Test: Database Error in Note Update
             * 
             * Scenario: Database fails while trying to update an existing note
             * Setup:
             * - Mock NoteService.updateNote to reject with database error
             * - Provide valid note ID and content
             * 
             * Expected Results:
             * - Should return 500 status code
             * - Should send "Internal server error" message
             * - Should log error for debugging
             */
            test('handles database error in updateNote', async () => {
                // Setup test with valid data but failed update
                mockNoteService.updateNote.mockRejectedValue(new Error('Update failed'));
                mockReq.body = { id: 'test-id', content: 'updated content' };
                
                await controller.updateNote(mockReq, mockRes);
                
                // Verify error handling
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.send).toHaveBeenCalledWith('Internal server error');
                expect(console.error).toHaveBeenCalled();
            });
        });

        /**
         * Invalid Input Tests
         * Purpose: Verify proper validation and handling of invalid or missing parameters
         * 
         * Test cases cover:
         * - Missing required parameters
         * - Invalid parameter values
         * - Non-existent resources
         * 
         * Expected behavior:
         * - Return appropriate status codes (404 for not found, 500 for other errors)
         * - Send clear error messages
         * - Handle edge cases gracefully
         */
        describe('Invalid Input', () => {
            test('handles missing note ID in getExistingNote', async () => {
                // Setup: empty request body
                mockReq.body = {};
                mockNoteService.getNote.mockResolvedValue(null);

                // Execute
                await controller.getExistingNote(mockReq, mockRes);

                // Verify error handling - should be 404 for missing note
                expect(mockRes.status).toHaveBeenCalledWith(404);
                expect(mockRes.send).toHaveBeenCalledWith('Note not found.');
            });

            test('handles null note ID in updateNote', async () => {
                // Setup: request with missing ID
                mockReq.body = { content: 'test content' };
                mockNoteService.updateNote.mockResolvedValue(null);

                // Execute
                await controller.updateNote(mockReq, mockRes);

                // Verify error handling - should be 404 for missing note
                expect(mockRes.status).toHaveBeenCalledWith(404);
                expect(mockRes.send).toHaveBeenCalledWith('Note not found.');
            });

            /**
             * Test: Non-existent Note Update
             * 
             * Scenario: Client attempts to update a note that doesn't exist
             * Setup:
             * - Mock updateNote to return null (indicating note not found)
             * - Provide valid but non-existent ID
             * 
             * Expected Results:
             * - Should return 404 status code
             * - Should indicate note not found
             * - Should not attempt to update non-existent note
             */
            test('handles non-existent note in updateNote', async () => {
                // Setup test with non-existent note ID
                mockNoteService.updateNote.mockResolvedValue(null);
                mockReq.body = { id: 'non-existent-id', content: 'test' };
                
                await controller.updateNote(mockReq, mockRes);
                
                // Verify proper not found response
                expect(mockRes.status).toHaveBeenCalledWith(404);
                expect(mockRes.send).toHaveBeenCalledWith('Note not found.');
            });
        });

        /**
         * Service Error Tests
         * Purpose: Verify proper handling of service-level failures
         * 
         * Test cases cover:
         * - Note service failures
         * - Session service failures
         * - Service unavailability
         * 
         * Expected behavior:
         * - Return 500 status code for service errors
         * - Log detailed error information
         * - Provide appropriate error messages
         */
        describe('Service Errors', () => {
            /**
             * Test: Note Service Failure
             * 
             * Scenario: Note service fails during note generation
             * Setup:
             * - Mock service to throw error
             * - Provide valid input data
             * 
             * Expected Results:
             * - Should return 500 status code
             * - Should log service error
             * - Should send appropriate error message
             */
            test('handles note service failure in generateNote', async () => {
                // Setup service failure scenario
                mockNoteService.storeNote.mockRejectedValue(new Error('Service unavailable'));
                mockReq.body = { content: 'test content' };
                
                await controller.generateNote(mockReq, mockRes);
                
                // Verify proper error handling
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.send).toHaveBeenCalledWith('Internal server error');
                expect(console.error).toHaveBeenCalled();
            });

            /**
             * Test: Session Service Failure
             * 
             * Scenario: Session service fails during session generation
             * Setup:
             * - Mock session service to throw error
             * - Provide valid note ID and URL
             * 
             * Expected Results:
             * - Should return 500 status code
             * - Should log service error
             * - Should send appropriate error message
             */
            test('handles session service failure in generateSession', async () => {
                // Setup session service failure
                mockSessionService.storeCode = jest.fn().mockRejectedValue(new Error('Session service error'));
                mockReq.query = { id: 'test-id' };
                mockReq.get = jest.fn().mockReturnValue('http://test.com/notes');
                
                await controller.generateSession(mockReq, mockRes);
                
                // Verify proper error handling
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.send).toHaveBeenCalledWith('Internal server error');
                expect(console.error).toHaveBeenCalled();
            });
        });

        test('handles note not found', async () => {
            mockReq.body.result = 'non-existent-id';
            mockNoteService.getNote.mockResolvedValueOnce(null);

            await controller.getExistingNote(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.send).toHaveBeenCalledWith('Note not found.');
        });

        test('handles service errors', async () => {
            mockReq.body.result = 'test-id';
            mockNoteService.getNote.mockRejectedValueOnce(new Error('Database error'));

            await controller.getExistingNote(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith('Internal server error');
        });
    });

    /**
     * Basic Page Rendering Tests
     * 
     * These tests verify that the controller correctly renders
     * pages with the appropriate data and user context.
     * 
     * Key areas tested:
     * - Template rendering
     * - User session handling
     * - AppData injection
     */
    describe('Page Rendering', () => {
        test('renders index page with user session', async () => {
            // Setup
            const mockUser = { id: 1, username: 'testuser' };
            mockReq.session = { user: mockUser };

            // Execute
            await controller.index(mockReq, mockRes);

            // Verify
            // Should render index.ejs with appData and user session
            expect(mockRes.render).toHaveBeenCalledWith('index.ejs', {
                ...controller.appData,
                user: mockUser
            });
        });

        test('renders index page without user session', async () => {
            // Setup
            mockReq.session = {}; // No user in session

            // Execute
            await controller.index(mockReq, mockRes);

            // Verify
            // Should still render but with undefined user
            expect(mockRes.render).toHaveBeenCalledWith('index.ejs', {
                ...controller.appData,
                user: undefined
            });
        });
    });

    /**
     * Session Management Test Suite
     * Purpose: Verify collaborative features through session handling
     * 
     * Key areas tested:
     * - Session code generation and storage
     * - Session joining functionality
     * - Invalid session handling
     * - Session cleanup
     * 
     * These tests ensure the real-time collaboration features
     * work correctly and handle edge cases appropriately.
     */
    describe('Session Management', () => {
        test('generates session code successfully', async () => {
            // Setup
            mockSessionService.storeCode.mockResolvedValue(true);
            mockReq.query = { id: 'test-note-id' };
            mockReq.get.mockReturnValue('http://test.com/notes');

            // Execute
            await controller.generateSession(mockReq, mockRes);

            // Verify
            expect(mockSessionService.storeCode).toHaveBeenCalledWith(
                expect.any(String), // Can't predict the random code
                '/notes',
                'test-note-id'
            );
            expect(mockRes.send).toHaveBeenCalledWith(expect.any(String));
        });

        test('joins session with valid code', async () => {
            // Setup
            const noteData = { id: 'test-note-id', content: 'Shared note content' };
            mockSessionService.getNote.mockResolvedValue(noteData);
            mockReq.body = { result: 'valid-session-code' };

            // Execute
            await controller.joinSession(mockReq, mockRes);

            // Verify
            expect(mockSessionService.getNote).toHaveBeenCalledWith('valid-session-code');
            expect(mockRes.send).toHaveBeenCalledWith(noteData);
        });

        test('handles invalid session code', async () => {
            // Setup
            mockSessionService.getNote.mockResolvedValue(null);
            mockReq.body = { result: 'invalid-code' };

            // Execute
            await controller.joinSession(mockReq, mockRes);

            // Verify
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.send).toHaveBeenCalledWith('Session not found.');
        });

        test('deletes session code successfully', async () => {
            // Setup
            mockReq.query = { 
                id: 'test-note-id',
                code: 'test-session-code' 
            };
            mockSessionService.deleteCode.mockResolvedValue({ success: true });

            // Execute
            await controller.deleteSessionCode(mockReq, mockRes);

            // Verify
            expect(mockSessionService.deleteCode).toHaveBeenCalledWith(
                'test-session-code',
                'test-note-id'
            );
            expect(mockRes.send).toHaveBeenCalledWith({ success: true });
        });
    });

    /**
     * Version Control Test Suite
     * Purpose: Verify note versioning functionality
     * 
     * Key areas tested:
     * - Creating new versions
     * - Retrieving historical versions
     * - Deleting versions
     * - Version metadata handling
     * 
     * These tests ensure that the version control system
     * properly tracks and manages note history.
     */
    describe('Version Control', () => {
        test('creates new note version', async () => {
            // Setup
            const noteId = 'test-note-id';
            mockReq.query = { id: noteId };
            mockNoteService.newNoteVersion.mockResolvedValue({ success: true });

            // Execute
            await controller.newNoteVersion(mockReq, mockRes);

            // Verify
            expect(mockNoteService.newNoteVersion).toHaveBeenCalledWith(noteId);
            expect(mockRes.send).toHaveBeenCalledWith({ 
                message: 'New note version created successfully' 
            });
        });

        test('retrieves note version', async () => {
            // Setup
            const versionData = {
                id: 'version-id',
                content: 'Historical content',
                timestamp: new Date().toISOString()
            };
            mockNoteService.getNoteVersion.mockResolvedValue(versionData);
            mockReq.query = { 
                id: 'note-id',
                version: 'version-id'
            };

            // Execute
            await controller.getNoteVersion(mockReq, mockRes);

            // Verify
            expect(mockNoteService.getNoteVersion).toHaveBeenCalledWith('note-id', 'version-id');
            expect(mockRes.send).toHaveBeenCalledWith(versionData);
        });

        test('deletes note version', async () => {
            // Setup
            mockReq.query = { 
                id: 'note-id',
                version: 'version-id'
            };
            mockNoteService.deleteVersion.mockResolvedValue({ success: true });

            // Execute
            await controller.deleteVersion(mockReq, mockRes);

            // Verify
            expect(mockNoteService.deleteVersion).toHaveBeenCalledWith('note-id', 'version-id');
            expect(mockRes.send).toHaveBeenCalledWith({ success: true });
        });
    });

    /**
     * AI Notes Test Suite
     * Purpose: Verify AI-enhanced note features
     * 
     * Key areas tested:
     * - AI page rendering
     * - Integration with AI services
     * - AI-specific functionality
     * 
     * These tests ensure that the AI enhancement features
     * are properly integrated and accessible.
     */
    describe('AI Notes', () => {
        test('renders AI notes page', async () => {
            // Execute
            await controller.notesAI(mockReq, mockRes);

            // Verify
            expect(mockRes.render).toHaveBeenCalledWith('notesAI', {
                ...controller.appData
            });
        });
    });
});