export default class InputForm {
    constructor(data = {}) {
        this.name = data.name || '';
        this.type = data.type || '';
        this.content = data.content || '';
    }

}