const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const winston = require('winston');

//? Load environment variables
dotenv.config();

//? Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'order-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

//? Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

//? Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://order-db:27017/orderdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => logger.info('Connected to MongoDB'))
.catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
});

//? Define Order schema
const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    items: [{
        productId: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
    },
    paymentInfo: {
        method: String,
        transactionId: String,
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

//? Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

//? Health check endpoint
app.get('/orders/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'order-service' });
});

//? Create a new order
app.post('/orders', authenticateToken, async (req, res) => {
    try {
        const { items, shippingAddress, paymentInfo } = req.body;
        const userId = req.user.id;

        //? Calculate total amount
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const order = new Order({
            userId,
            items,
            totalAmount,
            shippingAddress,
            paymentInfo,
        });

        await order.save();

        logger.info(`Order created: ${order._id} for user ${userId}`);
        res.status(201).json(order);
    } catch (err) {
        logger.error(`Order creation error ${err.message}`);
        res.status(400).json({ message: err.message });
    }
});

//? Get all orders for a user
app.get('/orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({ userId });

        res.status(200).json(orders);
    } catch (err) {
        logger.error(`Order retrieval error: ${err.message}`);
        res.status(400).json({ message: err.message });
    }
});

//? Get a specific order
app.get('/orders/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        //? Check if the order belong to the requesting user
        if (order.userId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(order);
    } catch (err) {
        logger.error(`Order detail error: ${err.message}`);
        res.status(400).json({ message: err.message });
    }
});

//? Update order status
app.patch('/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    //? Check if the order belongs to the requesting user
    if (order.userId !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    order.status = status;
    await order.save();
    
    logger.info(`Order ${order._id} status updated to ${status}`);
    res.status(200).json(order);
  } catch (error) {
    logger.error(`Order status update error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

//? Cancel an order
app.delete('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    //? Check if the order belongs to the requesting user
    if (order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    //? Only allow cancellation if the order is pending or processing
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Cannot cancel order that has been shipped or delivered' 
      });
    }
    
    order.status = 'cancelled';
    await order.save();
    
    logger.info(`Order ${order._id} cancelled`);
    res.status(200).json({ message: 'Order cancelled successfully' });
  } catch (error) {
    logger.error(`Order cancellation error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

//? Get order statistics
app.get('/orders/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    //? Get total number of orders
    const totalOrders = await Order.countDocuments({ userId });
    
    //? Get orders by status
    const statusCounts = await Order.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    //? Format status counts
    const ordersByStatus = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    
    //? Calculate total spent
    const totalSpent = await Order.aggregate([
      { $match: { userId, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    res.status(200).json({
      totalOrders,
      ordersByStatus,
      totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
    });
  } catch (error) {
    logger.error(`Order statistics error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

//? Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  logger.info(`Order service running on port ${PORT}`);
});

module.exports = app; //? Export for testing