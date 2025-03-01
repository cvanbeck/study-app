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
}