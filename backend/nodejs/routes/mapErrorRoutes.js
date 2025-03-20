export default function mapErrorRoutes(app, appData) {
  // 404 handler
  app.use((req, res, next) => {
    res.status(404);

    if (req.accepts('html')) {
      res.render('errors/404', {
        ...appData,
        url: req.url,
        title: '404 - Page Not Found',
      });
      return;
    }

    if (req.accepts('json')) {
      res.json({ error: 'Not found' });
      return;
    }

    res.type('txt').send('Not found');
  });

  // 500 error handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err);

    res.status(err.status || 500);

    if (req.accepts('html')) {
      res.render('errors/500', {
        ...appData,
        error: process.env.NODE_ENV === 'production' ? {} : err,
        title: '500 - Internal Server Error',
        message:
          process.env.NODE_ENV === 'production'
            ? 'Something went wrong on our end. Please try again later.'
            : err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : '',
      });
      return;
    }

    if (req.accepts('json')) {
      res.json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
      });
      return;
    }

    res.type('txt').send(process.env.NODE_ENV === 'production' ? 'Server error' : err.message);
  });
}
