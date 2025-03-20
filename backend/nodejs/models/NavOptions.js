// models/NavOptions.js
export default class NavOptions {
    constructor(data = {}) {
        this.overrideShowInNavbar = data.overrideShowInNavbar || true;
        this.priority = data.priority || 0;
        this.customNavText = data.customNavText || "";
    }
}