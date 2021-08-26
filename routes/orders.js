const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/Order');
const auth = require('../middlewares/auth');

router.get('/:barcode', orderCtrl.getOrder);

module.exports = router;