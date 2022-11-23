const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qm6ghoc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req, res, next) {
  const authHeaders = req.headers.authorization;
  if (!authHeaders) {
    return res.status(401).send('unauthorized access');
  }

  const token = authHeaders.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  })

}

const run = async () => {
  try {
    const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOptions');
    const bookingsCollection = client.db('doctorsPortal').collection('bookings');
    const usersCollection = client.db('doctorsPortal').collection('users');
    const doctorsCollection = client.db('doctorsPortal').collection('doctors');


    app.get('/appointmentOptions', async (req, res) => {
      const date = req.query.date;
      // console.log(date);
      const query = {};
      const cursor = appointmentOptionsCollection.find(query);
      const options = await cursor.toArray();

      const bookingQuery = { appointmentDate: date }
      const allreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
      options.forEach(option => {
        const optionBooked = allreadyBooked.filter(booked => booked.treatment === option.name);
        const bookedSlots = optionBooked.map(booked => booked.slot);
        const reminingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
        option.slots = reminingSlots;
        // console.log(date, option.name, bookedSlots);
      })

      res.send(options);
    })

    app.get('/bookings', verifyJwt, async (req, res) => {
      const email = req.query.email;
      const decodeEmail = req.decoded.email;
      if (email !== decodeEmail) {
        return res.status(403).send({ message: 'forbidden access 1' })
      }

      const query = {
        email: email
      }
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings)
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const query = {
        appointmentDate: booking.appointmentDate,
        treatment: booking.treatment,
        email: booking.email
      }
      const alreadyBooking = await bookingsCollection.find(query).toArray();
      if (alreadyBooking.length) {
        const message = `You already have a booking on ${booking.appointmentDate}`
        return res.send({ acknowledged: false, message })
      }

      const result = await bookingsCollection.insertOne(booking)
      res.send(result);
    })


    // sending jwt token for user 
    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
        return res.send({ accessToken: token })
      }
      res.status(403).send({ accessToken: '' })
    })


    // added user info from database for user collections
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // getting all users from database and show alusers page
    app.get('/users', async (req, res) => {
      const query = {}
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    })

    // check admin in user 
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === 'admin' })
    })

    // created admin api from users database 
    app.put('/users/admin/:id', verifyJwt, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result);

    })


    // get Just Treatement data from appointments collection .
    app.get('/appointmentSpeciality', async (req, res) => {
      const query = {}
      const result = await appointmentOptionsCollection.find(query).project({ name: 1 }).toArray();
      res.send(result);
    })

    //add doctors inforormation in database
    app.post('/doctors', async(req, res)=>{
      const doctor = req.body;
      const result = await doctorsCollection.insertOne(doctor);
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