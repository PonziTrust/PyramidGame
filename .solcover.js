module.exports = {
    norpc: false,
    testCommand: 'SOLIDITY_COVERAGE=true ../node_modules/.bin/truffle test --network coverage',
    skipFiles: [
        'TheGamePayable',
        'SafeMath'
    ],
    //copyPackages: ['ponzi-trust-token'],
    port: 8555
}
