const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');



const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/SandiganDB';

mongoose.connect(dbURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => {
        console.error('❌ Database connection error:', err);
        process.exit(1); // This stops the "infinite loading" if the database fails
    });


app.set('view engine', 'ejs'); // Tell Express to use EJS
app.use(express.urlencoded({ extended: true })); // This helps read form data

app.get('/', (req, res) => {
    res.render('client/index'); // This looks for 'views/index.ejs'
});

// This handles the form submission
app.post('/book', (req, res) => {
    const data = req.body;
    console.log("New Booking Received:", data);
    res.send(`Successfully received booking for ${data.customerName}! Check your terminal.`);
});

app.listen(port, () => {
    console.log(`✅ Server live at http://localhost:${port}`);
});