const jwt = require('jsonwebtoken');
var sql = require("mssql");
const TOKEN = 'MBY';
var config = require("../sql-config");

exports.login = async (req, res, next) => {
    let api_key = req.query.api_key;
    if (api_key == TOKEN){
        try {
            // Find user from Table Customers
            console.debug('username : ' + req.body.username + ' password : ' + req.body.password )
            const pool = await sql.connect(config)
            const request = pool.request();
            request.input('username', sql.VarChar, req.body.username);
            const result = await request.query`SELECT TOP 1 U.Id, U.Username, U.Password, C.FullName, S.Name AS StoreName FROM Users U JOIN Contacts C ON C.Id = U.Contact_id JOIN Stores S ON S.Id = U.Store_id WHERE (U.Username = @username AND U.Active = 'TRUE') ;`;
            userFound = result.recordset[0];
            if (!userFound){
                return res.status(401).json({error : 'Utilisateur Introuvable'});
            }

            // Check Password
            if (userFound.Password !== req.body.password){
                return res.status(401).json({error : 'Mot de passe incorrect'});
            }

            //Get Profiles
            request.input('userId', sql.VarChar, userFound.Id);
            const result_profiles = await request.query`SELECT R.SystemName FROM UsersRoles UR JOIN Roles R ON R.Id = UR.Role_id WHERE (UR.User_id = @userId);`;
            const profiles = result_profiles.recordset;
            let profilesTab = []
            for (let i=0; i < profiles.length; i++){
                profilesTab.push(' ' + profiles[i].SystemName) 
            }

            // Return all informations for user
            res.status(200).json({
                userData : {
                    Id: userFound.Id,
                    Username : userFound.Username,
                    Password : userFound.Password,
                    FullName : userFound.FullName,
                    StoreName : userFound.StoreName,
                    Roles: profilesTab
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
