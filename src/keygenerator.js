const EC = require('elliptic').ec;

// secp256k1 is the algorithm that is the basis of bitcoin
const ec = new EC('secp256k1');


// create a new set of private and public key pair
function createAccount() {
    const key = ec.genKeyPair();
    const publicKey = key.getPublic('hex');
    const privateKey = key.getPrivate('hex');
    console.log('\nPublic key: ', publicKey);
    console.log('\nPrivate key: ', privateKey);
    return {
        privateKey, publicKey
    };
}

module.exports.createAccount = createAccount;