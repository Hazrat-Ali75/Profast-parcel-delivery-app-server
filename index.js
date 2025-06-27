// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l4txg2r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();

      const parcelsCollection = client.db('ProfastDB').collection('parcels')

      app.post('/parcels', async(req, res)=>{
        const parcelData = req.body;
        const result = await parcelsCollection.insertOne(parcelData);
        res.status(200).send(result);
      })

      app.get('/parcels', async(req, res)=>{
        const email = req.query.email;
        const query = email ? {created_by : email} : {};
        const result = await parcelsCollection.find(query).sort({creation_date: -1}).toArray()
        res.status(200).send(result);
      })

      app.get('/parcels/:id', async(req,res)=>{
        const id = req.params.id;
        const result = await parcelsCollection.findOne({_id: new ObjectId(id)})
        res.status(200).send(result)
      })

      app.delete('/parcels/:id',async(req, res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)};
        const result = await parcelsCollection.deleteOne(query);
        res.status(200).send(result);
      })

      app.post('/create-payment-intent', async (req, res) => {
        try {
          const { amount } = req.body;
          const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
          });
          res.json({ clientSecret: paymentIntent.client_secret });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);

app.get('/', (req,res)=>{
    res.status(200).send("API is working....")
})
  // Start the server
app.listen(port, () => {
   console.log(`🌐 Server is running on http://localhost:${port}`);
});
