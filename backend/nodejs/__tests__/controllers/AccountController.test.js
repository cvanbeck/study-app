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
         * - Should return 401 Unauthorized (per implementation)
         * - Should return "Invalid credentials" error
         */
        test('should fail login with empty credentials', async () => {
            // Setup test case with empty credentials
            mockReq.body = {
                username: '',
                password: ''
            };

            await controller.loginPost(mockReq, mockRes);

            // Verify proper error handling for empty fields
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid credentials'
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

            expect(mockRes.status).toHaveBeenCalledWith(401);
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

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Server error'
            });
        });

        test('should handle return URL', async () => {
            // Setup valid user
            const db = await mockDbContext.dbPromise;
            db.get.mockResolvedValue({
                UserName: 'testuser',
                PasswordHash: await bcrypt.hash('password123', 10)
            });

            // Test with potentially malicious return URL
            // TODO: This test currently documents existing behavior
            // but the controller should be updated to sanitize URLs
            const maliciousUrl = 'javascript:alert("xss")';
            mockReq.query.ReturnUrl = maliciousUrl;
            mockReq.body = {
                username: 'testuser',
                password: 'password123'
            };

            await controller.loginPost(mockReq, mockRes);

            // Currently returns unsanitized URL - this behavior needs to be fixed
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                returnUrl: maliciousUrl
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

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid credentials'
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

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                returnUrl: '/notes?id=123&mode=edit'
            }));
        });
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
                error: expect.any(String),
                debug: expect.any(Object)
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
         * - Should still allow registration (per implementation)
         * - Email is optional in current implementation
         */
        test('should allow registration with invalid email', async () => {
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

            // Verify registration proceeds (email validation not implemented)
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Registration successful'
            }));
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

            // Verify registration succeeds (no length validation yet)
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Registration successful'
            }));
        });
    });
});