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

    getFormattedDateAndTime() {
        return this.createdAt.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // Use 24-hour format
        });
    }
}
