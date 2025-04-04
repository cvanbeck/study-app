import { jest } from '@jest/globals';
import ExampleItem from '../../models/ExampleItem.js';

/**
 * Test suite for the ExampleItem model
 * Tests include:
 * - Creating items with default values
 * - Creating items with custom values
 * - Date formatting methods
 */
describe('ExampleItem Model', () => {
    // Setup mock date for consistent testing
    const mockDate = new Date('2023-01-01T12:00:00Z');
    
    beforeEach(() => {
        // Mock Date constructor
        global.Date = jest.fn(() => mockDate);
        global.Date.now = jest.fn(() => mockDate.getTime());
    });
    
    afterEach(() => {
        // Clean up mock
        jest.restoreAllMocks();
    });
    
    // Test default initialization
    test('creates ExampleItem with default values', () => {
        const item = new ExampleItem();
        
        expect(item.name).toBe('');
        expect(item.description).toBe('');
        expect(item.createdAt).toEqual(mockDate);
    });

    // Test initialization with custom values
    test('creates ExampleItem with provided values', () => {
        const customDate = new Date('2022-06-15T15:30:00Z');
        const customData = {
            name: 'Test Item',
            description: 'This is a test item',
            createdAt: customDate
        };
        
        const item = new ExampleItem(customData);
        
        expect(item.name).toBe('Test Item');
        expect(item.description).toBe('This is a test item');
        expect(item.createdAt).toEqual(customDate);
    });

    // Test getFormattedDate method
    test('getFormattedDate returns formatted date', () => {
        const item = new ExampleItem();
        
        // Mock toLocaleDateString for consistent testing
        const mockFormattedDate = '01/01/2023';
        mockDate.toLocaleDateString = jest.fn(() => mockFormattedDate);
        
        expect(item.getFormattedDate()).toBe(mockFormattedDate);
        expect(mockDate.toLocaleDateString).toHaveBeenCalled();
    });

    // Test getFormattedDateAndTime method
    test('getFormattedDateAndTime returns formatted date and time', () => {
        const item = new ExampleItem();
        
        // Mock toLocaleString for consistent testing
        const mockFormattedDateTime = '01/01/2023, 12:00:00';
        mockDate.toLocaleString = jest.fn(() => mockFormattedDateTime);
        
        expect(item.getFormattedDateAndTime()).toBe(mockFormattedDateTime);
        expect(mockDate.toLocaleString).toHaveBeenCalledWith('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // Use 24-hour format
        });
    });
});