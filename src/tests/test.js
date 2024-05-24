// made it mandatory for transactions to be signed with a private key and public key
// this way we can spend coins in a wallet only if we have the private and public key of it
// i.e. we spend coins that are only ours

'use-strict'
const { Blockchain, Transaction } = require('../blockchain');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const privateKey = require('./test_keys').testKey.privateKey;
const myKey = ec.keyFromPrivate(privateKey);    // derive the keypair from the private key
const myWalletAddress = myKey.getPublic('hex'); // can extract the public key from the private key

let debaCoin = new Blockchain();

try {
    // mine the first block
    // so we can actually mine a block even if it does not have any transactions inside
    // this gives us funds for performing further transactions
    debaCoin.minePendingTransactions(myWalletAddress);

    const tx1 = new Transaction(myWalletAddress, 'public key goes here', 10);
    tx1.signTransaction(myKey);
    debaCoin.addTransaction(tx1);

    console.log('\nMining transactions...');
    // makes sense because we are mining it so we will be getting the reward
    debaCoin.minePendingTransactions(myWalletAddress);

    console.log('is chain valid?:', debaCoin.isChainValid());
    console.log('Current balance: ', debaCoin.getBalanceOfAddress(myWalletAddress));
}
catch (err) {
    console.error(err);
}