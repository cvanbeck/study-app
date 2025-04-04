import { jest } from '@jest/globals';
import ChatService from '../../services/ChatService.js';

// Override console.error to prevent error messages during tests
console.error = jest.fn();

// Mock dependencies but don't import them at the top level
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ data: { pipe: jest.fn() } }))
}));

jest.mock('../../services/JSONStreamService.js', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    pipe: jest.fn()
  }));
});

describe('ChatService', () => {
  let chatService;

  beforeEach(() => {
    // Create a fresh instance of the service
    chatService = new ChatService();
  });

  // Basic functionality tests
  test('initializes with empty conversation history', () => {
    expect(chatService.conversationHistory).toEqual([]);
  });

  test('clears conversation history', () => {
    chatService.conversationHistory = [{ role: 'user', content: 'test message' }];
    chatService.clearHistory();
    expect(chatService.conversationHistory).toEqual([]);
  });

  // Test prompt formatting
  test('formats prompt for steps mode', () => {
    // Call the method but don't await it - we just want to check the immediate synchronous effect
    chatService.getChatResponse('test question', 'steps');
    
    // Check that the correctly formatted message was added to history
    expect(chatService.conversationHistory[0]).toEqual({
      role: 'user',
      content: 'Explain in a step by step format: test question'
    });
  });

  test('formats prompt for example mode', () => {
    chatService.getChatResponse('test question', 'example');
    expect(chatService.conversationHistory[0]).toEqual({
      role: 'user',
      content: 'Explain with a real world example: test question'
    });
  });
  
  test('formats prompt for flashcards mode', () => {
    chatService.getChatResponse('test question', 'flashcards');
    expect(chatService.conversationHistory[0]).toEqual({
      role: 'user',
      content: 'Generate 10 questions and answers on this subject: test question'
    });
  });
  
  test('leaves prompt unchanged for default mode', () => {
    chatService.getChatResponse('test question', 'default');
    expect(chatService.conversationHistory[0]).toEqual({
      role: 'user',
      content: 'test question'
    });
  });

  // Error handling test
  test('rejects empty prompts', () => {
    return expect(chatService.getChatResponse('', 'default')).rejects.toThrow('Prompt is required');
  });
});
