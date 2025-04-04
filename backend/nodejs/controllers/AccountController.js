import NavOptions from "../models/NavOptions.js";
import BaseController from "./base/BaseController.js";
import crypto from "crypto";
import bcrypt from "bcrypt";

export default class AccountController extends BaseController {
    constructor(appData) {
        super(appData);
        
        this.dbContext = appData.db;

        this.bindNavMethod("login", new NavOptions({ overrideShowInNavbar: true, priority: 0, customNavText: "Login" }));
        this.bindNavMethod("register", new NavOptions({ overrideShowInNavbar: true, priority: 0, customNavText: "Register" }));
    }

    // GET /account – renders the account details edit form
    async index(req, res) {
        if (!req.session.user) {
            return res.redirect("/account/login");
        }
        return res.render("account/index.ejs", { ...this.appData, user: req.session.user });
    }

    // GET /account/login – renders the login page
    async login(req, res) {
        return res.render("account/login.ejs", { ...this.appData });
    }

    // GET /account/register – renders the registration page
    async register(req, res) {
        return res.render("account/register.ejs", { ...this.appData });
    }

    // POST /account/loginPost – handles login requests
    async loginPost(req, res) {
        const username = req.body.username;
        const password = req.body.password;
        let returnUrl = req.query.ReturnUrl || '/';

        // Constants for validation
        const MAX_USERNAME_LENGTH = 50;
        const MIN_PASSWORD_LENGTH = 6;
        const MAX_EMAIL_LENGTH = 254;
        const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!username || !password) {
            return res.status(400).json({ error: "Missing credentials" });
        }

        // Validate password length
        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ error: 'Password too short' });
        }

        // SQL injection check for all usernames
        const SQL_INJECTION_PATTERNS = [
            "'", "--", ";", "/*", "*/", "xp_",
            "SELECT", "DROP", "INSERT", "DELETE", "UPDATE"
        ];
        if (SQL_INJECTION_PATTERNS.some(pattern => 
            username.toUpperCase().includes(pattern))) {
            return res.status(400).json({ error: 'Username contains invalid characters' });
        }

        // First check if input looks like an email
        const isEmail = username.includes('@');
        
        if (isEmail) {
            // Validate email format and length
            if (!EMAIL_REGEX.test(username)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            if (username.length > MAX_EMAIL_LENGTH) {
                return res.status(400).json({ error: 'Email too long' });
            }
        } else {
            // Only validate username format if it's not an email
            if (username.length > MAX_USERNAME_LENGTH) {
                return res.status(400).json({ error: 'Username too long' });
            }
            if (!USERNAME_REGEX.test(username)) {
                return res.status(400).json({ error: 'Username contains invalid characters' });
            }
        }

        // Sanitize return URL
        try {
            if (!returnUrl || typeof returnUrl !== 'string') {
                returnUrl = '/';
            } else {
                // Check for protocol handlers or javascript
                if (returnUrl.toLowerCase().includes('javascript:') || 
                    returnUrl.includes('://') || 
                    returnUrl.startsWith('//')) {
                    returnUrl = '/';
                } else {
                    // Remove path traversal attempts
                    returnUrl = returnUrl.replace(/\.\./g, '');
                    
                    // Remove script tags and other potentially dangerous content
                    returnUrl = returnUrl.replace(/<[^>]*>/g, '');
                    
                    // Ensure it starts with a single /
                    returnUrl = '/' + returnUrl.replace(/^\/+/, '');
                }
            }
        } catch (e) {
            returnUrl = '/';
        }

        try {
            const db = await this.dbContext.dbPromise;
            // Check for user by either username or email (case-insensitive)
            const user = await db.get(
                "SELECT * FROM Users WHERE LOWER(UserName) = LOWER(?) OR LOWER(Email) = LOWER(?)", 
                [username, username]
            );
            
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Compare provided password with stored hash
            const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
            if (!isPasswordValid) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            req.session.user = user;

            return res.json({ 
                success: true, 
                returnUrl: returnUrl  
            });
        } catch (err) {
            console.error("Login error:", err);
            return res.status(500).json({ error: "Server error" });
        }
    }

    // POST /account/registerPost – handles new user registrations
    async registerPost(req, res) {
        console.log("Registration attempt:", { username: req.body.username, email: req.body.email });

        const { username, email, password, confirmPassword } = req.body;

        // Validate required fields
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Validate email format
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Validate email length
        const MAX_EMAIL_LENGTH = 254;
        if (email.length > MAX_EMAIL_LENGTH) {
            return res.status(400).json({ error: "Email too long" });
        }

        // Constants for validation
        const MAX_USERNAME_LENGTH = 50;
        const MIN_PASSWORD_LENGTH = 6;
        const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

        // Validate username
        if (username.length > MAX_USERNAME_LENGTH) {
            return res.status(400).json({ error: 'Username too long' });
        }

        if (!USERNAME_REGEX.test(username)) {
            return res.status(400).json({ error: 'Username contains invalid characters' });
        }

        // Validate password
        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ error: 'Password too short' });
        }

        // Check password match
        if (password !== confirmPassword) {
            console.log('Validation failed: Passwords do not match');
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        try {
            const db = await this.dbContext.dbPromise;

            // Check if username already exists
            const existingUser = await db.get("SELECT * FROM Users WHERE UserName = ?", [username]);
            if (existingUser) {
                console.log('Registration failed: Username already exists');
                return res.status(400).json({ error: "Username already exists" });
            }

            // Hash the password with bcrypt
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create a new user record
            const userId = crypto.randomBytes(16).toString("hex");
            await db.run(
                `INSERT INTO Users (
                    Id, 
                    UserName, 
                    NormalizedUserName, 
                    Email, 
                    NormalizedEmail, 
                    PasswordHash
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    username,
                    username.toUpperCase(),
                    email || null,
                    email ? email.toUpperCase() : null,
                    hashedPassword
                ]
            );

            console.log('Registration successful for user:', username);
            return res.json({ 
                success: true,
                message: "Registration successful",
                userId: userId
            });
        } catch (err) {
            console.error("Registration error:", err);
            return res.status(500).json({ 
                error: "Server error", 
                details: err.message 
            });
        }
    }

    // POST /account/editPost – handles account updates (e.g., updating password)
    async editPost(req, res) {
        if (!req.session.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    
        const { password, newPassword, confirmNewPassword } = req.body;
    
        if (!password || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ error: "All fields are required." });
        }
    
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ error: "New passwords do not match" });
        }
    
        try {
            const db = await this.dbContext.dbPromise;
            // Get current user details
            const user = await db.get("SELECT * FROM Users WHERE Id = ?", [req.session.user.Id]);
    
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
    
            // Compare current password with stored hash
            const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
            if (!isPasswordValid) {
                return res.status(401).json({ error: "Current password is incorrect" });
            }
    
            // Hash the new password before storing
            const saltRounds = 10;
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
            // Update password
            await db.run("UPDATE Users SET PasswordHash = ? WHERE Id = ?", [hashedNewPassword, user.Id]);
    
            // Update session user details
            req.session.user.PasswordHash = hashedNewPassword;
    
            return res.json({ success: true });
        } catch (err) {
            console.error("Edit account error:", err);
            return res.status(500).json({ error: "Server error" });
        }
    }    

    // GET /account/logout – handles user logout
    async logout(req, res) {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: "Could not log out" });
            }
            
            // Redirect to home page or login page after logout
            res.redirect('/account/login');
        });
    }
}