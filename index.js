// http server for interacting with the blockchain DBcoin
// Debashish Buragohain

'use-strict'
const express = require('express');
const path = require('path');
const { Blockchain, Transaction } = require('./src/blockchain');
const { createAccount } = require('./src/keygenerator');
const cors = require('cors');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const dbcoin = new Blockchain();
const app = express();
app.use(express.json());
// allowing cors for the client side
app.use(cors());

app.use(express.static(path.join(__dirname, 'dist')));

// allowing cors for the server side
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', false); //no cookies needed
    next(); //pass to the next layer of middleware
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
})


app.post('/createAccount', (req, res) => {
    const { privateKey, publicKey } = createAccount();
    res.json({ privateKey, publicKey });
});

app.post('/minePendingTransactions', (req, res) => {
    const { publicKey } = req.body;
    if (!publicKey)
        return res.status(400).json({
            error: 'public key not provided'
        });

    try {
        dbcoin.minePendingTransactions(publicKey);
        res.json({
            message: "Mining completed"
        });
    }
    catch (err) {
        res.status(500).json({
            error: err.message
        })
    }

});

app.post('/addTransaction', (req, res) => {
    // for adding a transaction we need both the private and puiblic keys
    const { fromAddress, toAddress, privateKey, amount } = req.body;
    try {
        const myKey = ec.keyFromPrivate(privateKey);
        const tx1 = new Transaction(fromAddress, toAddress, amount);
        tx1.signTransaction(myKey);
        dbcoin.addTransaction(tx1);
        res.status(200).json({
            message: "transaction added."
        })
    }
    catch (err) {
        console.log(err.message)
        res.status(500).json({
            error: err.message
        })
    }

});

app.post('/getBalance', (req, res) => {
    const { walletAddress } = req.body;
    try {
        const balance = dbcoin.getBalanceOfAddress(walletAddress);
        res.status(200).json({ balance });
    }
    catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
});

app.post('/isChainValid', (req, res) => {
    const isValid = dbcoin.isChainValid();
    res.json({
        isValid
    })
});

app.get('/getChain', (req, res) => {
    // sending the entire chain
    // const fetchedChain = dbcoin.getChain();
    // console.log(fetchedChain)
    // res.json(JSON.stringify(fetchedChain, null, 2));
    res.json(dbcoin.chain)
});

app.post('/setMiningReward', (req, res) => {
    if (!req.body.reward) return res.status(400).json({ error: 'reward not provided.' });
    dbcoin.setMiningReward(req.body.reward);
    res.status(200).json({ message: 'mining reward set.' });
})

app.post('/setDifficulty', (req, res) => {
    if (!req.body.difficulty) return res.status(400).json({ error: 'difficulty not provided.' });
    dbcoin.setMiningReward(req.body.difficulty);
    res.status(200).json({ message: 'mining difficulty set.' });
});

app.use('/', (req, res) => {
    res.status(404).json({
        message: "URL not found"
    });
});

app.listen(3030, () => console.log(`Server listening at port 3030`));