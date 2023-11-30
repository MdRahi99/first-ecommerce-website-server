const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const store_id = process.env.PAYMENT_SECRET_ID;
const store_passwd = process.env.PAYMENT_SECRET_PASS;
const is_live = false;
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
    const paymentCollection = client.db('FirstECommerceDB').collection('payments');
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

    // ---------------- Admin --------------------
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    });

    app.get('/payments', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result)
    });

    app.put('/payments/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'Delivered'
        }
      }
      const result = await paymentCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.delete('/payments/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { '_id': new ObjectId(id) };
      const result = await paymentCollection.deleteOne(query);
      res.send(result);
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

    // ---------------- Products --------------------
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

    // --------------- User ------------------ //
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

    // -------------- Payment ------------------- //
    app.get('/payment-info/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/payment-info', verifyJWT, async (req, res) => {
      const order = req.body;
      const {
        firstName,
        lastName,
        email,
        totalPrice,
        phone,
        currency,
        postcode,
        address,
        products
      } = order;

      if (!currency || !totalPrice || !firstName || !lastName || !email || !phone || !address || !postcode) {
        return res.send({ error: "Please provide all information" })
      }

      const transactionId = new ObjectId().toString();

      const data = {
        total_amount: totalPrice,
        currency: currency,
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `${process.env.SERVER_URL}/payment/success?transactionId=${transactionId}`,
        fail_url: `${process.env.SERVER_URL}/payment/fail?transactionId=${transactionId}`,
        cancel_url: `${process.env.SERVER_URL}/payment/cancel?transactionId=${transactionId}`,
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: firstName + ' ' + lastName,
        cus_email: email,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: phone,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: address,
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: postcode,
        ship_country: 'Bangladesh',
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        const query = { _id: { $in: products.map(id => new ObjectId(id._id)) } };
        paymentCollection.insertOne({
          ...order,
          transactionId,
          paid: false
        })
          .then(() => {
            cartProducts.deleteMany(query)
              .then(deleteResult => {
                console.log(`Deleted ${deleteResult.deletedCount} cart items`);
              })
              .catch(error => {
                console.error('Error deleting cart items:', error);
              });

            res.send({ url: GatewayPageURL });
          })
          .catch(error => {
            console.error('Error inserting into paymentCollection:', error);
            res.status(500).send({ error: 'Internal Server Error' });
          });
      })
    });

    app.post('/payment/success', async (req, res) => {
      console.log('Success');
      const { transactionId } = req.query;

      if (!transactionId) {
        return res.redirect(`${process.env.CLIENT_URL}/dashboard/payment/fail`);
      }

      const paymentResult = await paymentCollection.updateOne(
        { transactionId },
        { $set: { paid: true, paidAt: new Date() } }
      );

      if (paymentResult.modifiedCount > 0) {
        res.redirect(`${process.env.CLIENT_URL}/dashboard/payment/success?transactionId=${transactionId}`);
      } else {
        res.redirect(`${process.env.CLIENT_URL}/dashboard/payment/fail`);
      }
    });

    app.post('/payment/fail', async (req, res) => {
      console.log('Fail');
      const { transactionId } = req.query;
      if (!transactionId) {
        return res.redirect(`${process.env.CLIENT_URL}/dashboard/payment/fail`);
      }
      const result = await paymentCollection.deleteOne({ transactionId });
      if (result.deletedCount) {
        res.redirect(`${process.env.CLIENT_URL}/dashboard/payment/fail`);
      }
    });

    app.post('/payment/cancel', async (req, res) => {
      console.log('Cancel');
      const { transactionId } = req.query;
      if (!transactionId) {
        return res.redirect(`${process.env.CLIENT_URL}/dashboard/payment/fail`);
      }
      const result = await paymentCollection.deleteOne({ transactionId });
      if (result.deletedCount) {
        res.redirect(`${process.env.CLIENT_URL}/dashboard/payment/fail`);
      }
    });

    app.get('/orders/by-transaction-id/:id', verifyJWT, async (req, res) => {
      const { id } = req.params;
      const order = await paymentCollection.findOne({ transactionId: id });
      res.send(order)
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