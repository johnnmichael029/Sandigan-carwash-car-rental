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

app.use(express.static('public'));
app.get('/', (req, res) => {

    const Pricelist = [
        { VehicleType = "Hatchback", Wash = 140, Wax = 400, Engine = 450 },
        { VehicleType = "Sedan", Wash = 150, Wax = 450, Engine = 500 },
        { VehicleType = "Compact / Changan", Wash = 180, Wax = 500, Engine = 550 },
        { VehicleType = "SUV", Wash = 250, Wax = 550, Engine = 600 },
        { VehicleType = "Pick Up / Travis", Wash = 280, Wax = 600, Engine = 650 },
        { VehicleType = "Van / L300", Wash = 280, Wax = 700, Engine = 750 },
        { VehicleType = "Jeep", Wash = 300, Wax = 750, Engine = 800 },
        { VehicleType = "Big Bike", Wash = 160, Wax = 250, Engine = 0 },
        { VehicleType = "Motorcycle (150cc)", Wash = 140, Wax = 200, Engine = 0 },
        { VehicleType = "Motorcycle (125cc)", Wash = 130, Wax = 150, Engine = 0 },
        { VehicleType = "Motorcycle (110cc)", Wash = 120, Wax = 100, Engine = 0 },
        { VehicleType = "Tricycle", Wash = 150, Wax = 0, Engine = 0 }
    ];

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