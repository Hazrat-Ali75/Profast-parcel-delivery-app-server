// server.js
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

dotenv.config()

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY)

const app = express()
const port = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l4txg2r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

async function run () {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect()

    const parcelsCollection = client.db('ProfastDB').collection('parcels')
    const paymentsCollection = client.db('ProfastDB').collection('payments')

    app.post('/parcels', async (req, res) => {
      const parcelData = req.body
      const result = await parcelsCollection.insertOne(parcelData)
      res.status(200).send(result)
    })

    app.get('/parcels', async (req, res) => {
      const email = req.query.email
      const query = email ? { created_by: email } : {}
      const result = await parcelsCollection
        .find(query)
        .sort({ creation_date: -1 })
        .toArray()
      res.status(200).send(result)
    })

    app.get('/parcels/:id', async (req, res) => {
      const id = req.params.id
      const result = await parcelsCollection.findOne({ _id: new ObjectId(id) })
      res.status(200).send(result)
    })

    app.delete('/parcels/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await parcelsCollection.deleteOne(query)
      res.status(200).send(result)
    })

    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { amount } = req.body
        const paymentIntent = await stripe.paymentIntents.create({
          amount, // amount in cent
          currency: 'usd',
          payment_method_types: ['card']
        })
        res.json({ clientSecret: paymentIntent.client_secret })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    app.get('/payments', async(req, res)=>{
      const userEmail = req.query.email
      const query = userEmail ? {email : userEmail} : {};
      const options = {sort : {paid_at : -1}}
      const result = await paymentsCollection.find(query, options).toArray()
      res.status(200).send(result);
    })
    
    app.post('/payments', async (req, res) => {
      const { parcelId, email, amount, paymentMethod, transactionId } = req.body
      //update payment status
      const updateResult = await parcelsCollection.updateOne(
        { _id: new ObjectId(parcelId) },
        {
          $set: {
            payment_status: 'paid'
          }
        }
      )
      if (updateResult.modifiedCount === 0) {
        return res
          .status(404)
          .send({ message: 'parcel not found or already paid' })
      }
      // insert payment record
      const paymentDoc = {
        parcelId,
        email,
        amount,
        paymentMethod,
        transactionId,
        paid_at_string : new Date().toISOString(),
        paid_at : new Date()
      }
      const result = await paymentsCollection.insertOne(paymentDoc)
      res.status(200).send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.status(200).send('API is working....')
})
// Start the server
app.listen(port, () => {
  console.log(`🌐 Server is running on http://localhost:${port}`)
})
