// models/exampleItem.js
export default class ExampleItem {
    constructor(data = {}) {
        this.name = data.name || '';
        this.description = data.description || '';
        this.createdAt = data.createdAt || new Date();
    }
    
    getFormattedDate() {
        return this.createdAt.toLocaleDateString();
    }
}