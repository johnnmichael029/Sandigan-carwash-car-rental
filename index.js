const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');



// Connect to MongoDB (SandiganDB will be created automatically)
mongoose.connect('mongodb://localhost:27017/SandiganDB')
    .then(() => console.log('✅ Success: Connected to MongoDB!'))
    .catch(err => console.error('❌ Database connection error:', err));

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