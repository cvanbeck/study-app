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

      // Map the index route for each controller; 'home' controller maps to '/'
      const route = controllerName === 'home' ? '/' : `/${controllerName}`;
      console.log(`Mapping route: ${route} -> ${controllerName}/index.ejs`);

      router.get(route, async (req, res) => {
        try {
          if (controller.index && typeof controller.index === 'function') {
            const data = await controller.index(req, res, appData);
            // Only render once
            if (!res.headersSent) {
              res.render(`${controllerName}/index.ejs`, { ...appData, ...data });
            }
          } else {
            if (!res.headersSent) {
              res.render(`${controllerName}/index.ejs`, { ...appData });
            }
          }
        } catch (err) {
          console.error(`Error handling route ${route}:`, err);
          if (!res.headersSent) { // Ensure the response is sent only once
            res.status(500).send('Internal Server Error');
          }
        }
      });
    }

    app.use('/', router);
  } catch (err) {
    console.error('Error setting up routes:', err);
    throw err; // Rethrow to allow handling in the calling context
  }
}
