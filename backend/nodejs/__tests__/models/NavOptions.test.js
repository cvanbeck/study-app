import { jest } from '@jest/globals';
import NavOptions from '../../models/NavOptions.js';

/**
 * Test suite for the NavOptions model
 * Tests include:
 * - Creating navigation options with default values
 * - Creating navigation options with custom values
 */
describe('NavOptions Model', () => {
    // Test default initialization
    test('creates NavOptions with default values', () => {
        const navOptions = new NavOptions();
        
        expect(navOptions.overrideShowInNavbar).toBe(true);
        expect(navOptions.priority).toBe(0);
        expect(navOptions.customNavText).toBe("");
    });

    // Test initialization with custom values
    test('creates NavOptions with provided values', () => {
        const customData = {
            overrideShowInNavbar: false,
            priority: 10,
            customNavText: "Custom Text"
        };
        
        const navOptions = new NavOptions(customData);
        
        expect(navOptions.overrideShowInNavbar).toBe(false);
        expect(navOptions.priority).toBe(10);
        expect(navOptions.customNavText).toBe("Custom Text");
    });

    // Test partial initialization
    test('creates NavOptions with partial custom values', () => {
        const customData = {
            priority: 5
        };
        
        const navOptions = new NavOptions(customData);
        
        expect(navOptions.overrideShowInNavbar).toBe(true); // Default
        expect(navOptions.priority).toBe(5); // Custom
        expect(navOptions.customNavText).toBe(""); // Default
    });
});