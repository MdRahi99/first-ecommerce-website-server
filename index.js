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
      res.send({ token })
    });

    // admin verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      next();
    };

    // ------------------------------------
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    });

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { '_id': new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.post('/product', async (req, res) => {
      const item = req.body;
      const result = await products.insertOne(item);
      res.send(result);
    });

    app.put("/update-product/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedProduct = req.body;
      const productInfo = {
        $set: {
          name: updatedProduct.name,
          image: updatedProduct.image,
          rating: updatedProduct.rating,
          price: updatedProduct.price,
          option: updatedProduct.option,
          category: updatedProduct.category,
          product_code: updatedProduct.product_code,
          tag: updatedProduct.tag,
          brand_name: updatedProduct.brand_name,
          brand_description: updatedProduct.brand_description,
          brand_logo: updatedProduct.brand_logo,
          description: updatedProduct.description,
          delivery_policies: updatedProduct.delivery_policies,
          sample_img1: updatedProduct.sample_img1,
          sample_img2: updatedProduct.sample_img2,
          sample_img3: updatedProduct.sample_img3,
          color1: updatedProduct.color1,
          color2: updatedProduct.color2,
          color3: updatedProduct.color3,
          size1: updatedProduct.size1,
          size2: updatedProduct.size2,
          size3: updatedProduct.size3,
        }
      };

      const result = await products.updateOne(filter, productInfo, options);
      res.send(result);
    });

    app.delete('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { '_id': new ObjectId(id) };
      const result = await products.deleteOne(query);
      res.send(result);
    });
    // ------------------------------------

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
    app.get('/products/:id', verifyJWT, async (req, res) => {
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
        return res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
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