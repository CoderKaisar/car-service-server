const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

// midddleware
app.use(cors())
app.use(express.json())
require('dotenv').config()
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// code for mongodb connection


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2sgpdc8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyjwt = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        res.status(401).send({ error: 1, message: "unauthorized access authorization absent" })
    }
    const token = authorization.split(" ")[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            res.status(401).send({ error: 1, message: "unauthorized access token absent" })
        } else {
            req.decoded = decoded
        }
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection

        // service & booking collection
        const serviceCollection = client.db('carServiceDB').collection('services')
        const bookingCollection = client.db('bookingServiceDB').collection('bookings')


        // jwt api
        app.post("/jwt", (req, res) => {
            const user = req.body;
            console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '03 months' })
            res.send({ token })
        })


        // service api
        app.get("/services", async (req, res) => {
            const result = await serviceCollection.find().toArray()
            res.send(result)
        })
        app.post("/services", async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service)
            res.send(result)
        })
        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query)
            res.send(result)
        })


        // bookings api
        app.get("/bookings", verifyjwt, async (req, res) => {
            // console.log(req.headers.authorization)
            const decoded = req.decoded;
            console.log("come back after verify", decoded)
            if (decoded.email !== req.query?.email) {
                return res.status(403).send({ error: 1, message: "forbidden access" })
            }
            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)

        })

        app.post('/bookings', async (req, res) => {
            const bookings = req.body
            const result = await bookingCollection.insertOne(bookings)
            res.send(result)
        })

        app.patch("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedBooking = req.body;
            const updatedDoc = {
                $set: {
                    status: updatedBooking.status
                }
            }
            const result = await bookingCollection.updateOne(filter, updatedDoc)
            // console.log(result)
            res.send(result)
        })


        app.delete("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })



        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get("/", (req, res) => {
    res.send(`Car service Server is running `)
})

app.listen(port, () => {
    console.log(`Car server is running in ${port}`)
})