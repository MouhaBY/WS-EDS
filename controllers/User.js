const jwt = require('jsonwebtoken');
var sql = require("mssql");
const TOKEN = 'MBY';
var config = require("../sql-config");
const license = require("../license")


exports.login = async (req, res, next) => {
    let api_key = req.query.api_key;
    if (api_key == TOKEN){
        try {
            // Find user from Table Users
            console.debug('username : ' + req.body.username + ' password : ' + req.body.password )
            const pool = await sql.connect(config)
            const request = pool.request();
            request.input('username', sql.VarChar, req.body.username);
            const result = await request.query`SELECT TOP 1 U.Id, U.Username, U.Password, U.StoreId, U.ContactId FROM Users U WHERE (U.Username = @username AND U.Active = 'TRUE') ;`;
            userFound = result.recordset[0];

            if (!userFound){
                return res.status(401).json({error : 'Utilisateur Introuvable'});
            }

            // Check Password
            if (userFound.Password !== req.body.password){
                return res.status(401).json({error : 'Mot de passe incorrect'});
            }

            //Get User Store
            if(userFound.StoreId){
                request.input('storeid', sql.VarChar, userFound.StoreId);
                const result = await request.query`SELECT TOP 1 S.Name AS StoreName FROM Stores S WHERE (S.Id = @storeid);`; 
                var userFoundstoreName = result.recordset[0].StoreName;
            }            

            //Get Profiles
            request.input('userId', sql.VarChar, userFound.Id);
            const result_profiles = await request.query`SELECT R.SystemName, R.Name AS RoleName FROM UsersRoles UR JOIN Roles R ON R.Id = UR.RoleId WHERE (UR.UserId = @userId);`;
            const profiles = result_profiles.recordset;
            let profilesTab = [];
            let profilesNamesTab = [];
            for (let i=0; i < profiles.length; i++){
                profilesTab.push(profiles[i].SystemName);
                profilesNamesTab.push(profiles[i].RoleName)
            }

            // Check Profiles
            let authorized = ( profilesTab.includes('Administrator') || profilesTab.includes('DeliveryMan') || profilesTab.includes('TruckDriver') || profilesTab.includes('Integrator'))
            if (!authorized){
                return res.status(401).json({error : 'Utilisateur non autorisé'});
            }
            else{
                if(userFound.ContactId){
                    request.input('contactid', sql.VarChar, userFound.ContactId);
                    const result = await request.query`SELECT TOP 1 FullName FROM Contacts WHERE (Id = @contactid);`; 
                    var userFoundFullName = result.recordset[0].FullName;
                }
            }

            //Setting time
            var pad = function(num) { return ('00' + num).slice(-2) };
            var date;
            date = new Date();
            date = date.getUTCFullYear() + '-' +
            pad(date.getUTCMonth() + 1)  + '-' +
            pad(date.getUTCDate())       + ' ' +
            pad(date.getUTCHours())      + ':' +
            pad(date.getUTCMinutes())    + ':' +
            pad(date.getUTCSeconds());

            request.input('dateNow', sql.DateTime, date);
            
            //Saving Device to User
            request.input('serialnumber', sql.VarChar, req.body.serialNumber);
            const result_devices = await request.query`SELECT TOP 1 Id FROM Devices WHERE (SerialNumber = @serialnumber);`;
            
            if ( result_devices.recordset.length > 0 ){
                var deviceFoundId = result_devices.recordset[0].Id;
                request.input('deviceid', sql.VarChar, deviceFoundId);
                await request.query`UPDATE Users SET DeviceId = @deviceid WHERE (Id = @userId);`;
                await request.query`UPDATE Devices SET LastSeenOn = @dateNow WHERE (Id = @deviceid);`;
            }
            else {
                const licensed_devices = await request.query`SELECT COUNT(Id) AS Number FROM Devices WHERE Actif ='true';`;
                if (licensed_devices.recordset[0].Number > license.devicesNumber){
                    return res.status(401).json({error : 'Licence expirée'});
                }
                else{
                    await request.query`INSERT INTO Devices (SerialNumber, CreatedOn, CreatedBy, LastSeenOn) VALUES (@serialnumber, @dateNow, @username, @dateNow);`;
                    const result_devices = await request.query`SELECT TOP 1 Id FROM Devices WHERE (SerialNumber = @serialnumber);`;
                    var deviceFoundId = result_devices.recordset[0].Id;
                    request.input('deviceid', sql.VarChar, deviceFoundId);
                    await request.query`UPDATE Users SET DeviceId = @deviceid WHERE (Id = @userId);`;
                }
            }

            //SET GPS Position
            if(req.body.location){
                let latitude = req.body.location.latitude
                let longitude = req.body.location.longitude
                request.input('latitude', sql.VarChar, latitude);
                request.input('longitude', sql.VarChar, longitude);
                await request.query`UPDATE Devices SET GPSLatitude = @latitude, GPSLongitude=@longitude WHERE (Id = @deviceid);`;
            }

            // OK : Return all informations for user
            await request.query`UPDATE Users SET LastseenOn = @dateNow WHERE (Id = @userId);`;

            res.status(200).json({
                userData : {
                    Id        : userFound.Id,
                    Username  : userFound.Username,
                    Password  : userFound.Password,
                    FullName  : userFoundFullName,
                    StoreName : userFoundstoreName,
                    Roles     : profilesNamesTab,
                    DeviceId  : deviceFoundId
                },
                token : jwt.sign(
                    { userId: userFound.Id },
                    TOKEN,
                    { expiresIn: '24h' }
                )
            });
        }
        catch (error) {
            console.debug(error)
            res.status(500).json({ error });
        }
    }
    else {
        return res.status(401).json({error : 'Incorrect Token'})
    }
}
