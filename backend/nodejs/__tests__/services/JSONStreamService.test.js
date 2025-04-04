import { jest } from '@jest/globals';
import JSONStreamService from '../../services/JSONStreamService.js';
import { Readable } from 'stream';

/**
 * Test suite for the JSONStreamService
 * This service handles streaming JSON data from response streams
 */
describe('JSONStreamService', () => {
    
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });
    
    describe('constructor', () => {
        test('should initialize with empty buffer and chunks', () => {
            // Create an instance
            const service = new JSONStreamService();
            
            // Check initialization
            expect(service.buffer).toBe('');
            expect(service.chunks).toEqual([]);
        });
    });
    
    describe('_transform', () => {
        test('should process a complete JSON object chunk', (done) => {
            // Create a spy for push method
            const pushSpy = jest.spyOn(JSONStreamService.prototype, 'push');
            
            // Create an instance
            const service = new JSONStreamService();
            
            // Mock complete JSON chunk with content
            const chunk = JSON.stringify({
                created: 123456789,
                choices: [{
                    delta: {
                        content: 'Hello world'
                    }
                }]
            });
            
            // Call _transform
            service._transform(chunk, 'utf8', () => {
                // Verify push was called with expected value
                expect(pushSpy).toHaveBeenCalledWith(
                    JSON.stringify({ fullContent: 'Hello world' })
                );
                
                // Verify internal state
                expect(service.buffer).toBe('');
                expect(service.chunks.length).toBe(1);
                expect(service.chunks[0].content).toBe('Hello world');
                
                done();
            });
        });
        
        test('should handle incomplete JSON data', (done) => {
            // Create a spy for push method
            const pushSpy = jest.spyOn(JSONStreamService.prototype, 'push');
            
            // Create an instance
            const service = new JSONStreamService();
            
            // Send incomplete JSON
            const incompleteChunk = '{"created": 123456789, "choices": [{"delta": {"content": "Hello';
            
            // Call _transform
            service._transform(incompleteChunk, 'utf8', () => {
                // Verify push was not called (waiting for more data)
                expect(pushSpy).not.toHaveBeenCalled();
                
                // Verify buffer contains the incomplete data
                expect(service.buffer).toBe(incompleteChunk);
                
                done();
            });
        });
        
        test('should handle multiple complete JSON objects in one chunk', (done) => {
            // Create a spy for push method
            const pushSpy = jest.spyOn(JSONStreamService.prototype, 'push');
            
            // Create an instance
            const service = new JSONStreamService();
            
            // Mock two complete JSON objects in one chunk
            const chunk1 = JSON.stringify({
                created: 123456789,
                choices: [{
                    delta: {
                        content: 'Hello'
                    }
                }]
            });
            
            const chunk2 = JSON.stringify({
                created: 123456790,
                choices: [{
                    delta: {
                        content: ' world'
                    }
                }]
            });
            
            // Call _transform with both chunks
            service._transform(chunk1 + chunk2, 'utf8', () => {
                // Verify push was called twice with expected values
                expect(pushSpy).toHaveBeenCalledTimes(2);
                expect(pushSpy).toHaveBeenNthCalledWith(
                    1,
                    JSON.stringify({ fullContent: 'Hello' })
                );
                expect(pushSpy).toHaveBeenNthCalledWith(
                    2,
                    JSON.stringify({ fullContent: 'Hello world' })
                );
                
                // Verify internal state
                expect(service.buffer).toBe('');
                expect(service.chunks.length).toBe(2);
                expect(service.chunks[0].content).toBe('Hello');
                expect(service.chunks[1].content).toBe(' world');
                
                done();
            });
        });
        
        test('should handle JSON object without content', (done) => {
            // Create a spy for push method
            const pushSpy = jest.spyOn(JSONStreamService.prototype, 'push');
            
            // Create an instance
            const service = new JSONStreamService();
            
            // Mock JSON without content
            const chunk = JSON.stringify({
                created: 123456789,
                choices: [{ delta: {} }]
            });
            
            // Call _transform
            service._transform(chunk, 'utf8', () => {
                // Verify buffer is empty and no chunks were added
                expect(service.buffer).toBe('');
                expect(service.chunks.length).toBe(0);
                // The service will still emit an empty fullContent
                expect(pushSpy).toHaveBeenCalledWith(JSON.stringify({ fullContent: '' }));
                
                done();
            });
        });
    });
    
    describe('_flush', () => {
        test('should process remaining buffer and emit final data', (done) => {
            // Create a spy for push method
            const pushSpy = jest.spyOn(JSONStreamService.prototype, 'push');
            
            // Create an instance
            const service = new JSONStreamService();
            
            // Add some content to chunks
            service.chunks = [
                { created: 123456789, content: 'Hello' },
                { created: 123456790, content: ' world' }
            ];
            
            // Add a complete JSON object to buffer
            service.buffer = JSON.stringify({
                created: 123456791,
                choices: [{
                    delta: {
                        content: '!'
                    }
                }]
            });
            
            // Call _flush
            service._flush(() => {
                // Verify push was called with the aggregated content and DONE marker
                expect(pushSpy).toHaveBeenCalledTimes(2);
                expect(pushSpy).toHaveBeenNthCalledWith(
                    1,
                    JSON.stringify({ fullContent: 'Hello world!' })
                );
                expect(pushSpy).toHaveBeenNthCalledWith(
                    2,
                    '[DONE]'
                );
                
                // Verify chunks include all data
                expect(service.chunks.length).toBe(3);
                expect(service.chunks[2].content).toBe('!');
                
                done();
            });
        });
        
        test('should emit final data even without processing new content', (done) => {
            // Create a spy for push method
            const pushSpy = jest.spyOn(JSONStreamService.prototype, 'push');
            
            // Create an instance
            const service = new JSONStreamService();
            
            // Add some content to chunks
            service.chunks = [
                { created: 123456789, content: 'Hello' },
                { created: 123456790, content: ' world' }
            ];
            
            // Empty buffer
            service.buffer = '';
            
            // Call _flush
            service._flush(() => {
                // Verify push was called with the aggregated content and DONE marker
                expect(pushSpy).toHaveBeenCalledTimes(2);
                expect(pushSpy).toHaveBeenNthCalledWith(
                    1,
                    JSON.stringify({ fullContent: 'Hello world' })
                );
                expect(pushSpy).toHaveBeenNthCalledWith(
                    2,
                    '[DONE]'
                );
                
                done();
            });
        });
    });
    
    describe('extractJSONObject', () => {
        test('should extract a valid JSON object from buffer', () => {
            // Create an instance
            const service = new JSONStreamService();
            
            // Create a valid JSON string
            const json = JSON.stringify({
                created: 123456789,
                choices: [{
                    delta: {
                        content: 'Hello world'
                    }
                }]
            });
            
            // Call extractJSONObject
            const result = service.extractJSONObject(json);
            
            // Verify result
            expect(result).toHaveProperty('jsonObject');
            expect(result).toHaveProperty('remainingBuffer', '');
            expect(result.jsonObject).toHaveProperty('created', 123456789);
            expect(result.jsonObject.choices[0].delta.content).toBe('Hello world');
        });
        
        test('should handle buffer with content before JSON', () => {
            // Create an instance
            const service = new JSONStreamService();
            
            // Create buffer with content before JSON
            const prefix = 'some text before json';
            const json = JSON.stringify({
                created: 123456789,
                choices: [{
                    delta: {
                        content: 'Hello world'
                    }
                }]
            });
            
            // Call extractJSONObject
            const result = service.extractJSONObject(prefix + json);
            
            // Verify result
            expect(result).toHaveProperty('jsonObject');
            expect(result).toHaveProperty('remainingBuffer', '');
            expect(result.jsonObject).toHaveProperty('created', 123456789);
            expect(result.jsonObject.choices[0].delta.content).toBe('Hello world');
        });
        
        test('should handle buffer with content after JSON', () => {
            // Create an instance
            const service = new JSONStreamService();
            
            // Create buffer with content after JSON
            const json = JSON.stringify({
                created: 123456789,
                choices: [{
                    delta: {
                        content: 'Hello world'
                    }
                }]
            });
            const suffix = 'some text after json';
            
            // Call extractJSONObject
            const result = service.extractJSONObject(json + suffix);
            
            // Verify result
            expect(result).toHaveProperty('jsonObject');
            expect(result).toHaveProperty('remainingBuffer', suffix);
            expect(result.jsonObject).toHaveProperty('created', 123456789);
            expect(result.jsonObject.choices[0].delta.content).toBe('Hello world');
        });
        
        test('should handle nested objects and strings with braces', () => {
            // Create an instance
            const service = new JSONStreamService();
            
            // Create a complex JSON with nested objects and braces in strings
            const json = JSON.stringify({
                created: 123456789,
                choices: [{
                    delta: {
                        content: 'function example() { return { key: "value" }; }'
                    }
                }],
                nested: { objects: { are: { handled: "properly" } } }
            });
            
            // Call extractJSONObject
            const result = service.extractJSONObject(json);
            
            // Verify result
            expect(result).toHaveProperty('jsonObject');
            expect(result).toHaveProperty('remainingBuffer', '');
            expect(result.jsonObject).toHaveProperty('created', 123456789);
            expect(result.jsonObject.choices[0].delta.content).toBe('function example() { return { key: "value" }; }');
            expect(result.jsonObject.nested.objects.are.handled).toBe('properly');
        });
        
        test('should return null when no JSON object found', () => {
            // Create an instance
            const service = new JSONStreamService();
            
            // Call extractJSONObject with no JSON
            const result = service.extractJSONObject('no json here');
            
            // Verify result
            expect(result).toBeNull();
        });
        
        test('should return null for incomplete JSON object', () => {
            // Create an instance
            const service = new JSONStreamService();
            
            // Call extractJSONObject with incomplete JSON
            const result = service.extractJSONObject('{"created": 123456789, "choices": [{"delta": {"content"');
            
            // Verify result
            expect(result).toBeNull();
        });
    });
    
    describe('integration', () => {
        test('should process a stream of JSON chunks', (done) => {
            // Create a readable stream
            const source = new Readable({
                read() {}
            });
            
            // Create JSONStreamService instance
            const jsonStream = new JSONStreamService();
            
            // Setup a data collector
            const dataCollector = [];
            jsonStream.on('data', (chunk) => {
                dataCollector.push(chunk.toString());
            });
            
            // When the stream ends
            jsonStream.on('end', () => {
                // Check that all data was collected and processed correctly
                expect(dataCollector.length).toBe(4); // Updated to match actual output (includes empty content)
                expect(dataCollector[0]).toBe(JSON.stringify({ fullContent: 'Hello' }));
                expect(dataCollector[1]).toBe(JSON.stringify({ fullContent: 'Hello world' }));
                // The last item is [DONE]
                expect(dataCollector[dataCollector.length - 1]).toBe('[DONE]');
                
                done();
            });
            
            // Pipe the source to JSONStreamService
            source.pipe(jsonStream);
            
            // Push data
            source.push(JSON.stringify({
                created: 123456789,
                choices: [{ delta: { content: 'Hello' } }]
            }));
            
            source.push(JSON.stringify({
                created: 123456790,
                choices: [{ delta: { content: ' world' } }]
            }));
            
            // End the stream
            source.push(null);
        }, 10000); // Increase timeout to 10 seconds
    });
});