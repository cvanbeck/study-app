import express from 'express';
import { readdir } from 'fs/promises';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import mapErrorRoutes from './mapErrorRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function handleAuthentication(router) {
  // Authentication middleware to check login status
  router.use(async (req, res, next) => {
    // Skip authentication for specific account routes
    const publicAccountRoutes = ['/account/login', '/account/register'];
    const isPublicAccountRoute = publicAccountRoutes.includes(req.path);

    // Skip authentication for account routes or if route is already public
    if (isPublicAccountRoute || req.method === 'POST') {
      return next();
    }

    // Check if the route is part of the account controller
    const isAccountRoute = req.path.startsWith('/account');

    // Check if user is logged in
    const isAuthenticated = req.session && req.session.user;

    if (!isAuthenticated && !isAccountRoute) {
      // Ensure we don't create an endless redirect loop
      // Remove any existing account/ prefixes from the current path
      let cleanPath = req.originalUrl.replace(/^\/account\//, '/');

      // Construct the return URL
      const returnUrl = encodeURIComponent(cleanPath);

      return res.redirect(`/account/login?ReturnUrl=${returnUrl}`);
    }

    next();
  });
}

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

  handleAuthentication(router);

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
 *  - `/^\s*class\s+/` checks if the string representation starts with `class`,
 *      allowing for optional leading whitespace.
 *  - `/\[native code\]/` checks if the function is a built-in (native) class,
 *      as native classes are often represented with `[native code]` in their string output.
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

  const navOptions = methodFn.navOptions || {};
  const showInNavbar = navOptions.overrideShowInNavbar !== false;
  const navText = navOptions.customNavText ||
    (methodName === 'index'
      ? controllerName === 'home' ? 'Home' : capitalizeFirstLetter(controllerName)
      : methodName);
  const priority = navOptions.priority || 0;

  // Regex to check for res.render return calls in the method (excluding res.renderPartial)
  const isViewRoute = /res\.render(?!Partial)|return\s+{/.test(methodString);

  // Logic for whether the item should show in the navbar. Can be overriden by the MethodOptions if bound.
  const forceAdd = navOptions.overrideShowInNavbar === true;
  const shouldAddToNav = (isViewRoute || forceAdd) && showInNavbar;

  console.log(`> Mapping route: ${route} -> ${controllerName}/${methodName} (${typeLabel})`);

  if (shouldAddToNav) {
    if (!app.locals.navLinks.some(link => link.route === route)) {
      app.locals.navLinks.push({ route, navText, priority });
      console.log(`  > Added to navLinks: ${route} with text "${navText}" and [PRIORITY ${priority}]`);
    }
  }

  return route;
}

/**
 * Returns the passed in string with the first letter capitalized.
 * @param {*} string The text to modify.
 * @returns The passed text with the first letter capitalized.
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
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
      // Enhance res.render to prepend the controller name if necessary
      const originalRender = res.render;
      res.render = function (viewPath, options) {
        if (shouldPrependControllerToPath(viewPath, controllerName)) {
          viewPath = `${controllerName}/${viewPath}`;
        }
        return originalRender.call(res, viewPath, options);
      };

      // Custom function to render pages without layout, unnecessary but i find it cleaner (bappity)
      res.renderPartial = (view, options) => res.render(view, { ...options, layout: false });

      // Call the controller method
      const data = await methodFn(req, res);

      // Auto-render view if method returns data, response isn't sent, and it's a GET request
      if (data && !res.headersSent && req.method === 'GET') {
        res.render(`${methodName}.ejs`, { ...appData, ...data });
      }
    } catch (err) {
      // Pass the error to Express error handler
      next(err);
    }
  });
}

/**
 * Determines whether the controller name should be prepended to the view path.
 *
 * The regex `/^\/|:|errors\//` checks if:
 * - The view path starts with `/` (absolute path).
 * - The view path contains `:` (absolute path).
 * - The view path starts with `errors/` (global error templates path).
 *
 * If none of these conditions are met and the view doesn't already start with the controller name,
 * the controller name is prepended to ensure the correct subfolder is used.
 *
 * @param {string} viewPath - The view path provided in res.render.
 * @param {string} controllerName - The name of the controller.
 * @returns {boolean} True if the controller name should be prepended, false otherwise.
 */
function shouldPrependControllerToPath(viewPath, controllerName) {
  return !/^\/|:|errors\//.test(viewPath) && !viewPath.startsWith(`${controllerName}/`);
}