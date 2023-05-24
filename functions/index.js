

const dotenv = require('dotenv');
dotenv.config();

const axios = require('axios').default;
var CryptoJS = require("crypto-js");

async function isTokenWorking(token) {
    const url = 'https://discord.com/api/v9/users/@me';
    const response = await axios.get(url, {
        headers: {
            'authorization': token
        }
    }).catch(err => err);
    if (response.status != 200) return false;
    return true;
};

const password = process.env.CRYPT_KEY;

const encrypt = (text) => {
    return CryptoJS.AES.encrypt(text, password).toString();
};

const decrypt = (hash) => {
    if(!hash)return null;
    var bytes = CryptoJS.AES.decrypt(hash, password);
    return bytes.toString(CryptoJS.enc.Utf8);

};
module.exports = { isTokenWorking, encrypt, decrypt };

