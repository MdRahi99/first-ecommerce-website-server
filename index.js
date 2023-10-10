const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const categoryData = require('./productsCategory.json');

app.get('/', (req, res) => {
    res.send(`Server Started On Port ${port}`)
});

app.get('/products-categories', (req, res) => {
    res.send(categoryData);
});

app.listen(port, () => {
    console.log(`Server Started On Port ${port}`);
});