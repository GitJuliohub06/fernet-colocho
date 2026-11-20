const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { uploadProductImage } = require('../middlewares/uploadMiddleware');

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

router.post(
  '/',
  requireAuth,
  requireRole('vendedor', 'admin'),
  uploadProductImage.single('image'),
  productController.createProduct
);

router.put(
  '/:id',
  requireAuth,
  requireRole('vendedor', 'admin'),
  uploadProductImage.single('image'),
  productController.updateProduct
);

router.patch(
  '/:id/stock',
  requireAuth,
  requireRole('vendedor', 'admin'),
  productController.adjustStock
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  productController.deleteProduct
);

module.exports = router;