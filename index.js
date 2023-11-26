const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mwpgenu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  };

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const productsCategory = client.db('FirstECommerceDB').collection('productsCategory');
    const products = client.db('FirstECommerceDB').collection('products');
    const usersCollection = client.db('FirstECommerceDB').collection('users');
    const cartProducts = client.db('FirstECommerceDB').collection('cartProducts');

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(
        user,
        process.env.ACCESS_TOKEN,
        { expiresIn: '1h' }
      );
      res.send({token})
    });

    app.get('/users', async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    });

    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { '_id': new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/products-categories', async (req, res) => {
      const query = {};
      const cursor = productsCategory.find(query);
      const category = await cursor.toArray();
      res.send(category);
    });
    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = products.find(query);
      const category = await cursor.toArray();
      res.send(category);
    });
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.findOne(query);
      res.send(result);
    });
    app.get('/similarProduct/:price', async (req, res) => {
      const price = req.params.price;
      const query = { price: { $lt: price } };
      const result = await products.findOne(query);
      res.send(result);
    });
    // --------------------------------- //
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.json([])
      }
      const query = { email: email }
      const result = await cartProducts.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartProducts.insertOne(item);
      res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { '_id': new ObjectId(id) };
      const result = await cartProducts.deleteOne(query);
      res.send(result);
    });
    // --------------------------------- //

  } finally { }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send(`Server Started On Port ${port}`)
});

app.listen(port, () => {
  console.log(`Server Started On Port ${port}`);
});