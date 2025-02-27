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

    for (const file of files) {
      if (!file.endsWith('Controller.js')) continue;

      const controllerName = basename(file, 'Controller.js').toLowerCase();
      // Import the controller module
      const { default: controller } = await import(`../controllers/${file}`);

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
        
        console.log(`Mapping route: ${route} -> ${controllerName}/${methodName}`);
        
        // Register the route with Express
        router.all(route, async (req, res) => {
          try {
            // Create a wrapper for res.render that automatically adds the controller folder
            const originalRender = res.render;
            res.render = function(view, options) {
              // If view doesn't include a folder path, prepend the controller name
              if (!view.includes('/')) {
                view = `${controllerName}/${view}`;
              }
              return originalRender.call(res, view, options);
            };
            
            // Call the controller method
            const data = await method(req, res, appData);
            
            // If the method returns data and hasn't ended the response, render the default view
            if (data && !res.headersSent && req.method === 'GET') {
              res.render(`${methodName}.ejs`, { ...appData, ...data });
            }
          } catch (err) {
            console.error(`Error handling route ${route}:`, err);
            if (!res.headersSent) { // Ensure the response is sent only once
              res.status(500).send('Internal Server Error');
            }
          }
        });
      }
    }

    app.use('/', router);
  } catch (err) {
    console.error('Error setting up routes:', err);
    throw err; // Rethrow to allow handling in the calling context
  }
}