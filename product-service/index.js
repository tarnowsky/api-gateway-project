const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const winston = require('winston');

// Load environment variables
dotenv.config();

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'product-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://product-db:27017/productdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('Connected to MongoDB'))
.catch(err => {
  logger.error(`MongoDB connection error: ${err.message}`);
  process.exit(1);
});

// Define Product schema
const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  category: { 
    type: String, 
    required: true 
  },
  inStock: { 
    type: Boolean, 
    default: true 
  },
  imageUrl: { 
    type: String 
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/products/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'product-service' });
});

// Create a new product
app.post('/products', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, category, inStock, imageUrl } = req.body;
    
    const product = new Product({
      name,
      description,
      price,
      category,
      inStock,
      imageUrl
    });
    
    await product.save();
    
    logger.info(`Product created: ${name}`);
    res.status(201).json(product);
  } catch (error) {
    logger.error(`Product creation error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const { category, inStock } = req.query;
    let filter = {};
    
    if (category) filter.category = category;
    if (inStock) filter.inStock = inStock === 'true';
    
    const products = await Product.find(filter);
    res.status(200).json(products);
  } catch (error) {
    logger.error(`Product retrieval error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

// Get a specific product
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    logger.error(`Product detail error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

// Update a product
app.put('/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    logger.info(`Product updated: ${product.name}`);
    res.status(200).json(product);
  } catch (error) {
    logger.error(`Product update error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

// Delete a product
app.delete('/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    logger.info(`Product deleted: ${product.name}`);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error(`Product deletion error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Product service running on port ${PORT}`);
});

module.exports = app; // Export for testing