
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
// Récupérer tous les événements
app.get('/events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
});

// Récupérer un événement par ID
app.get('/events/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'événement' });
  }
});

// Créer un nouvel événement
app.post('/events', async (req, res) => {
  const { name, total_seats, event_date } = req.body;
  
  if (!name || !total_seats || !event_date) {
    return res.status(400).json({ error: 'Tous les champs sont requis (name, total_seats, event_date)' });
  }
  
  try {
    const [result] = await pool.query(
      'INSERT INTO events (name, total_seats, available_seats, event_date) VALUES (?, ?, ?, ?)',
      [name, total_seats, total_seats, event_date]
    );
    
    res.status(201).json({
      id: result.insertId,
      name,
      total_seats,
      available_seats: total_seats,
      event_date
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
  }
});

// Mettre à jour un événement
app.put('/events/:id', async (req, res) => {
  const { name, total_seats, available_seats, event_date } = req.body;
  const eventId = req.params.id;
  
  try {
    // Vérifier si l'événement existe
    const [event] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
    
    if (event.length === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }
    
    // Mettre à jour l'événement
    await pool.query(
      'UPDATE events SET name = ?, total_seats = ?, available_seats = ?, event_date = ? WHERE id = ?',
      [name, total_seats, available_seats, event_date, eventId]
    );
    
    res.json({
      id: parseInt(eventId),
      name,
      total_seats,
      available_seats,
      event_date
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'événement' });
  }
});

// Supprimer un événement
app.delete('/events/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
  }
});

// Route pour vérifier l'état du service
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'event-service' });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Event service listening on port ${port}`);
});