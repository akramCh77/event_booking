const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'bookinguser',
  password: process.env.DB_PASSWORD || 'bookingpass',
  database: process.env.DB_NAME || 'booking_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Création du pool de connexions
const pool = mysql.createPool(dbConfig);

// Vérification de la connexion à la base de données
pool.getConnection()
  .then(conn => {
    console.log('Connected to MariaDB database');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// Routes
// Récupérer toutes les réservations
app.get('/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, e.name as event_name 
      FROM bookings b 
      JOIN events e ON b.event_id = e.id
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
  }
});

// Récupérer une réservation par ID
app.get('/bookings/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, e.name as event_name 
      FROM bookings b 
      JOIN events e ON b.event_id = e.id 
      WHERE b.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la réservation' });
  }
});

// Récupérer les réservations pour un événement spécifique
app.get('/events/:eventId/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE event_id = ?',
      [req.params.eventId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching bookings for event:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réservations pour cet événement' });
  }
});

// Créer une nouvelle réservation (avec transaction et verrouillage)
app.post('/bookings', async (req, res) => {
  const { event_id, customer_name, seats_booked } = req.body;
  
  if (!event_id || !customer_name || !seats_booked || seats_booked <= 0) {
    return res.status(400).json({ 
      error: 'Tous les champs sont requis (event_id, customer_name, seats_booked) et seats_booked doit être positif' 
    });
  }
  
  let connection;
  
  try {
    // Obtenir une connexion pour la transaction
    connection = await pool.getConnection();
    
    // Commencer la transaction
    await connection.beginTransaction();
    
    // Récupérer l'événement avec un verrouillage FOR UPDATE
    const [events] = await connection.query(
      'SELECT * FROM events WHERE id = ? FOR UPDATE',
      [event_id]
    );
    
    if (events.length === 0) {
      await connection.rollback();
      await connection.release();
      return res.status(404).json({ error: 'Événement non trouvé' });
    }
    
    const event = events[0];
    
    // Vérifier la disponibilité des places
    if (event.available_seats < seats_booked) {
      await connection.rollback();
      await connection.release();
      return res.status(400).json({ 
        error: 'Pas assez de places disponibles',
        available: event.available_seats,
        requested: seats_booked 
      });
    }
    
    // Mettre à jour le nombre de places disponibles
    await connection.query(
      'UPDATE events SET available_seats = available_seats - ? WHERE id = ?',
      [seats_booked, event_id]
    );
    
    // Créer la réservation
    const [result] = await connection.query(
      'INSERT INTO bookings (event_id, customer_name, seats_booked) VALUES (?, ?, ?)',
      [event_id, customer_name, seats_booked]
    );
    
    // Valider la transaction
    await connection.commit();
    
    res.status(201).json({
      id: result.insertId,
      event_id,
      customer_name,
      seats_booked,
      event_name: event.name
    });
    
  } catch (error) {
    // En cas d'erreur, annuler la transaction
    if (connection) {
      await connection.rollback();
    }
    
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la réservation' });
  } finally {
    // Libérer la connexion
    if (connection) {
      await connection.release();
    }
  }
});

// Annuler une réservation (avec transaction et verrouillage)
app.delete('/bookings/:id', async (req, res) => {
  let connection;
  
  try {
    // Obtenir une connexion pour la transaction
    connection = await pool.getConnection();
    
    // Commencer la transaction
    await connection.beginTransaction();
    
    // Récupérer la réservation
    const [bookings] = await connection.query(
      'SELECT * FROM bookings WHERE id = ?',
      [req.params.id]
    );
    
    if (bookings.length === 0) {
      await connection.rollback();
      await connection.release();
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }
    
    const booking = bookings[0];
    
    // Récupérer l'événement avec verrouillage FOR UPDATE
    const [events] = await connection.query(
      'SELECT * FROM events WHERE id = ? FOR UPDATE',
      [booking.event_id]
    );
    
    if (events.length === 0) {
      await connection.rollback();
      await connection.release();
      return res.status(404).json({ error: 'Événement associé non trouvé' });
    }
    
    // Mettre à jour le nombre de places disponibles
    await connection.query(
      'UPDATE events SET available_seats = available_seats + ? WHERE id = ?',
      [booking.seats_booked, booking.event_id]
    );
    
    // Supprimer la réservation
    await connection.query(
      'DELETE FROM bookings WHERE id = ?',
      [req.params.id]
    );
    
    // Valider la transaction
    await connection.commit();
    
    res.status(204).send();
    
  } catch (error) {
    // En cas d'erreur, annuler la transaction
    if (connection) {
      await connection.rollback();
    }
    
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la réservation' });
  } finally {
    // Libérer la connexion
    if (connection) {
      await connection.release();
    }
  }
});

// Route pour vérifier l'état du service
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'booking-service' });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Booking service listening on port ${port}`);
});