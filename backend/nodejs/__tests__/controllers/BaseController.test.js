/**
 * BaseController Test Suite
 * 
 * Tests the abstract base controller class that all other controllers extend from.
 * Verifies core controller functionality including:
 * - Abstract class behavior
 * - Constructor requirements
 * - Method requirements
 * - Navigation binding
 */

import BaseController from '../../controllers/base/BaseController.js';

describe('BaseController', () => {
    /**
     * Abstract Class Tests
     * 
     * Verify that BaseController behaves correctly as an abstract class
     * and enforces its contract with child classes.
     */
    describe('Abstract Class Behavior', () => {
        test('cannot instantiate BaseController directly', () => {
            // Should throw error when trying to create BaseController instance
            expect(() => {
                new BaseController({ title: 'Test' });
            }).toThrow('Cannot instantiate an abstract class.');
        });

        test('can instantiate child class with required methods', () => {
            // Create valid child class
            class ValidController extends BaseController {
                index() {} // Required method
            }

            // Should not throw when instantiating valid child
            expect(() => {
                new ValidController({ title: 'Test' });
            }).not.toThrow();
        });
    });

    /**
     * Constructor Tests
     * 
     * Verify that the constructor enforces its requirements
     * and properly initializes the controller.
     */
    describe('Constructor Requirements', () => {
        class TestController extends BaseController {
            index() {} // Required method
        }

        test('requires appData parameter', () => {
            expect(() => {
                new TestController();
            }).toThrow('appData is required for the controller.');

            expect(() => {
                new TestController(null);
            }).toThrow('appData is required for the controller.');
        });

        test('stores appData when provided', () => {
            const appData = { title: 'Test App' };
            const controller = new TestController(appData);
            expect(controller.appData).toBe(appData);
        });
    });

    /**
     * Method Requirements Tests
     * 
     * Verify that child classes are required to implement
     * necessary methods and that these methods work correctly.
     */
    describe('Method Requirements', () => {
        test('requires index method implementation', () => {
            class InvalidController extends BaseController {
                // Missing required index method
            }

            expect(() => {
                new InvalidController({ title: 'Test' });
            }).toThrow('InvalidController must implement an index() method.');
        });

        test('accepts class with index implementation', () => {
            class ValidController extends BaseController {
                index() {
                    return 'index page';
                }
            }

            expect(() => {
                new ValidController({ title: 'Test' });
            }).not.toThrow();
        });
    });

    /**
     * Navigation Tests
     * 
     * Verify that the navigation binding system works correctly,
     * including method binding and options storage.
     */
    describe('Navigation Binding', () => {
        class TestController extends BaseController {
            index() {}
            testMethod() {
                return 'test';
            }
        }

        let controller;
        beforeEach(() => {
            controller = new TestController({ title: 'Test' });
        });

        test('binds method with navigation options', () => {
            const navOptions = {
                overrideShowInNavbar: true,
                priority: 1,
                customNavText: 'Test Page'
            };

            controller.bindNavMethod('testMethod', navOptions);
            
            // Method should be bound
            expect(controller.testMethod.navOptions).toBe(navOptions);
            // Method should still work
            expect(controller.testMethod()).toBe('test');
        });

        test('throws error for non-existent method', () => {
            expect(() => {
                controller.bindNavMethod('nonExistentMethod');
            }).toThrow('TestController does not have a method named nonExistentMethod');
        });

        test('works with default empty options', () => {
            controller.bindNavMethod('testMethod');
            expect(controller.testMethod.navOptions).toEqual({});
        });

        test('preserves method functionality after binding', () => {
            const originalResult = controller.testMethod();
            controller.bindNavMethod('testMethod');
            expect(controller.testMethod()).toBe(originalResult);
        });
    });
});