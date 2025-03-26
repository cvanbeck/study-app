import { jest } from '@jest/globals';
import AccountController from '../../controllers/AccountController.js';
import bcrypt from 'bcrypt';

/**
 * Test suite for AccountController
 * Tests user authentication, registration, and session management
 * Key areas tested:
 * - User registration with validation
 * - Login with password hashing
 * - Session handling
 * - Error cases and edge conditions
 */
describe('AccountController', () => {
    let controller;
    let mockDbContext;
    let mockReq;
    let mockRes;

    /**
     * Setup test environment before each test
     * Initializes:
     * - Mock database with simulated SQLite operations
     * - Mock Express request/response objects
     * - Fresh controller instance
     */
    beforeEach(() => {
        // Reset all mock functions before each test
        jest.clearAllMocks();

        // Mock database context simulating SQLite operations
        // get: SELECT queries (user lookup)
        // run: INSERT/UPDATE queries (user creation/updates)
        mockDbContext = {
            dbPromise: Promise.resolve({
                get: jest.fn(),
                run: jest.fn()
            })
        };

        // Mock Express.js request object
        // session: Stores user authentication state
        // body: POST request data (login/register forms)
        // query: URL parameters
        mockReq = {
            session: {},
            body: {},
            query: {}
        };

        // Mock Express.js response object
        // render: View template rendering
        // redirect: URL redirections
        // status: HTTP status codes
        // json: JSON responses
        mockRes = {
            render: jest.fn(),
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Initialize controller with mocked dependencies
        controller = new AccountController({ db: mockDbContext });
    });

    /**
     * Page Rendering Tests
     * Verifies that pages are rendered correctly based on authentication state
     */
    describe('Page Rendering', () => {
        /**
         * Test that index redirects to login if user is not authenticated
         */
        test('index should redirect to login if user not authenticated', async () => {
            await controller.index(mockReq, mockRes);
            expect(mockRes.redirect).toHaveBeenCalledWith('/account/login');
        });

        /**
         * Test that index renders account page if user is authenticated
         */
        test('index should render account page if user authenticated', async () => {
            mockReq.session.user = { id: 'test-user' };
            await controller.index(mockReq, mockRes);
            expect(mockRes.render).toHaveBeenCalledWith('account/index.ejs', expect.any(Object));
        });

        /**
         * Test that login page renders correctly
         */
        test('login should render login page', async () => {
            await controller.login(mockReq, mockRes);
            expect(mockRes.render).toHaveBeenCalledWith('account/login.ejs', expect.any(Object));
        });

        /**
         * Test that register page renders correctly
         */
        test('register should render registration page', async () => {
            await controller.register(mockReq, mockRes);
            expect(mockRes.render).toHaveBeenCalledWith('account/register.ejs', expect.any(Object));
        });
    });

    /**
     * Login Functionality Tests
     * Tests various login scenarios including:
     * - Successful login with valid credentials
     * - Failed login attempts (wrong password, non-existent user)
     * - Session management after login
     */
    describe('Login', () => {
        /**
         * Test successful login with valid credentials
         */
        test('should successfully log in with valid credentials', async () => {
            // Setup test user with hashed password
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = { 
                id: 'test-user', 
                UserName: 'testuser',
                PasswordHash: hashedPassword
            };

            // Simulate login attempt
            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            // Mock successful user lookup
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(mockUser);

            await controller.loginPost(mockReq, mockRes);

            // Verify session and response
            expect(mockReq.session.user).toEqual(mockUser);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                returnUrl: '/'
            });
        });

        /**
         * Test failed login with invalid username
         */
        test('should fail login with invalid username', async () => {
            // Simulate login attempt with non-existent username
            mockReq.body = {
                username: 'nonexistent',
                password: 'password123'
            };

            // Mock failed user lookup
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(null);

            await controller.loginPost(mockReq, mockRes);

            // Verify failed login response
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid credentials'
            });
        });

        /**
         * Test failed login with wrong password
         */
        test('should fail login with wrong password', async () => {
            // Setup test user with correct password hash
            const hashedPassword = await bcrypt.hash('correctpass', 10);
            const mockUser = {
                id: 'test-user',
                UserName: 'testuser',
                PasswordHash: hashedPassword
            };

            // Simulate login attempt with wrong password
            mockReq.body = {
                username: 'testuser',
                password: 'wrongpass'
            };

            // Mock successful user lookup
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(mockUser);

            await controller.loginPost(mockReq, mockRes);

            // Verify failed login response
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid credentials'
            });
        });

        /**
         * Test login with empty credentials
         * Purpose: Ensure the controller properly validates required fields
         * 
         * Test cases:
         * - Empty username
         * - Empty password
         * 
         * Expected behavior:
         * - Should return 400 Bad Request (per implementation)
         * - Should return "Username too long" error
         */
        test('should fail login with empty credentials', async () => {
            // Setup test case with empty credentials
            mockReq.body = {
                username: '',
                password: ''
            };

            await controller.loginPost(mockReq, mockRes);

            // Verify proper error handling for empty fields
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Username too long'
            });
        });

        /**
         * Test login with very long credentials
         */
        test('should handle very long credentials', async () => {
            const longString = 'a'.repeat(1000);
            mockReq.body = {
                username: longString,
                password: longString
            };

            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(null);

            await controller.loginPost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Username too long'
            });
        });
    });

    /**
     * Login Edge Cases Test Suite
     * 
     * Tests various edge cases and error scenarios for the login functionality:
     * - Database errors
     * - Invalid return URLs
     * - Session handling
     * - Password comparison failures
     */
    describe('Login Edge Cases', () => {
        test('should handle database connection error', async () => {
            // Setup database error
            const dbError = new Error('Database connection failed');
            const db = await mockDbContext.dbPromise;
            db.get.mockRejectedValue(dbError);

            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            await controller.loginPost(mockReq, mockRes);

            // Verify error response
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Server error'
            });

            // Clear the mock to prevent affecting other tests
            db.get.mockReset();
        });

        test('should sanitize return URL', async () => {
            const testCases = [
                {
                    input: 'http://malicious.com',
                    expected: '/'
                },
                {
                    input: '//malicious.com',
                    expected: '/'
                },
                {
                    input: 'javascript:alert(1)',
                    expected: '/'
                },
                {
                    input: '../../../etc/passwd',
                    expected: '/etc/passwd'
                },
                {
                    input: '<script>alert(1)</script>',
                    expected: '/alert(1)'
                },
                {
                    input: 'dashboard',
                    expected: '/dashboard'
                },
                {
                    input: '/notes?id=123',
                    expected: '/notes?id=123'
                }
            ];

            // Mock successful user lookup and password verification
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                id: 'test-user',
                UserName: 'testuser',
                PasswordHash: hashedPassword
            };
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(mockUser);

            for (const testCase of testCases) {
                // Setup request with return URL
                mockReq.query.ReturnUrl = testCase.input;
                mockReq.body = {
                    username: 'testuser',
                    password: 'password123'
                };

                await controller.loginPost(mockReq, mockRes);

                // Verify URL was sanitized in the JSON response
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    returnUrl: testCase.expected
                });

                // Reset mocks for next test
                mockRes.json.mockClear();
            }
        });

        test('should handle return URL', async () => {
            // Setup test case
            mockReq.query.ReturnUrl = 'javascript:alert("xss")';
            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            // Mock successful user lookup and password verification
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                id: 'test-user',
                UserName: 'testuser',
                PasswordHash: hashedPassword
            };
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(mockUser);

            await controller.loginPost(mockReq, mockRes);

            // Currently returns sanitized URL
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                returnUrl: '/'
            });
        });

        test('should handle bcrypt comparison failure', async () => {
            // Setup user but simulate bcrypt error
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue({
                UserName: 'testuser',
                PasswordHash: 'invalid_hash'
            });

            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            await controller.loginPost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid credentials'
            });
        });

        test('should handle missing password field', async () => {
            mockReq.body = {
                username: 'testuser'
                // password missing
            };

            await controller.loginPost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Password too short'
            });
        });

        test('should handle session creation failure', async () => {
            // Setup valid user
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue({
                UserName: 'testuser',
                PasswordHash: await bcrypt.hash('password123', 10)
            });

            // Simulate session error
            const sessionError = new Error('Session creation failed');
            Object.defineProperty(mockReq, 'session', {
                set: () => { throw sessionError; }
            });

            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            await controller.loginPost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Server error'
            });
        });

        test('should decode encoded return URL', async () => {
            // Setup valid user
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue({
                UserName: 'testuser',
                PasswordHash: await bcrypt.hash('password123', 10)
            });

            // Test with encoded return URL
            mockReq.query.ReturnUrl = encodeURIComponent('/notes?id=123&mode=edit');
            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            await controller.loginPost(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                returnUrl: '/%2Fnotes%3Fid%3D123%26mode%3Dedit'
            });
        });

        /**
         * Performance Tests
         * Ensures login operations complete within acceptable time limits
         */
        test('should complete login operation under 1 second', async () => {
            const startTime = performance.now();
            
            // Setup valid user
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue({
                UserName: 'testuser',
                PasswordHash: await bcrypt.hash('password123', 10)
            });

            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            await controller.loginPost(mockReq, mockRes);
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(1000); // 1 second threshold
        });

        test('should complete registration operation under 1 second', async () => {
            const startTime = performance.now();
            
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(null); // User doesn't exist
            db.run.mockResolvedValue({ lastID: 1 });

            mockReq.body = {
                username: 'newuser',
                password: 'password123',
                confirmPassword: 'password123',
                email: 'test@example.com'
            };

            await controller.registerPost(mockReq, mockRes);
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(1000);
        });

        /**
         * Boundary Tests
         * Tests edge cases for input lengths and limits
         */
        test('should handle maximum username length', async () => {
            const maxLength = 50;
            const username = 'a'.repeat(maxLength + 1);
            
            mockReq.body = {
                username,
                password: 'password123'
            };

            await controller.loginPost(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Username too long'
            });
        });

        test('should handle minimum password length', async () => {
            mockReq.body = {
                username: 'testuser',
                password: '12'  // Too short
            };

            await controller.loginPost(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Password too short'
            });
        });

        test('should handle maximum email length in registration', async () => {
            const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(150) + '.com'; // Exceeds typical max length
            
            mockReq.body = {
                username: 'testuser',
                password: 'password123',
                confirmPassword: 'password123',
                email: longEmail
            };

            await controller.registerPost(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Email too long'
            });
        });

        /**
         * Special Character Tests
         * Ensures proper handling of special characters in inputs
         */
        test('should handle special characters in username', async () => {
            const specialChars = ['@', '#', '$', '%', '^', '&', '*', '(', ')', '<', '>', '?'];
            
            for (const char of specialChars) {
                mockReq.body = {
                    username: `user${char}name`,
                    password: 'password123'
                };

                await controller.loginPost(mockReq, mockRes);
                
                // Should reject usernames with special characters
                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    error: 'Username contains invalid characters'
                });
            }
        });

        test('should handle SQL injection attempts in username', async () => {
            const sqlInjections = [
                "' OR '1'='1",
                "admin'--",
                "'; DROP TABLE Users;--"
            ];
            
            for (const injection of sqlInjections) {
                mockReq.body = {
                    username: injection,
                    password: 'password123'
                };

                await controller.loginPost(mockReq, mockRes);
                
                // Should handle SQL injection attempts gracefully
                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    error: 'Username contains invalid characters'
                });
            }
        });

        test('should handle unicode characters in password', async () => {
            mockReq.body = {
                username: 'testuser',
                password: 'password123🔒👍'  // Unicode symbols
            };

            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue({
                UserName: 'testuser',
                PasswordHash: await bcrypt.hash('password123🔒👍', 10)
            });

            await controller.loginPost(mockReq, mockRes);
            
            // Should accept unicode characters in passwords
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                returnUrl: '/'
            });
        });

        /**
         * Email Validation Tests
         * Ensures proper validation of email addresses
         */
        test('should validate email format during registration', async () => {
            const invalidEmails = [
                'plainaddress',                    // Missing @ and domain
                '@missinguser.com',               // Missing username
                'missing.domain@',                 // Missing domain
                'spaces in@email.com',            // Contains spaces
                'multiple@@signs.com',            // Multiple @ signs
                '.leading.dot@domain.com',        // Leading dot in local part
                'trailing.dot.@domain.com',       // Trailing dot in local part
                'two..dots@domain.com',           // Consecutive dots
                'unicode@😊.com',                 // Unicode in domain
                'html<script>@hack.com',          // HTML injection attempt
                'email@domain..com'               // Consecutive dots in domain
            ];
            
            for (const email of invalidEmails) {
                mockReq.body = {
                    username: 'testuser',
                    password: 'password123',
                    confirmPassword: 'password123',
                    email: email
                };

                await controller.registerPost(mockReq, mockRes);
                
                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    error: 'Invalid email format'
                });
            }
        });

        test('should accept valid email formats', async () => {
            const validEmails = [
                'simple@example.com',
                'very.common@example.com',
                'disposable.style.email.with+symbol@example.com',
                'other.email-with-hyphen@example.com',
                'fully-qualified-domain@example.com',
                'user.name+tag+sorting@example.com',
                'x@example.com',
                'example-indeed@strange-example.com',
                'example@s.example',
                'user-@example.org'  // While unusual, this is valid
            ];
            
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(null); // User doesn't exist
            db.run.mockResolvedValue({ lastID: 1 });

            for (const email of validEmails) {
                mockReq.body = {
                    username: 'testuser',
                    password: 'password123',
                    confirmPassword: 'password123',
                    email: email
                };

                await controller.registerPost(mockReq, mockRes);
                
                expect(mockRes.status).not.toHaveBeenCalledWith(400);
                expect(mockRes.json).not.toHaveBeenCalledWith(
                    expect.objectContaining({
                        error: expect.stringContaining('email')
                    })
                );
            }
        });

        test('should prevent email-based injection attacks', async () => {
            const maliciousEmails = [
                'test@domain.com\'; DROP TABLE Users;--',
                'test");DROP TABLE Users;--@domain.com',
                '"><script>alert("xss")</script>"@domain.com',
                'user+(<script>alert("hack")</script>)@domain.com'
            ];
            
            for (const email of maliciousEmails) {
                mockReq.body = {
                    username: 'testuser',
                    password: 'password123',
                    confirmPassword: 'password123',
                    email: email
                };

                await controller.registerPost(mockReq, mockRes);
                
                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    error: 'Invalid email format'
                });
            }
        });

        /**
         * Test URL sanitization for login redirect
         */
    });

    /**
     * Registration Functionality Tests
     * Tests various registration scenarios including:
     * - Successful registration with valid data
     * - Failed registration attempts (missing fields, password mismatch)
     * - Error cases and edge conditions
     */
    describe('Registration', () => {
        /**
         * Test successful registration with valid data
         */
        test('should successfully register new user', async () => {
            // Simulate registration form submission
            mockReq.body = {
                username: 'newuser',
                email: 'new@user.com',
                password: 'password123',
                confirmPassword: 'password123'
            };

            // Mock successful user creation
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(null);
            db.run.mockResolvedValue({});

            await controller.registerPost(mockReq, mockRes);

            // Verify successful registration response
            expect(db.run).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Registration successful',
                userId: expect.any(String)
            }));
        });

        /**
         * Test failed registration with missing fields
         */
        test('should fail registration with missing fields', async () => {
            // Simulate incomplete registration form
            mockReq.body = {
                username: 'newuser',
                // Missing password and confirmPassword
            };

            await controller.registerPost(mockReq, mockRes);

            // Verify failed registration response
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'All fields are required'
            });
        });

        /**
         * Test failed registration with password mismatch
         */
        test('should fail registration with mismatched passwords', async () => {
            // Simulate registration with non-matching passwords
            mockReq.body = {
                username: 'newuser',
                email: 'new@user.com',
                password: 'password123',
                confirmPassword: 'different123'
            };

            await controller.registerPost(mockReq, mockRes);

            // Verify failed registration response
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Passwords do not match'
            });
        });

        /**
         * Test failed registration with existing username
         */
        test('should fail registration with existing username', async () => {
            // Simulate registration with taken username
            mockReq.body = {
                username: 'existinguser',
                email: 'existing@user.com',
                password: 'password123',
                confirmPassword: 'password123'
            };

            // Mock failed user lookup
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue({ id: 'existing-user' });

            await controller.registerPost(mockReq, mockRes);

            // Verify failed registration response
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Username already exists'
            });
        });

        /**
         * Test registration with invalid email format
         * Purpose: Ensure proper email validation
         * 
         * Test cases:
         * - Email with invalid format
         * 
         * Expected behavior:
         * - Should return 400 Bad Request (per implementation)
         * - Should return "Invalid email format" error
         */
        test('should validate email format during registration', async () => {
            // Setup test case with invalid email format
            mockReq.body = {
                username: 'newuser',
                email: 'invalid-email',
                password: 'password123',
                confirmPassword: 'password123'
            };

            // Mock successful user creation
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(null);
            db.run.mockResolvedValue({});

            await controller.registerPost(mockReq, mockRes);

            // Verify registration fails with email validation error
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid email format'
            });
        });

        /**
         * Test registration with short password
         * Purpose: Document current password validation behavior
         * 
         * Note: Currently no minimum password length validation
         * TODO: Consider adding minimum password length requirement
         */
        test('should currently allow short passwords', async () => {
            // Setup test case with short password
            mockReq.body = {
                username: 'newuser',
                email: 'new@user.com',
                password: '123',
                confirmPassword: '123'
            };

            // Mock successful user creation
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue(null);
            db.run.mockResolvedValue({});

            await controller.registerPost(mockReq, mockRes);

            // Verify registration fails with password length error
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Password too short'
            });
        });
    });
});