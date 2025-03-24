import NavOptions from "../models/NavOptions.js";
import BaseController from "./base/BaseController.js";
import crypto from "crypto";

export default class AccountController extends BaseController {
    constructor(appData) {
        super(appData);
        
        this.dbContext = appData.db;

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
        const { username, password } = req.body;
        try {
            const db = await this.dbContext.dbPromise;
            const user = await db.get("SELECT * FROM Users WHERE UserName = ?", [username]);

            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // NOTE: Comparing plain text passwords for demo purposes.
            if (user.PasswordHash !== password) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            req.session.user = user;
            return res.json({ success: true });
        } catch (err) {
            console.error("Login error:", err);
            return res.status(500).json({ error: "Server error" });
        }
    }

    // POST /account/register – handles new user registrations
    async registerPost(req, res) {
        const { username, email, password, confirmPassword } = req.body;

        // Validate required fields
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        try {
            const db = await this.dbContext.dbPromise;

            // Check if username already exists
            const existingUser = await db.get("SELECT * FROM Users WHERE UserName = ?", [username]);
            if (existingUser) {
                return res.status(400).json({ error: "Username already exists" });
            }

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
                    password // In production, use a hashed password
                ]
            );

            return res.json({ success: true });
        } catch (err) {
            console.error("Registration error:", err);
            return res.status(500).json({ error: "Server error" });
        }
    }

    // POST /account/edit – handles account updates (e.g., updating password)
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

            if (user.PasswordHash !== password) {
                return res.status(401).json({ error: "Current password is incorrect" });
            }

            // Update password
            await db.run("UPDATE Users SET PasswordHash = ? WHERE Id = ?", [newPassword, user.Id]);
            // Optionally update the session user details
            req.session.user.PasswordHash = newPassword;

            return res.json({ success: true });
        } catch (err) {
            console.error("Edit account error:", err);
            return res.status(500).json({ error: "Server error" });
        }
    }
}