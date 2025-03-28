--=== NOTES SECTION ===
-- Notes definition
CREATE TABLE Notes (
	Id CHAR(36) NOT NULL,
	Name varchar(50) NOT NULL,
	Content LONGTEXT,
	CONSTRAINT Notes_PK PRIMARY KEY (Id)
);

-- NoteVersionControl definition
CREATE TABLE "NoteVersionControl" (
	"NoteID"	TEXT,
	"Version"	INTEGER,
	"UserID"	TEXT,
	"Timestamp"	TEXT,
	"Content"	TEXT
);

-- SessionCodes definition
CREATE TABLE "SessionCodes" (
	"Code"	TEXT,
	"Page"	TEXT,
	"NoteID"	TEXT
);
--=== NOTES SECTION END ===

--=== USERS SECTION ===
-- Users definition
CREATE TABLE Users (
    Id TEXT PRIMARY KEY, 
    UserName TEXT UNIQUE NOT NULL,
    NormalizedUserName TEXT UNIQUE NOT NULL,
    Email TEXT UNIQUE,
    NormalizedEmail TEXT UNIQUE,
    EmailConfirmed INTEGER DEFAULT 0,
    PasswordHash TEXT,
    PhoneNumber TEXT,
    PhoneNumberConfirmed INTEGER DEFAULT 0,
    TwoFactorEnabled INTEGER DEFAULT 0
);

-- Roles definition
CREATE TABLE Roles (
    Id TEXT PRIMARY KEY, 
    Name TEXT UNIQUE NOT NULL,
    NormalizedName TEXT UNIQUE NOT NULL
);

-- UserRoles definition
CREATE TABLE UserRoles (
    UserId TEXT NOT NULL,
    RoleId TEXT NOT NULL,
    PRIMARY KEY (UserId, RoleId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE
);

-- RolePermissions definition
CREATE TABLE RolePermissions (
    RoleId TEXT NOT NULL,
    PermissionId TEXT NOT NULL,
    PRIMARY KEY (RoleId, PermissionId),
    FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
    FOREIGN KEY (PermissionId) REFERENCES Permissions(Id) ON DELETE CASCADE
);

-- UserPermissions definition
CREATE TABLE UserPermissions (
    Id TEXT PRIMARY KEY, 
    Name TEXT UNIQUE NOT NULL,
    Description TEXT
);
--=== USERS SECTION END ===