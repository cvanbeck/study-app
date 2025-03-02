import express from 'express';
import { readdir } from 'fs/promises';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function setupRoutes(app, appData) {
  const router = express.Router();
  const controllersDir = join(__dirname, '..', 'controllers');

  try {
    const files = await readdir(controllersDir);

    console.log(`======`);
    for (const file of files) {
      if (!file.endsWith('Controller.js')) continue;

      const controllerName = basename(file, 'Controller.js').toLowerCase();
      
      // Import the controller module
      const controllerModule = await import(`../controllers/${file}`);
      
      // Get the controller class, handling both default and named exports
      let ControllerClass = controllerModule.default;
      
      // Check if what we imported is actually a constructor function/class
      if (typeof ControllerClass !== 'function' || !(/^\s*class\s+/.test(ControllerClass.toString()) || /\[native code\]/.test(ControllerClass.toString()))) {
        console.log(`Controller in ${file} is not a class, using as object instead`);
        
        // If it's not a class, use it as a regular object controller
        const controller = ControllerClass;
        
        // Set up route handler for each method in the controller
        for (const methodName in controller) {
          const method = controller[methodName];

          if (typeof method !== 'function') continue;

          // Determine the route based on the method name
          let route;
          if (methodName === 'index') {
            // For index methods, use the controller name as the base path
            route = controllerName === 'home' ? '/' : `/${controllerName}`;
          } else {
            // For other methods, append the method name to the controller path
            route = `/${controllerName}/${methodName}`;
          }

          console.log(`Mapping route: ${route} -> ${controllerName}/${methodName} (object method)`);

          // Register the route with Express
          setupRouteHandler(router, route, controllerName, methodName, (req, res) => {
            return method(req, res, appData);
          }, appData);
        }
        console.log(`======`);
      } else {
        // It's a proper class, instantiate it
        console.log(`Instantiating controller class from ${file}`);
        const controller = new ControllerClass(appData);

        // Get all method names from the class prototype
        const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
          .filter(name => 
            typeof controller[name] === 'function' && 
            name !== 'constructor'
          );

        // Set up route handler for each method in the controller
        for (const methodName of methodNames) {
          // Determine the route based on the method name
          let route;
          if (methodName === 'index') {
            route = controllerName === 'home' ? '/' : `/${controllerName}`;
          } else {
            route = `/${controllerName}/${methodName}`;
          }

          console.log(`> Mapping route: ${route} -> ${controllerName}/${methodName} (class method)`);

          // Register the route with Express
          setupRouteHandler(router, route, controllerName, methodName, (req, res) => {
            return controller[methodName].call(controller, req, res);
          }, appData);
        }
        console.log(`======`);
      }
    }

    app.use('/', router);

    // Add 404 handler - must be after all other routes
    app.use((req, res, next) => {
      res.status(404);
      
      // Respond with HTML
      if (req.accepts('html')) {
        res.render('errors/404', { 
          ...appData, 
          url: req.url, 
          title: '404 - Page Not Found' 
        });
        return;
      }
      
      // Respond with JSON
      if (req.accepts('json')) {
        res.json({ error: 'Not found' });
        return;
      }
      
      // Default to plain text
      res.type('txt').send('Not found');
    });

    // Add 500 error handler - must be the last error handled
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      
      // Set status to 500 if not already set
      res.status(err.status || 500);
      
      // Respond with HTML
      if (req.accepts('html')) {
        res.render('errors/500', {
          ...appData, 
          error: process.env.NODE_ENV === 'production' ? {} : err,
          title: '500 - Internal Server Error',
          message: process.env.NODE_ENV === 'production' ? "Something went wrong on our end. Please try again later." : err.message,
          stack: process.env.NODE_ENV !== 'production' ? err.stack : ''  // Only pass stack in development
        });
        return;
      }
      
      // Respond with JSON
      if (req.accepts('json')) {
        res.json({
          error: 'Server error',
          message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
        });
        return;
      }
      
      // Default to plain text
      res.type('txt').send(process.env.NODE_ENV === 'production' ? 'Server error' : err.message);
    });
    
  } catch (err) {
    console.error('Error setting up routes:', err);
    throw err;
  }
}

// Helper function to set up a route handler
function setupRouteHandler(router, route, controllerName, methodName, methodFn, appData) {
  router.all(route, async (req, res, next) => {
    try {
      // Create a wrapper for res.render that automatically adds the controller folder
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