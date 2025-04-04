// models/NavOptions.js
export default class NavOptions {
    constructor(data = {}) {
        this.overrideShowInNavbar = data.overrideShowInNavbar === undefined ? true : data.overrideShowInNavbar;
        this.priority = data.priority || 0;
        this.customNavText = data.customNavText || "";
    }
}