const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qm6ghoc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
  try {
    const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOptions');
    const bookingsCollection = client.db('doctorsPortal').collection('bookings');

    app.get('/appointmentOptions', async (req, res) => {
      const date = req.query.date;
      console.log(date);
      const query = {};
      const cursor = appointmentOptionsCollection.find(query);
      const options = await cursor.toArray();

      const bookingQuery = {appointmentDate:date}
      const allreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
      options.forEach(option=> { 

        const optionBooked = allreadyBooked.filter(booked=> booked.treatment === option.name);
        const bookedSlots = optionBooked.map(booked=> booked.slot);
        const reminingSlots = option.slots.filter(slot=> !bookedSlots.includes(slot));
        option.slots = reminingSlots;

        console.log(date,option.name, bookedSlots);

       })

      res.send(options);
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const result = await bookingsCollection.insertOne(booking)
      res.send(result);
    })



  }
  finally {

  }
}
run().catch(error => console.log(error))














app.get('/', (req, res) => {
  res.send('Doctors Server is Running!')
})

app.listen(port, () => {
  console.log(`Doctors is Running on port ${port}`)
})