import { jest } from '@jest/globals';
import ChatController from '../../controllers/ChatController.js';
import ChatService from '../../services/ChatService.js';

// Mock ChatService
jest.mock('../../services/ChatService.js');

/**
 * ChatController Test Suite
 * 
 * Tests the chat controller functionality including:
 * - Base controller behavior
 * - Chat service integration
 * - Response streaming
 * - Error handling
 */
describe('ChatController', () => {
    let controller;
    let mockReq;
    let mockRes;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock ChatService methods
        ChatService.prototype.clearHistory = jest.fn();
        ChatService.prototype.getChatResponse = jest.fn();
        
        // Create controller instance
        controller = new ChatController({ title: 'Test Chat' });
        
        // Mock request and response
        mockReq = {
            body: {},
            session: {}
        };
        
        mockRes = {
            render: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        };

        // Silence console.error in tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.error
        console.error.mockRestore();
    });

    /**
     * Base Controller Tests
     * 
     * Verify that ChatController correctly extends BaseController
     * and implements required functionality.
     */
    describe('Base Controller Behavior', () => {
        test('requires appData in constructor', () => {
            expect(() => {
                new ChatController();
            }).toThrow('appData is required for the controller.');
        });

        test('creates ChatService instance', () => {
            expect(controller.chatService).toBeInstanceOf(ChatService);
        });
    });

    /**
     * Index Method Tests
     * 
     * Verify that the index method properly initializes
     * the chat page and clears history.
     */
    describe('Index Method', () => {
        test('clears chat history and renders index page', async () => {
            await controller.index(mockReq, mockRes);
            
            // Should clear history
            expect(controller.chatService.clearHistory).toHaveBeenCalled();
            
            // Should render index with appData
            expect(mockRes.render).toHaveBeenCalledWith('index', {
                title: 'Test Chat'
            });
        });
    });

    /**
     * Chat Response Tests
     * 
     * Verify chat response functionality including:
     * - Input validation
     * - Stream setup
     * - Response handling
     * - Error cases
     */
    describe('Chat Response', () => {
        let mockStream;

        beforeEach(() => {
            // Create mock event emitter for stream
            mockStream = {
                on: jest.fn((event, callback) => {
                    if (event === 'data') {
                        callback(Buffer.from('test response'));
                    }
                    if (event === 'end') {
                        callback();
                    }
                })
            };
            
            // Mock getChatResponse to return our stream
            ChatService.prototype.getChatResponse = jest.fn().mockResolvedValue(mockStream);
        });

        test('requires prompt parameter', async () => {
            mockReq.body = {}; // No prompt
            
            await controller.getChatResponse(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Prompt is required'
            });
        });

        test('sets correct SSE headers', async () => {
            mockReq.body = { prompt: 'test prompt' };
            
            await controller.getChatResponse(mockReq, mockRes);
            
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
        });

        test('streams chat response', async () => {
            mockReq.body = { 
                prompt: 'test prompt',
                mode: 'test mode'
            };
            
            await controller.getChatResponse(mockReq, mockRes);
            
            // Should call service with correct parameters
            expect(controller.chatService.getChatResponse).toHaveBeenCalledWith(
                'test prompt',
                'test mode'
            );
            
            // Should write response chunks
            expect(mockRes.write).toHaveBeenCalledWith('data: test response\n\n');
            
            // Should end response
            expect(mockRes.end).toHaveBeenCalled();
        });

        test('uses default mode when not specified', async () => {
            mockReq.body = { prompt: 'test prompt' };
            
            await controller.getChatResponse(mockReq, mockRes);
            
            expect(controller.chatService.getChatResponse).toHaveBeenCalledWith(
                'test prompt',
                'default'
            );
        });

        test('handles service errors', async () => {
            mockReq.body = { prompt: 'test prompt' };
            
            // Mock service error
            const error = new Error('Service error');
            ChatService.prototype.getChatResponse.mockRejectedValue(error);
            
            await controller.getChatResponse(mockReq, mockRes);
            
            expect(mockRes.write).toHaveBeenCalledWith(
                'data: Error occurred while fetching response\n\n'
            );
            expect(mockRes.end).toHaveBeenCalled();
        });
    });
});