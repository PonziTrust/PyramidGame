# Ponzi Trust  Pyramid Game Contracts
[![Coverage Status](https://coveralls.io/repos/github/PonziTrust/PyramidGame/badge.svg?branch=master)](https://coveralls.io/github/PonziTrust/PyramidGame?branch=master)
[![Build Status](https://travis-ci.org/PonziTrust/PyramidGame.svg?branch=master)](https://travis-ci.org/PonziTrust/PyramidGame)

The Pyramid Game contract implement [ERC667 Recipient](https://github.com/ethereum/EIPs/issues/677) and can receive token/ether only from [Ponzi Token](https://github.com/PonziTrust/Token).


## Details
- Address: [0x39a0Ff5b4Bc9d06F2267560C64f9bd490Cf7221D](https://etherscan.io/address/0x39a0Ff5b4Bc9d06F2267560C64f9bd490Cf7221D)
More details on [ponzitrust.com](https://ponzitrust.com/).

### Full JSON ABI:
```
[{"constant":true,"inputs":[],"name":"levelStartupTimestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"disown","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"priceSetter","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"currentDelayOnNewLevel","outputs":[{"name":"delay","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"addr","type":"address"}],"name":"playerInfo","outputs":[{"name":"input","type":"uint256"},{"name":"timestamp","type":"uint256"},{"name":"inGame","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"compoundingFreq","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newPriceSetter","type":"address"}],"name":"setPriceSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"ponziPriceInWei","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newState","type":"string"}],"name":"setState","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"level","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"interestRate","outputs":[{"name":"numerator","type":"uint256"},{"name":"denominator","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"addr","type":"address"}],"name":"playerDelayOnExit","outputs":[{"name":"delay","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalPonziInGame","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"amount","type":"uint256"},{"name":"data","type":"bytes"}],"name":"tokenFallback","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"state","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"addr","type":"address"}],"name":"playerOutputAtNow","outputs":[{"name":"amount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"exit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"input","type":"uint256"},{"name":"referralAddress","type":"address"}],"name":"enter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newPrice","type":"uint256"}],"name":"setPonziPriceinWei","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"ponziTokenAddr","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"addr","type":"address"},{"indexed":false,"name":"input","type":"uint256"},{"indexed":false,"name":"when","type":"uint256"}],"name":"NewPlayer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"addr","type":"address"},{"indexed":false,"name":"when","type":"uint256"}],"name":"DeletePlayer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"when","type":"uint256"},{"indexed":false,"name":"newLevel","type":"uint256"}],"name":"NewLevel","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"},{"indexed":false,"name":"newState","type":"uint8"}],"name":"StateChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"},{"indexed":false,"name":"newPrice","type":"uint256"}],"name":"PonziPriceChanged","type":"event"}]
```

## Installation
```
npm install
```

## Testing
Run test:
```
npm run test
```
Run coverage:
```
npm run coverage
```

## License
Code released under the [MIT License](https://github.com/PyramidGame/Token/blob/master/LICENSE).
