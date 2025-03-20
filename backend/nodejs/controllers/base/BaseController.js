/**
 * Controller Template, to make it clearer for what is required in inheriting controllers
 */
export default class BaseController {
    // REQUIRED FOR ALL INHERITING CONTROLLERS
    constructor(appData) {

        // Make class abstract
        if (new.target === BaseController) {
            throw new Error("Cannot instantiate an abstract class.");
        }

        // Make appData parameter required in constructors
        if (!appData) {
            throw new Error("appData is required for the controller.");
        }

        this.appData = appData;

        // Make index function required in inheriting controllers
        if (typeof this.index !== "function") {
            throw new Error(`${this.constructor.name} must implement an index() method.`);
        }
    }

    
    /**
     * Binds a controller method with navigation options.
     * @param {string} methodName - The name of the method to bind.
     * @param {object} navOptions - Navigation options.
     *   {
     *      overrideShowInNavbar: boolean, // if false, the method won't show in the navbar
     *      priority: number,         // the priority for positioning (higher number first)
     *      customNavText: string          // the text to display
     *   }
     */
    bindNavMethod(methodName, navOptions = {}) {
        if (typeof this[methodName] !== "function") {
            throw new Error(`${this.constructor.name} does not have a method named ${methodName}`);
        }
        this[methodName] = this[methodName].bind(this);
        this[methodName].navOptions = navOptions;
    }

}