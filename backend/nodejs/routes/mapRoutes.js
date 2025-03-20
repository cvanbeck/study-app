import express from 'express';
import { readdir } from 'fs/promises';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import mapErrorRoutes from './mapErrorRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Sets up application routes by dynamically loading controller files and mapping their methods to Express routes.
 *
 * It reads the controllers directory, imports each controller, and then sets up the appropriate route handlers.
 * For class controllers, it instantiates the class and binds the methods; for object controllers, it uses the methods directly.
 *
 * @param {object} app - The Express application instance.
 * @param {object} appData - Data object to be passed to controllers and views.
 * @returns {Promise<void>} A promise that resolves when routes have been set up.
 */
export default async function setupRoutes(app, appData) {
  const router = express.Router();
  const controllersDir = join(__dirname, '..', 'controllers');
  app.locals.navLinks = []; // Store dynamic routes for navbar

  try {
    const files = await readdir(controllersDir);
    console.log(`======`);

    for (const file of files) {
      if (!file.endsWith('Controller.js')) continue;

      const controllerName = basename(file, 'Controller.js').toLowerCase();
      const controllerModule = await import(`../controllers/${file}`);
      let ControllerClass = controllerModule.default;

      // Check if what we imported is actually a constructor function/class
      if (isControllerAClass(ControllerClass)) {
        console.log(`Instantiating controller class from ${file}`);
        const controller = new ControllerClass(appData);

        // Get all method names from the class prototype, excluding constructor
        const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
          .filter(name => typeof controller[name] === 'function' && name !== 'constructor');

        for (const methodName of methodNames) {
          const route = processRouteMapping(app, controllerName, methodName, controller[methodName], 'Class method');
          setupRouteHandler(router, route, controllerName, methodName, (req, res) => controller[methodName].call(controller, req, res), appData);
        }
      } else {
        console.log(`Controller in ${file} is not a class, using as object instead`);
        const controller = ControllerClass;

        // Process each method on the object controller
        for (const methodName in controller) {
          const method = controller[methodName];
          if (typeof method !== 'function') continue;
          const route = processRouteMapping(app, controllerName, methodName, method, 'Object method');
          setupRouteHandler(router, route, controllerName, methodName, (req, res) => method(req, res, appData), appData);
        }
      }
      console.log(`======`);
    }

    app.use('/', router);

    // MUST BE CALLED AFTER defining all routes
    mapErrorRoutes(app, appData);
    
  } catch (err) {
    console.error('Error setting up routes:', err);
    throw err;
  }
}

/**
 * Checks if the provided value is a class constructor.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a class constructor; otherwise, false.
 */
function isControllerAClass(ControllerClass) {
  return typeof ControllerClass === 'function' || 
         (/^\s*class\s+/.test(ControllerClass.toString()) || 
         /\[native code\]/.test(ControllerClass.toString()));
}

/**
 * Processes the mapping of a controller method to a route and updates the application's navigation links if applicable.
 *
 * It determines if the method includes a render call or returns an object, and if so, adds the route to the app's navigation links.
 *
 * @param {object} app - The Express application instance.
 * @param {string} controllerName - The name of the controller.
 * @param {string} methodName - The name of the method.
 * @param {Function} methodFn - The controller method function.
 * @param {string} typeLabel - A label describing the type of method (e.g., "Object method" or "Class method").
 * @returns {string} The generated route path.
 */
function processRouteMapping(app, controllerName, methodName, methodFn, typeLabel) {
  const route = getRoute(controllerName, methodName);
  const methodString = methodFn.toString();
  const hasRenderCall = methodString.includes('res.render') && !methodString.includes('res.renderPartial');
  const returnsObject = methodString.includes('return {');
  console.log(`> Mapping route: ${route} -> ${controllerName}/${methodName} (${typeLabel})`);
  if ((hasRenderCall || returnsObject) && !app.locals.navLinks.includes(route)) {
    app.locals.navLinks.push(route);
    console.log(`  > Added to navLinks: ${route}`);
  }
  return route;
}

/**
 * Generates a route path based on the controller and method name.
 *
 * @param {string} controllerName - The name of the controller.
 * @param {string} methodName - The name of the method.
 * @returns {string} The generated route.
 */
function getRoute(controllerName, methodName) {
  return methodName === 'index'
    ? controllerName === 'home'
      ? '/'
      : `/${controllerName}`
    : `/${controllerName}/${methodName}`;
}

/**
 * Helper function to set up an Express route handler.
 *
 * It wraps the controller method execution in an async handler, enhancing the response object with custom render methods.
 *
 * @param {object} router - The Express router instance.
 * @param {string} route - The route path.
 * @param {string} controllerName - The name of the controller.
 * @param {string} methodName - The name of the method.
 * @param {Function} methodFn - The controller method function to handle the request.
 * @param {object} appData - Data object to be passed to the controller method and view.
 */
function setupRouteHandler(router, route, controllerName, methodName, methodFn, appData) {
  router.all(route, async (req, res, next) => {
    try {
      // Create a wrapper for res.render that automatically adds the controller folder to the view path
      const originalRender = res.render;
      res.render = function(view, options) {
        // Only prepend the controller name if the view doesn't already specify a complete path
        if (!view.startsWith('/') && !view.includes(':') && !view.startsWith('errors/')) {
          // If view doesn't include a slash, assume it's directly in the controller folder
          if (!view.includes('/')) {
            view = `${controllerName}/${view}`;
          }
          // If the view already has slashes but doesn't start with the controller name,
          // prepend the controller name to ensure we're looking in the right subfolder 
          else if (!view.startsWith(`${controllerName}/`)) {
            view = `${controllerName}/${view}`;
          }
          // Otherwise, the view already specifies a path within the controller directory
        }
        
        // Call the original render with the potentially modified view path
        return originalRender.call(res, view, options);
      };

      res.renderPartial = function(view, options) {
        options = { ...options, layout: false };
        return res.render(view, options);
      };

      // Call the controller method
      const data = await methodFn(req, res);

      // If the method returns data and hasn't ended the response, render the default view
      if (data && !res.headersSent && req.method === 'GET') {
        res.render(`${methodName}.ejs`, { ...appData, ...data });
      }
    } catch (err) {
      // Pass the error to Express error handler
      next(err);
    }
  });
}