const prisma = require('../db/prisma');

// Get all orders
async function getAllOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { id: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

// Create new order
async function createOrder(req, res, next) {
  try {
    const { customer_name, product_name, status } = req.body;
    
    // Validation
    if (!customer_name || !product_name) {
      return res.status(400).json({ error: 'customer_name and product_name are required' });
    }

    const order = await prisma.order.create({
      data: {
        customer_name,
        product_name,
        status: status || 'pending'
      }
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

// Update existing order
async function updateOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { customer_name, product_name, status } = req.body;

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        ...(customer_name && { customer_name }),
        ...(product_name && { product_name }),
        ...(status && { status }),
      }
    });

    res.json(order);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    next(error);
  }
}

// Delete an order
async function deleteOrder(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.order.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    next(error);
  }
}

module.exports = {
  getAllOrders,
  createOrder,
  updateOrder,
  deleteOrder
};
