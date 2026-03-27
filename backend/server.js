if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

const port = process.env.PORT // 4000
const dbURI = process.env.MONGODB_URI;

// Import routes
const bookingRoutes = require('./routes/bookingRoutes');

// Import employee routes
const employeeRoutes = require('./routes/employees');
const notificationRoutes = require('./routes/notificationRoutes');

const path = require('path');

// Middleware
const cors = require('cors'); // 1. Import it
app.use(cors({
    origin: ['http://localhost:5173', 'https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
})); // 2. Use it as middleware

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
});
app.set('io', io);

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // This is for parsing JSON bodies in POST requests

app.use('/api/booking', bookingRoutes); // Use the workouts routes for all requests to the root URL
app.use('/api/employees', employeeRoutes); // Use the employee routes for all requests to the /api/employees URL
app.use('/api/notifications', notificationRoutes); // Use the notifications route

// Listen on PORT
server.listen(port, () => {
    console.log(`✅ Server live at http://localhost:${port}`);
});

// Connect to MongoDB Atlas
mongoose.connect(dbURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => {
        console.error('❌ Database connection error:', err);
        process.exit(1); // This stops the "infinite loading" if the database fails
    });
