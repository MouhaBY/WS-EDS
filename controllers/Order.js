var sql = require("mssql");
var config = require("../sql-config");


exports.getOrder = async (req, res, next) => {
    try {
        console.debug('order barcode : ' + req.params.barcode )
        const pool = await sql.connect(config)
        const request = pool.request();
        request.input('orderbarcode', sql.VarChar, req.params.barcode);
        const result = await request.query`SELECT TOP 1 O.Id, O.OrderNumber, O.TrackingNumber, O.GoodsNatureId, O.CollectAddressFullName, O.CollectAddress, O.CollectAddressPhone, O.DeliveryAddressFullName, O.DeliveryAddress, O.DeliveryAddressPhone, C.Name AS CustomerName, O.WithHomeCollect, O.WithHomeDelivery, O.WithCOD, O.AmountCOD, Sf.Name AS FromStore, St.Name AS ToStore, DS.Name AS DSName, DSR.Name AS DSRName, OS.StoreId, OS.UserId, O.Actif FROM Orders O JOIN Stores Sf ON Sf.Id = O.FromStoreId JOIN Stores St ON St.Id = O.ToStoreId JOIN OrdersStates OS ON OS.OrderId = O.Id JOIN DeliveryStates DS ON DS.Id = OS.DeliveryStateId JOIN DeliveryStatesReasons DSR ON DSR.Id = OS.DeliveryStateReasonId JOIN Customers C ON C.Id = O.CustomerId WHERE (O.Barcode = @orderbarcode);`;
        orderFound = result.recordset[0];
        
        // check if order found
        if (!orderFound){
            return res.status(401).json({error : 'OrderNotRecognized'});
        }
        //check if order actif
        if (!orderFound.Actif){
            return res.status(401).json({error : 'OrderNotActif'});
        }
        //Get orderNature
        if(orderFound.GoodsNatureId){
            request.input('goodsnatureid', sql.VarChar, orderFound.GoodsNatureId);
            const result = await request.query`SELECT TOP 1 Name AS GoodsNature FROM GoodsNature WHERE (Id = @goodsnatureid);`; 
            var GoodsNature = result.recordset[0].GoodsNature;
        }
        //Get Store / User
        if(orderFound.StoreId){
            request.input('storeid', sql.VarChar, orderFound.StoreId);
            const result = await request.query`SELECT TOP 1 Name AS StoreName FROM Stores WHERE (Id = @storeid);`; 
            var StoreName = result.recordset[0].StoreName;
        }
        if(orderFound.UserId){
            request.input('userid', sql.VarChar, orderFound.UserId);
            const result = await request.query`SELECT TOP 1 Username FROM Users WHERE (Id = @userid);`;
            var Username = result.recordset[0].Username;
        }
        
        // Return all informations for parcel
        res.status(200).json({
            parcelData : {
                Id: orderFound.Id,
                Barcode: req.params.barcode,
                OrderNumber:orderFound.OrderNumber,
                FromStore: orderFound.FromStore,
                ToStore: orderFound.ToStore,
                OrderStatus: orderFound.DSName,
                OrderStatusReason:orderFound.DSRName,
                State:{StoreName:StoreName, Username:Username},
                GoodsNature: GoodsNature,
                CustomerName: orderFound.CustomerName,
                TrackingNumber : orderFound.TrackingNumber,
                WithHomeDelivery: orderFound.WithHomeDelivery,
                WithHomeCollect: orderFound.WithHomeCollect,
                WithCOD:orderFound.WithCOD,
                AmountCOD:orderFound.AmountCOD,
                CollectAddressFullName: orderFound.CollectAddressFullName,
                CollectAddress: orderFound.CollectAddress,
                CollectAddressPhone: orderFound.CollectAddressPhone,
                DeliveryAddressFullName: orderFound.DeliveryAddressFullName,
                DeliveryAddress: orderFound.DeliveryAddress,
                DeliveryAddressPhone: orderFound.DeliveryAddressPhone,
            }
        });
    }
    catch (error) {
        console.debug(error)
        res.status(500).json({ error });
    }
}

exports.getmyOrdersToCollectByZone = async (req, res, next) => {
    try {
        console.debug('order zone to collect : ' + req.params.zoneid )
        const pool = await sql.connect(config);
        const request = pool.request();
        request.input('zoneid', sql.VarChar, req.params.zoneid);
        //ajouter le control sur la date de collecte
        var result = await request.query`SELECT O.Id, O.OrderNumber, O.CollectAddressFullName, O.CollectAddress, O.CollectAddressPhone, Z.Name AS ZoneName FROM Orders O JOIN Zones Z ON Z.Id = O.HomeCollectZoneId JOIN OrdersStates OS ON OS.OrderId = O.Id WHERE (O.WithHomeCollect = 'True' AND OS.DeliveryStateId = 0 AND O.Actif = 'True' AND O.HomeCollectZoneId = @zoneid );`;      
        myOrders = result.recordset;
        // check if orders found
        if (!myOrders){
            return res.status(401).json({error : 'emptyList'});
        }
        // Return all informations for parcel
        res.status(200).json({
            myOrders
        })
    }
    catch (error) {
        console.debug(error)
        res.status(500).json({ error });
    }
}

exports.getmyOrdersToCollectByStore = async (req, res, next) => {
    try {
        console.debug('order zone to collect : ' + req.params.zoneid )
        const pool = await sql.connect(config);
        const request = pool.request();
        request.input('storeid', sql.VarChar, req.params.storeid);
        var result = await request.query`SELECT O.Id, O.OrderNumber, O.CollectAddressFullName, O.CollectAddress, O.CollectAddressPhone, Z.Name AS ZoneName FROM Orders O JOIN Zones Z ON Z.Id = O.HomeCollectZoneId JOIN OrdersStates OS ON OS.OrderId = O.Id JOIN StoresZones SZ ON O.HomeCollectZoneId = SZ.ZoneId WHERE (O.WithHomeCollect = 'True' AND OS.DeliveryStateId = 0 AND O.Actif = 'True' AND SZ.StoreId = @storeid);`;
        //ajouter le control sur la date de collecte
        myOrders = result.recordset;
        // check if orders found
        if (!myOrders){
            return res.status(401).json({error : 'emptyList'});
        }
        // Return all informations for parcel
        res.status(200).json({
            myOrders
        })
    }
    catch (error) {
        console.debug(error)
        res.status(500).json({ error });
    }
}

