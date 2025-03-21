export default class Note {
    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.name = data.name || '';
        this.content = data.content || '{"ops":[]}'; // Empty quill content
    }

    setContent(content) {
        this.content = JSON.stringify(content);
    }

    getContent() {
        return this.content;
    }

    getID() {
        return this.id;
    }
}