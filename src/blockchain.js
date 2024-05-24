'use strict'
// All the functionalities of the blockchain included
// Debashish Buragohain

// strated using the crypto module native to node js
const crypto = require('crypto');
//const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1'); // bitcoin basis elliptic curve

class Transaction {
    /**
     * @param {string} fromAddress 
     * @param {string} toAddress 
     * @param {number} amount 
     */
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
    }

    /**
     * Creates a SHA 256 hash of the transaction
     * 
     * its the SHA256 hash that we are going to sign with our private key
     * we won't be signing all the data in transactions only this hash
     * 
     * @returns {string}
     */
    calculateHash() {
        // directly creates the hex digest of the hash
        return crypto
            .createHash('sha256')
            .update(this.fromAddress + this.toAddress + this.amount + this.timestamp)
            .digest('hex');
    }

    // signs and adds the signature to this transaction
    /**
     * sign a transation with the provided signing key (which is an elliptic keypair object
     * that contains a private key). Then we store the signature inside the transaction object 
     * which is later stored onto the blockhain
     * 
     * @param {string} signingKey 
     */

    signTransaction(signingKey) {

        // we can only sign the transaction if it is our own coins i.e. the from address of the transaction
        // needs to be same with the public key of the signing key

        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('Key mismatch. You cannot sign transactions for other wallets.');
        }

        // calculate the hash of this transaction, sign the hash and then store into the transaction object
        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');


        this.signature = sig.toDER('hex');
    }


    /**
     * checks if the signature inside the transaction is valid (transaction has not been tampered with)
     * use the from address as the public key. The public key can alone verify if the signature has been made
     * with that public key or not
     * 
     * 
     * @returns {boolean}
     * 
     */
    isValid() {
        // mining reward transactions do not have a from address yet are valid
        if (this.fromAddress == null) return true;

        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature provided for this transaction.');
        }


        // using the public key we can verify if that public key has been used to sign the hash of the transaction
        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Block {
    /**
     * 
     * @param {number} timestamp 
     * @param {Transaction[]} transactions 
     * @param {string} previousHash 
     */

    constructor(timestamp, transactions, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = 0;
    }

    /**
     *  calulates the sha256 hash of the current block's entire data inside
     * 
     * @returns {string}
     */

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(
                this.previousHash +
                this.timestamp +
                JSON.stringify(this.transactions) +
                this.nonce
            )
            .digest('hex');
    }

    /**
     * starts the mining process of the block.
     * the block hash needs to start with the set number of zeros.
     * Using brute force we keep changing the nonce of the block until the hash starts with the desired number of zeros
     * 
     * @param { number} difficulty 
     */
    mineBlock(difficulty) {
        // first set characters must be equal to the set difficulty number of zeros
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            // keep generating the hash unless we meet the required difficulty
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log('block mined: ', this.hash);
    }


    /**
     * checks the validity for all the transactions in this particular block
     * checks the presence of addresses and if the signature is valid
     * 
     * @returns {boolean}
     * 
     */
    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 1;
        // blocks are only added after intervals, set by the difficulty of the proof of work
        // the remaining transactions in between are stored in the pending transactions array
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    /**
     * sets the mining reward for the chain
     * @param {number} reward
     */
    setMiningReward(reward) {
        this.miningReward = reward;
    }

    /**
     * sets the mining difficulty for the chain
     * @param {number} difficulty
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    /**
     * 
     * @returns {Block}
     */
    createGenesisBlock() {
        return new Block(Date.parse('2024-05-20'), [], '0');
    }


    /**
     * returns the latest block on the chain. We need it when we are creating a new block
     * and we need the hash of the previous latest block
     * 
     * @returns {Block[]}
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }


    /**
     * Take all the pending transactions, puts them inside a block and starts the mining process for that block.
     * It also adds a transation to send the mining reward to the given address.
     * 
     * @param {string} miningRewardAddress 
     */
    minePendingTransactions(miningRewardAddress) {

        // for giving the reward in this mining itself we define the mining reward transaction in the block
        // before we started the mining


        // there is no from address in a mining reward... directly comes out of the system
        // if tampered other nodes in the network will simply ignore your malicious action
        // the mining reward will only be included when the next block is added
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward)
        this.pendingTransactions.push(rewardTx);

        // defining a new block for inclusion in the chain
        const block = new Block(
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        // this here is the time draining process
        // at a later point we might wanna add some workers to speed up things
        block.mineBlock(this.difficulty);

        console.log('Block mined successfully.');
        this.chain.push(block);

        // after this reset pending transactions array and create a new transaction for the rewardee
        this.pendingTransactions = [];
    }




    /**
     * Add a new transaction to the list of the pending transactions (this is the proper method for adding 
     * transactions to be added inside the block next time the mining process starts). This also verifies that
     * the given transaction is already signed. After that just push the transaction into the pending transactions array
     * 
     * 
     * @param {Transaction} transaction 
     */
    addTransaction(transaction) {
        if (!transaction.fromAddress) {
            throw new Error('Transaction does not include from address');
        }
        if (!transaction.toAddress) {
            throw new Error('Transaction does not include to address.');
        }

        if (!transaction.isValid()) {
            throw new Error('Transaction invalid. Cannot add to chain.');
        }

        if (transaction.amount <= 0) {
            throw new Error('Transaction amount invalid. Should be greater than 0.');
        }


        // make sure that the amount sent is not greater than the existing balance
        const walletBalance = this.getBalanceOfAddress(transaction.fromAddress);
        if (walletBalance < transaction.amount) {
            throw new Error('Not enough balance to perform the transaction.');
        }


        // get all other pending transactions for the "from" wallet
        const pendingTxForWallet = this.pendingTransactions.filter(
            tx => tx.fromAddress === transaction.fromAddress
        );


        // if the wallet has more pending transactions, we calculate the total amount after all the transactions
        // if total spent coins exceeds the balance, we refuse to add this transaction
        if (pendingTxForWallet.length > 0) {
            const totalPendingAmount = pendingTxForWallet
                .map(tx => tx.amount)
                .reduce((prev, curr) => prev + curr);

            // get the total transction amount including the current transaction to be added
            const totalAmount = totalPendingAmount + transaction.amount;
            if (totalAmount > walletBalance) {
                throw new Error('Cannot perform transaction. Total transaction amount including pending transactions exceed wallet balance.');
            }
        }

        this.pendingTransactions.push(transaction);
        console.log(`Transaction added: ${transaction}`);
    }

    /**
     * 
     * returns the balance of the address
     * in bitcoin-like chain, there is no balance, the new transaction is just stored in the chain
     * and we sum up all the transactions for that account
     * 
     * @param {string} address 
     * @returns {number} The balance of the wallet
     */

    getBalanceOfAddress(address) {
        let balance = 0;
        // loop over the entire chain summming up balances for this particular address
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                // if it is from address, we sent money from our wallet to others so we minus it
                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                }
                // if it is to address, i just received money from other's wallet, so we sum it up
                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }
        return balance;
    }


    /**
     * Returns the list of all transactions (to and from) the given wallet address
     * 
     * @param {string} address 
     * @returns {Transaction[]}
     */
    getAllTransactionsForWallet(address) {
        const txs = [];
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.fromAddress === address || tx.toAddress === address) {
                    txs.push(tx);
                }
            }
        }
        console.log('No of transactions found for wallet:', txs.length);
        return txs;
    }


    /**
     * Loops over all the blocks inside the chain and verify if they are properly linked together
     * and nobody has tampered with the hashes (by calculating it again). By checking the blocks it
     * also verifies the signed transactions inside of them
     * 
     * @returns {boolean}
     * 
     */
    isChainValid() {

        // checks if the genesis block has not been tampered with
        const realGenesis = JSON.stringify(this.createGenesisBlock());

        if (realGenesis !== JSON.stringify(this.chain[0])) {
            console.error('Genesis block has been tampered.');
            return false;
        }

        for (let i = 1; i <= this.chain.length; i++) {

            // check through all the remaining blocks on the chain to see if
            // all the hashes and signatures are correct

            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransactions()) {
                // if the block does not have all valid transactions then block is invalid
                console.error('Block does not have all valid transactions.');
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.error("Mismatch in the current hash of the block.");
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                console.error("Mismatch in the previous hash of the block.");
                return false;
            }

            return true;
        }
    }

    /**
     * returns a prettified version of the entire chain
     * useful for printing the entire chain or sending it over through http requests
     * @returns {any[]}
     */
    // do not require it
    // getChain() {
    //     const fetchedChain = [];
    //     for (const block of this.chain) {
    //         console.log(block)
    //         const blockObj = {};
    //         blockObj.timestamp = block.timestamp;
    //         blockObj.previousHash = block.previousHash;
    //         blockObj.hash = block.hash;
    //         // transactions inside this particular block
    //         const txs = [];
    //         for (const tx of block.transactions) {
    //             const { fromAddress, toAddress, amount, timestamp, signature } = tx;
    //             // push all the transactions like this to the list
    //             txs.push({
    //                 fromAddress,
    //                 toAddress,
    //                 amount,
    //                 timestamp,
    //                 signature
    //             })
    //         }
    //         blockObj.transactions = txs;
    //         fetchedChain.push(blockObj);
    //     }
    //     return fetchedChain;
    // }
}


module.exports.Block = Block;
module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;