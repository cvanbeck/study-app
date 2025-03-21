export default class VersionControlDelta {
    constructor(data = {}) {
        this.noteID = data.noteid;
        this.version = data.version;
        this.user = data.user || '';
        this.timestamp = data.timestamp || '';
        this.content = data.content || '{"ops":[]}'; // Empty quill content
    }

    setContent(delta) {
        this.delta = JSON.stringify(delta);
    }

    getContent() {
        return this.delta;
    }

    getNoteID() {
        return this.noteID;
    }
}