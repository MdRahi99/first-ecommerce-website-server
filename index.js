const express = require('express');
const cors = require('cors');
const app = express();
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

async function run() {
  try {
    const productsCategory = client.db('FirstECommerceDB').collection('productsCategory');
    const products = client.db('FirstECommerceDB').collection('products');

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

    

  } finally { }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send(`Server Started On Port ${port}`)
});

app.listen(port, () => {
  console.log(`Server Started On Port ${port}`);
});