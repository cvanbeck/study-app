import { jest } from '@jest/globals';
import NotesController from '../../controllers/NotesController.js';
import Note from '../../models/Note.js';
import NoteService from '../../services/NoteService.js';

// Mock the NoteService module
jest.mock('../../services/NoteService.js');

describe('NotesController', () => {
    let controller;
    let mockNoteService;
    let mockSessionService;
    let mockDbContext;
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock the database context
        mockDbContext = {
            query: jest.fn().mockResolvedValue([{ id: 'test-id', name: '', content: '{"ops":[]}' }])
        };

        // Create a real NoteService instance with mock DB
        mockNoteService = new NoteService(mockDbContext);

        // Mock the NoteService methods
        mockNoteService.storeNote = jest.fn().mockImplementation(async (note) => {
            return note;
        });

        mockNoteService.getNote = jest.fn().mockImplementation(async (id) => {
            return new Note({ id, content: 'Test content' });
        });

        mockNoteService.updateNote = jest.fn().mockImplementation(async (id, data) => {
            return new Note({ id, ...data });
        });

        mockSessionService = {
            validateSession: jest.fn().mockResolvedValue(true)
        };

        // Create controller with mocked services
        controller = new NotesController({
            db: mockDbContext,
            noteService: mockNoteService,
            sessionService: mockSessionService
        });

        // Mock request and response objects
        mockReq = {
            session: {
                user: { id: 'test-user-id' }
            },
            body: {}
        };

        mockRes = {
            send: jest.fn(),
            status: jest.fn().mockReturnThis(),
            render: jest.fn()
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