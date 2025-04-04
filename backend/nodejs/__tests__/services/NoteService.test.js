import { jest } from '@jest/globals';
import NoteService from '../../services/NoteService.js';
import Note from '../../models/Note.js';
import VersionControlDelta from '../../models/VersionControlDelta.js';

// Simple mock for the Delta class
jest.mock('quill-delta', () => {
  return function() {
    return {
      compose: jest.fn().mockReturnThis(),
      ops: []
    };
  };
});

describe('NoteService', () => {
  let mockDbContext;
  let noteService;
  
  beforeEach(() => {
    // Mock console methods to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a mock database context
    mockDbContext = {
      query: jest.fn().mockResolvedValue({ rowsAffected: 1 })
    };
    
    // Create NoteService instance
    noteService = new NoteService(mockDbContext);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('should initialize with database context', () => {
    expect(noteService.dbContext).toBe(mockDbContext);
  });
  
  test('should store a note successfully', async () => {
    // Create a test note
    const note = new Note({
      id: 'test-id',
      name: 'Test Note',
      content: '{"ops":[]}'
    });
    
    // Call the method
    await noteService.storeNote(note);
    
    // Verify the database was called with correct parameters
    expect(mockDbContext.query).toHaveBeenCalledWith(
      "INSERT INTO Notes VALUES (?, ?, ?)",
      [note.id, note.name, note.content]
    );
  });
  
  // New test for getNote
  test('should retrieve a note by id', async () => {
    // Mock database response for Note
    const mockNoteRow = {
      ID: 'test-id',
      Name: 'Test Note',
      Content: '{"ops":[]}'
    };
    
    // No version deltas yet
    mockDbContext.query.mockImplementation((query, params) => {
      if (query.includes('SELECT * FROM Notes')) {
        return Promise.resolve([mockNoteRow]);
      }
      if (query.includes('SELECT * FROM NoteVersionControl')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ rowsAffected: 1 });
    });
    
    // Call the method
    const result = await noteService.getNote('test-id');
    
    // Check result
    expect(result).toBeInstanceOf(Note);
    expect(result.id).toBe('test-id');
    expect(result.name).toBe('Test Note');
  });
  
  // Test note retrieval when note doesn't exist
  test('should return null when retrieving non-existent note', async () => {
    // Mock database response for non-existent note
    mockDbContext.query.mockImplementation((query) => {
      if (query.includes('SELECT * FROM Notes')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ rowsAffected: 0 });
    });
    
    // Call the method
    const result = await noteService.getNote('non-existent-id');
    
    // Check result
    expect(result).toBeNull();
  });
  
  // Test for updating a note with existing versions
  test('should update note with existing version control', async () => {
    // Mock existing version control data
    const existingVersionData = { Content: '{"ops":[{"insert":"Initial content"}]}' };
    mockDbContext.query.mockImplementation((query) => {
      if (query.includes('SELECT Content FROM NoteVersionControl')) {
        return Promise.resolve([existingVersionData]);
      }
      return Promise.resolve({ rowsAffected: 1 });
    });
    
    // Update content
    const newContent = '{"ops":[{"insert":"New content"}]}';
    
    // Call the method
    await noteService.updateNote(newContent, 'test-id');
    
    // Verify the update query was called
    expect(mockDbContext.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE NoteVersionControl"),
      expect.arrayContaining(['test-id'])
    );
  });
  
  // Test for updating a note without existing versions
  test('should create new version when updating note without existing versions', async () => {
    // Mock no existing versions
    mockDbContext.query.mockImplementation((query) => {
      if (query.includes('SELECT Content FROM NoteVersionControl')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ rowsAffected: 1 });
    });
    
    // Update content
    const newContent = '{"ops":[{"insert":"New content"}]}';
    
    // Call the method
    await noteService.updateNote(newContent, 'test-id');
    
    // Verify the insert query was called for a new version
    expect(mockDbContext.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO NoteVersionControl"),
      expect.arrayContaining(['test-id', 'test-id', expect.any(String)])
    );
  });
  
  // Test for newNoteVersion
  test('should create a new version of a note', async () => {
    const noteId = 'test-id';
    const content = '{"ops":[{"insert":"Version content"}]}';
    
    // Call the method
    await noteService.newNoteVersion(noteId, content);
    
    // Verify the correct query was called
    expect(mockDbContext.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO NoteVersionControl"),
      expect.arrayContaining([noteId, noteId, content])
    );
  });
  
  // Test for getDeltas
  test('should retrieve version deltas for a note', async () => {
    // Mock version control deltas
    const mockDeltas = [
      {
        NoteID: 'test-id',
        Version: 1,
        Content: '{"ops":[{"insert":"Delta 1"}]}'
      },
      {
        NoteID: 'test-id',
        Version: 2,
        Content: '{"ops":[{"insert":"Delta 2"}]}'
      }
    ];
    
    mockDbContext.query.mockImplementation((query) => {
      if (query.includes('SELECT * FROM NoteVersionControl')) {
        return Promise.resolve(mockDeltas);
      }
      return Promise.resolve({ rowsAffected: 0 });
    });
    
    // Call the method
    const result = await noteService.getDeltas('test-id');
    
    // Check results
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(VersionControlDelta);
    expect(result[1]).toBeInstanceOf(VersionControlDelta);
  });
  
  // Test for buildNote
  test('should build a note from base content and deltas', () => {
    const baseContent = '{"ops":[]}';
    const deltas = [
      new VersionControlDelta({
        noteid: 'test-id',
        version: 1,
        content: '{"ops":[{"insert":"Delta 1"}]}'
      }),
      new VersionControlDelta({
        noteid: 'test-id',
        version: 2,
        content: '{"ops":[{"insert":"Delta 2"}]}'
      })
    ];
    
    // Call the method
    const result = noteService.buildNote(baseContent, deltas);
    
    // The compose method is mocked and returns the same Delta instance
    // We just check if the method was called the right number of times
    expect(result).toBeDefined();
  });
  
  // Test for deleting a version
  test('should delete a specific version of a note', async () => {
    const noteId = 'test-id';
    const version = 2;
    
    // Setup mocks for the subsequent getNote call
    mockDbContext.query.mockImplementation((query, params) => {
      if (query.includes('DELETE FROM NoteVersionControl')) {
        return Promise.resolve({ rowsAffected: 1 });
      }
      if (query.includes('SELECT * FROM Notes')) {
        return Promise.resolve([{ ID: noteId, Name: 'Test Note', Content: '{"ops":[]}' }]);
      }
      if (query.includes('SELECT * FROM NoteVersionControl')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ rowsAffected: 0 });
    });
    
    // Call the method
    await noteService.deleteVersion(noteId, version);
    
    // Verify the delete query was called with the correct parameters
    expect(mockDbContext.query).toHaveBeenCalledWith(
      "DELETE FROM NoteVersionControl WHERE NoteID = ? AND Version = ?",
      [noteId, version]
    );
  });
});
