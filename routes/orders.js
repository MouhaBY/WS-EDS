const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/Order');
const auth = require('../middlewares/auth');

router.get('/control/:barcode', orderCtrl.getOrder);
router.get('/orderstocollect/store/:storeid', orderCtrl.getOrdersToCollectByStore);
router.post('/collect', orderCtrl.collectOrder);


module.exports = router;