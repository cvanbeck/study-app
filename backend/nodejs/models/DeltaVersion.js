export default class DeltaVersion {
    constructor(data = {}) {
        this.noteID = data.id;
        this.version = data.version;
        this.user = data.user || '';
        this.Timestamp = data.Timestamp || '';
        this.delta = data.delta || '{"ops":[]}'; // Empty quill content
    }

    setDelta(delta) {
        this.delta = JSON.stringify(delta);
    }

    getContent() {
        return this.delta;
    }

    getNoteID() {
        return this.noteID;
    }


}