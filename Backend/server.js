if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const express = require('express');
const app = express();
const port = process.env.PORT // 8080
const dbURI = process.env.MONGODB_URI;

const workoutsRoutes = require('./routes/workouts');

const path = require('path');

// // Tell Express that the 'views' folder is one level up (..)
// app.set('views', path.join(__dirname, '../views'));
// app.set('view engine', 'ejs'); // Tell Express to use EJS
// app.use(express.static(path.join(__dirname, '../public')));

// Middleware
const cors = require('cors'); // 1. Import it
app.use(cors({
    origin: ['http://localhost:5173', 'https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
})); // 2. Use it as middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // This is for parsing JSON bodies in POST requests

app.use('/', workoutsRoutes); // Use the workouts routes for all requests to the root URL

// Listen on PORT 8080
app.listen(port, () => {
    console.log(`✅ Server live at http://localhost:${port}`);
});

// Connect to MongoDB Atlas
mongoose.connect(dbURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => {
        console.error('❌ Database connection error:', err);
        process.exit(1); // This stops the "infinite loading" if the database fails
    });
