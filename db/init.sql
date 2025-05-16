-- Création de la base de données si elle n'existe pas encore
CREATE DATABASE IF NOT EXISTS booking_db;
USE booking_db;

-- Table des événements
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  total_seats INT NOT NULL,
  available_seats INT NOT NULL,
  event_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  seats_booked INT NOT NULL,
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Insertion de quelques données pour les tests
INSERT INTO events (name, total_seats, available_seats, event_date) VALUES 
('Concert de Jazz', 100, 100, '2025-06-15 20:00:00'),
('Conférence Tech', 50, 50, '2025-06-20 10:00:00'),
('Spectacle de Danse', 200, 200, '2025-07-01 19:30:00');