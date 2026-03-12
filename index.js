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

app.use(express.static('public/css/style.css'));
app.get('/', (req, res) => {
    res.render('client/index'); // This looks for 'views/index.ejs'
});

const bookingSchema = new mongoose.Schema({
    customerName: String,
    plateNumber: String,
    service: String
});

const Booking = mongoose.model('Booking', bookingSchema);

// This handles the form submission
app.post('/book', async (req, res) => {
    try {
        const newBooking = new Booking({
            customerName: req.body.customerName,
            plateNumber: req.body.plateNumber,
            service: req.body.service
        });

        // This is the line that actually puts it in Atlas!
        await newBooking.save();

        console.log("✅ Saved to MongoDB:", newBooking);
        res.send(`Successfully saved booking for ${req.body.customerName} to the database!`);
    } catch (err) {
        console.error("❌ Error saving to DB:", err);
        res.status(500).send("Error saving booking.");
    }
});

app.listen(port, () => {
    console.log(`✅ Server live at http://localhost:${port}`);
});