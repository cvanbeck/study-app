import { jest } from '@jest/globals';
import NotesController from '../../controllers/NotesController.js';
import Note from '../../models/Note.js';
import NoteService from '../../services/NoteService.js';

// Mock console.error to suppress output during tests
console.error = jest.fn();

// Mock the NoteService module to isolate controller tests
jest.mock('../../services/NoteService.js');

describe('NotesController', () => {
    let controller;
    let mockNoteService;
    let mockSessionService;
    let mockDbContext;
    let mockReq;
    let mockRes;

    /**
     * Setup test environment before each test.
     * This includes clearing all mocks, setting up mock dependencies,
     * and initializing the controller with these mocks.
     */
    beforeEach(() => {
        // Clear all mocks before each test to ensure clean state
        jest.clearAllMocks();

        // Mock database context with a query that returns a default note
        mockDbContext = {
            query: jest.fn().mockResolvedValue([{ id: 'test-id', name: '', content: '{"ops":[]}' }])
        };

        // Initialize NoteService with mocked database
        mockNoteService = new NoteService(mockDbContext);

        // Mock core NoteService methods
        // storeNote: Simulates saving a note and returns the same note
        mockNoteService.storeNote = jest.fn().mockImplementation(async (note) => {
            return note;
        });

        // getNote: Simulates retrieving a note with test content
        mockNoteService.getNote = jest.fn().mockImplementation(async (id) => {
            return new Note({ id, content: 'Test content' });
        });

        // updateNote: Simulates updating a note with new data
        mockNoteService.updateNote = jest.fn().mockImplementation(async (id, data) => {
            return new Note({ id, ...data });
        });

        // Mock session service for authentication checks
        mockSessionService = {
            validateSession: jest.fn().mockResolvedValue(true)  // Default to authenticated state
        };

        // Initialize controller with all mocked dependencies
        controller = new NotesController({
            db: mockDbContext,
            noteService: mockNoteService,
            sessionService: mockSessionService
        });

        // Setup mock request and response objects for Express.js
        // Mock request object with a session and body
        mockReq = {
            session: {
                user: { id: 'test-user-id' }
            },
            body: {}
        };

        // Mock response object with send, status, render, and json methods
        mockRes = {
            send: jest.fn(),
            status: jest.fn().mockReturnThis(),
            render: jest.fn(),
            json: jest.fn()
        };
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
            mockReq.body.result = 'test-id';
            await controller.getExistingNote(mockReq, mockRes);
            
            expect(mockNoteService.getNote).toHaveBeenCalledWith('test-id');
            expect(mockRes.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'test-id',
                    content: 'Test content'
                })
            );
        });

        test('updates note content', async () => {
            mockReq.body = {
                id: 'test-id',
                content: 'Updated content'
            };

            await controller.updateNote(mockReq, mockRes);
            
            expect(mockNoteService.updateNote).toHaveBeenCalledWith(
                'test-id',
                expect.objectContaining({ content: 'Updated content' })
            );
        });
    });

    // Error Handling Tests
    describe('Error Handling', () => {
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
});