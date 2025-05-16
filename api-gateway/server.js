const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Configuration des services
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';

// Middleware
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Proxy pour le service d'événements
app.use('/api/events', createProxyMiddleware({
  target: EVENT_SERVICE_URL,
  pathRewrite: {
    '^/api/events': '/events'
  },
  changeOrigin: true
}));

// Proxy pour le service de réservations
app.use('/api/bookings', createProxyMiddleware({
  target: BOOKING_SERVICE_URL,
  pathRewrite: {
    '^/api/bookings': '/bookings'
  },
  changeOrigin: true
}));

// Proxy pour les réservations par événement
app.use('/api/events/:eventId/bookings', createProxyMiddleware({
  target: BOOKING_SERVICE_URL,
  pathRewrite: (path, req) => {
    const eventId = req.params.eventId;
    return `/events/${eventId}/bookings`;
  },
  changeOrigin: true
}));

// Route pour vérifier l'état de l'API Gateway
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Documentation de l'API simple
app.get('/api', (req, res) => {
  res.json({
    message: 'API Gateway pour l\'application de réservation d\'événements',
    endpoints: {
      events: {
        'GET /api/events': 'Liste tous les événements',
        'GET /api/events/:id': 'Récupère un événement par ID',
        'POST /api/events': 'Crée un nouvel événement',
        'PUT /api/events/:id': 'Met à jour un événement existant',
        'DELETE /api/events/:id': 'Supprime un événement'
      },
      bookings: {
        'GET /api/bookings': 'Liste toutes les réservations',
        'GET /api/bookings/:id': 'Récupère une réservation par ID',
        'GET /api/events/:eventId/bookings': 'Liste les réservations pour un événement spécifique',
        'POST /api/bookings': 'Crée une nouvelle réservation',
        'DELETE /api/bookings/:id': 'Annule une réservation'
      }
    }
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Une erreur est survenue sur le serveur',
    message: err.message
  });
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
  console.log(`Event Service URL: ${EVENT_SERVICE_URL}`);
  console.log(`Booking Service URL: ${BOOKING_SERVICE_URL}`);
});