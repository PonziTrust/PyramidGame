
import increaseTime, { duration } from './helpers/increaseTime';
import ether from './helpers/ether';
import BigNumber from 'bignumber.js';
import latestGasUsed from './helpers/latestGasUsed';
import latestTime from './helpers/latestTime';
import checkPublicABI from './helpers/checkPublicABI';
import toPromise from './helpers/toPromise';

import getAccounts from './helpers/getAccounts';
import getBalance from './helpers/getBalance';

import { gasPrice } from './helpers/gasPrice';
import { ZERO_ADDRESS } from './helpers/zeroAddress';
import assertRevert from './helpers/assertRevert';
import assertInvalidOpcode from './helpers/assertInvalidOpcode';

import truffleContract from 'truffle-contract';
import data from 'ponzi-trust-token/build/contracts/PonziToken.json';
let PonziToken = truffleContract(data);
PonziToken.setProvider(web3.currentProvider);
PonziToken.defaults({
  gas: 4712388,
  gasPrice: gasPrice
});


// this contract is must have, because solidity-coverage has a bag and
// no way to receive eth like this method
// see: https://github.com/sc-forks/solidity-coverage/issues/106
const TheGame = artifacts.require('./contracts/TheGamePayable.sol');
// const TheGame = artifacts.require('./contracts/TheGame.sol');

let Accounts, tokenOwner, gameOwner, player1, token, player3, player2, theGame;
const StateToken = Object.freeze({
  'PreSale': { num: 0, str: 'PreSale' },
  'Sale': { num: 0, str: 'Sale' },
  'PublicUse': { num: 0, str: 'PublicUse' },
});
const INTEREST_RATE_DENOMINATOR = 1000;
// const DURATION_TO_ACCESS_FOR_OWNER = duration.days(144);
const COMPOUNDING_FREQ = duration.days(1);
const DELAY_ON_EXIT = duration.hours(100);
const DELAY_ON_NEW_LEVEL = duration.days(7);
const NOT_ACTIVE_STR = 'NotActive';
const ACTIVE_STR = 'Active';
const PERCENT_TAX_ON_EXIT = 10;
const StateGame = Object.freeze({
  'NotActive': { num: 0, str: NOT_ACTIVE_STR },
  'Active': { num: 1, str: ACTIVE_STR },
});

let calcCompoundingInterest = function (input, numerator, numberOfPayout) {
  let output = input;
  while (numberOfPayout > 0) {
    output += Math.floor(output * numerator / INTEREST_RATE_DENOMINATOR);
    numberOfPayout -= 1;
  }
  output = Math.floor(output * (100 - PERCENT_TAX_ON_EXIT) / 100);
  return output;
};

let goToLevel = async (theGame, token, level, player, amount) => {
  // game min interest rate - 0.1%
  // 1 players with  input, ponzi balance of game = input
  // input =< input *(1.001)^n -10%
  // 1 =< (1.001)^n - 10%
  // (1.001)^n >= 1.1
  // n = 100 is ok
  let referralAddr = web3.toHex(0);
  while (level > 1) {
    await increaseTime(DELAY_ON_NEW_LEVEL);
    await token.transferAndCall(theGame.address, amount, referralAddr, { from: player });
    await increaseTime(duration.days(100));
    await theGame.exit({ from: player });
    level--;
  }
};

contract('TheGame', () => {
  before(async function () {
    Accounts = await getAccounts();
    tokenOwner = Accounts[0];
    gameOwner = Accounts[1];
    player1 = Accounts[2];
    player2 = Accounts[3];
    player3 = Accounts[4];
  });

  describe('check initialization', () => {
    beforeEach(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
    });

    it('has a limited public ABI', () => {
      let expectedABI = [
        'exit',
        'playerInfo',
        'playerOutputAtNow',
        'playerDelayOnExit',
        'enter',
        'priceSetter',
        'ponziPriceInWei',
        'compoundingFreq',
        'interestRate',
        'level',
        'state',
        'levelStartupTimestamp',
        'totalPonziInGame',
        'currentDelayOnNewLevel',
        'tokenFallback',
        'setPonziPriceinWei',
        'disown',
        'setState',
        'setPriceSetter',
      ];
      checkPublicABI(TheGame, expectedABI);
    });

    it('state must be NotActive', async () => {
      let state = await theGame.state();
      assert.equal(state, StateGame.NotActive.str);
    });

    it('throw on access to any func with modifier atState(StateGame.Active)', async () => {
      await assertRevert(theGame.level());
    });
  });


  describe('setState(string)', () => {
    beforeEach(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
    });

    it('set Active state ', async () => {
      let stateBefore = await theGame.state();
      assert.equal(stateBefore, StateGame.NotActive.str);
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      let stateAfter = await theGame.state();
      assert.equal(stateAfter, StateGame.Active.str);
    });

    it('set Active then NotActive state ', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await theGame.setState(StateGame.NotActive.str, { from: gameOwner });
      let state = await theGame.state();
      assert.equal(state, StateGame.NotActive.str);
    });

    it('throw on not owner`s calling', async () => {
      await assertRevert(theGame.setState(StateGame.Active.str, { from: player2 }));
    });

    it('throw on not valid netState calling', async () => {
      await assertRevert(theGame.setState('not valid string', { from: gameOwner }));
    });
  });

  describe('setPriceSetter(address)', () => {
    beforeEach(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
    });

    it('throw on not owner`s calling', async () => {
      await assertRevert(theGame.setPriceSetter(player2, { from: tokenOwner }));
    });

    it('throw on not StateGame.Active calling', async () => {
      await assertRevert(theGame.setPriceSetter(player2, { from: tokenOwner }));
    });

    it('set newPriceSetter', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      let priceSetterBefore = await theGame.priceSetter({ from: gameOwner });
      await theGame.setPriceSetter(player2, { from: gameOwner });
      let priceSetterAfter = await theGame.priceSetter({ from: gameOwner });
      assert.equal(priceSetterBefore, ZERO_ADDRESS);
      assert.equal(player2, priceSetterAfter);
    });
  });

  describe('setPonziPriceinWei(uint256)', () => {
    beforeEach(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
    });

    it('throw on not owner`s calling', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await assertRevert(theGame.setPonziPriceinWei(1, { from: player2 }));
    });

    it('throw on not StateGame.Active calling', async () => {
      await assertRevert(theGame.setPriceSetter(player2, { from: tokenOwner }));
    });

    it('onwer calling', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await assert(theGame.setPonziPriceinWei(1, { from: gameOwner }));
      let priceAfter = await theGame.ponziPriceInWei();
      assert.equal(priceAfter.toString(), 1);
    });

    it('PriceSetter calling', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await theGame.setPriceSetter(player3, { from: gameOwner });
      await theGame.setPonziPriceinWei(1, { from: player3 });
      let priceAfter = await theGame.ponziPriceInWei();
      assert.equal(priceAfter, 1);
    });
  });

  describe('disown()', () => {
    beforeEach(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
    });

    it('throw on not StateGame.NotActive calling', async () => {
      await assertRevert(theGame.disown({ from: gameOwner }));
    });

    it('throw on not owner`s calling', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await assertRevert(theGame.disown({ from: player3 }));
    });

    it('throw on access after disown', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await theGame.disown({ from: gameOwner });
      await assertRevert(theGame.setState(StateGame.Active.str, { from: gameOwner }));
    });
  });

  describe('checkAccess()', () => {
    beforeEach(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
    });

    it('has access if now - m_creationTimestamp <= DURATION_TO_ACCESS_FOR_OWNER', async () => {
      await increaseTime(duration.days(140));
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
    });

    it('has access if m_state == NotActive', async () => {
      await theGame.setState(StateGame.NotActive.str, { from: gameOwner });
      await increaseTime(duration.days(145));
      await theGame.setState(StateGame.NotActive.str, { from: gameOwner });
    });

    it('throw on DURATION_TO_ACCESS_FOR_OWNER is expired and state == Active', async () => {
      await increaseTime(duration.days(145));
      await assertRevert(theGame.setState(StateGame.Active.str, { from: gameOwner }));
    });
  });

  describe('tokenFallback(address,uint256,bytes)', () => {
    let amount = 10000;
    let dataAddr;
    let ponziTokenFake;
    beforeEach(async () => {
      dataAddr = player2;
      ponziTokenFake = player2;
      theGame = await TheGame.new(ponziTokenFake, { from: gameOwner });
    });

    it('throw on not StateGame.NotActive calling', async () => {
      await assertRevert(theGame.tokenFallback(player3, amount, dataAddr, { from: ponziTokenFake }));
    });

    it('throw on not ponzi token`s calling', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await assertRevert(theGame.tokenFallback(player3, amount, dataAddr, { from: gameOwner }));
    });

    it('succes for calling from ponzi token', async () => {
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      let success = await theGame.tokenFallback(player3, amount, dataAddr, { from: ponziTokenFake });
      assert(success);
    });
  });

  describe('level 1', () => {
    beforeEach(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await token.initContract({ from: tokenOwner });
    });

    context('check `rulls`', () => {
      it('level == 1', async () => {
        let level = await theGame.level({ from: player1 });
        assert.equal(level.toString(), 1);
      });

      it('levelStartupTimestamp == 0', async () => {
        let levelStartupTimestamp = await theGame.levelStartupTimestamp({ from: player1 });
        assert.equal(levelStartupTimestamp.toString(), 0);
      });

      it('compoundingFreq == 1day = 86400sec', async () => {
        let compoundingFreq = await theGame.compoundingFreq({ from: player1 });
        assert.equal(compoundingFreq.toString(), 86400);
      });

      it('interestRate == 5% = 50 / 1000', async () => {
        let interestRate = await theGame.interestRate({ from: player1 });
        let numerator = 50;
        let denominator = 1000;
        assert.equal(interestRate[0].toString(), numerator);
        assert.equal(interestRate[1].toString(), denominator);
      });

      it('totalPonziInGame == 0', async () => {
        let totalPonziInGame = await theGame.totalPonziInGame({ from: player1 });
        assert.equal(totalPonziInGame.toString(), 0);
      });

      it('currentDelayOnNewLevel == 0', async () => {
        let currentDelayOnNewLevel = await theGame.currentDelayOnNewLevel({ from: player1 });
        assert.equal(currentDelayOnNewLevel.toString(), 0);
      });
    });

    context('players try ENTER to game', () => {
      let amount = 10000;
      let referralAddr = web3.toHex(0);
      beforeEach(async () => {
        await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
        await token.transfer(player1, amount, { from: tokenOwner });
        await token.transfer(player2, amount, { from: tokenOwner });
      });

      context('enter to game from ponzi token transferAndCall(address,uint,bytes)', () => {
        it('throw if player dont have ponzi token', async () => {
          let balance = await token.balanceOf(player3, { from: player3 });
          await assertInvalidOpcode(token.transferAndCall(theGame.address, amount, referralAddr, { from: player3 }));
          assert.equal(balance.toString(), 0);
        });

        context('enter without referral address', () => {
          it('success entrance', async () => {
            let success = await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
            assert(success);
          });

          it('check ponzi balance of player  before / after', async () => {
            let balanceBefore = await token.balanceOf(player1);
            await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
            let balanceAfter = await token.balanceOf(player1);
            assert.equal(balanceBefore.toString(), amount);
            assert.equal(balanceAfter.toString(), 0);
          });

          it('check ponzi balance of game before / after', async () => {
            let balanceBefore = await token.balanceOf(theGame.address);
            await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
            let balanceAfter = await token.balanceOf(theGame.address);
            assert.equal(balanceBefore.toString(), 0);
            assert.equal(balanceAfter.toString(), amount);
          });

          it('check player info before / after', async () => {
            let playerInfoBefore = await theGame.playerInfo(player1);
            await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
            let timestamp = latestTime();
            let playerInfoAfter = await theGame.playerInfo(player1);
            assert.equal(playerInfoBefore[0].toString(), 0);
            assert.equal(playerInfoBefore[1].toString(), 0);
            assert.equal(playerInfoBefore[2], false);
            assert.equal(playerInfoAfter[0].toString(), amount);
            assert.equal(playerInfoAfter[1].toString(), timestamp);
            assert.equal(playerInfoAfter[2], true);
          });

          it('throw on re-enter', async () => {
            let success = await token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 });
            await assertRevert(token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 }));
            assert(success);
          });

          it('throw if input < 1000', async () => {
            let success = await token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 });
            await assertRevert(token.transferAndCall(theGame.address, 500, referralAddr, { from: player1 }));
            assert(success);
          });
        });

        context('enter with referral address', () => {
          context('referral is not player ', () => {
            let referralAddr;
            beforeEach(async () => {
              referralAddr = player2; // not player yet
            });

            it('success entrance', async () => {
              let success = await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              assert(success);
            });

            it('check ponzi balance of player  before / after', async () => {
              let balanceBefore = await token.balanceOf(player1);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let balanceAfter = await token.balanceOf(player1);
              assert.equal(balanceBefore.toString(), amount);
              assert.equal(balanceAfter.toString(), 0);
            });

            it('check ponzi balance of game before / after', async () => {
              let balanceBefore = await token.balanceOf(theGame.address);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let balanceAfter = await token.balanceOf(theGame.address);
              assert.equal(balanceBefore.toString(), 0);
              assert.equal(balanceAfter.toString(), amount);
            });

            it('check player info before / after', async () => {
              let playerInfoBefore = await theGame.playerInfo(player1);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let timestamp = latestTime();
              let playerInfoAfter = await theGame.playerInfo(player1);
              assert.equal(playerInfoBefore[0].toString(), 0);
              assert.equal(playerInfoBefore[1].toString(), 0);
              assert.equal(playerInfoBefore[2], false);
              assert.equal(playerInfoAfter[0].toString(), amount);
              assert.equal(playerInfoAfter[1].toString(), timestamp);
              assert.equal(playerInfoAfter[2], true);
            });

            it('check referral info before / after', async () => {
              let playerInfoBefore = await theGame.playerInfo(referralAddr);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let playerInfoAfter = await theGame.playerInfo(referralAddr);
              assert.equal(playerInfoBefore[0].toString(), 0);
              assert.equal(playerInfoBefore[1].toString(), 0);
              assert.equal(playerInfoBefore[2], false);
              assert.equal(playerInfoAfter[0].toString(), 0);
              assert.equal(playerInfoAfter[1].toString(), 0);
              assert.equal(playerInfoAfter[2], false);
            });

            it('throw on re-enter', async () => {
              let success = await token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 });
              await assertRevert(token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 }));
              assert(success);
            });

            it('throw if input < 1000', async () => {
              let success = await token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 });
              await assertRevert(token.transferAndCall(theGame.address, 500, referralAddr, { from: player1 }));
              assert(success);
            });
          });

          context('referral is player ', () => {
            let referralAddr; // not player yet
            let referralTimestamp;
            beforeEach(async () => {
              referralAddr = player2;
              await token.transferAndCall(theGame.address, amount, web3.toHex(0), { from: referralAddr });
              referralTimestamp = latestTime();
            });

            it('success entrance', async () => {
              let success = await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              assert(success);
            });

            it('check ponzi balance of player  before / after', async () => {
              let balanceBefore = await token.balanceOf(player1);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let balanceAfter = await token.balanceOf(player1);
              assert.equal(balanceBefore.toString(), amount);
              assert.equal(balanceAfter.toString(), 0);
            });

            it('check ponzi balance of game before / after', async () => {
              let balanceBefore = await token.balanceOf(theGame.address);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let balanceAfter = await token.balanceOf(theGame.address);
              assert.equal(balanceBefore.toString(), amount);
              assert.equal(balanceAfter.toString(), 2 * amount);
            });

            it('check player info before / after', async () => {
              let playerInfoBefore = await theGame.playerInfo(player1);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let timestamp = latestTime();
              let playerInfoAfter = await theGame.playerInfo(player1);
              assert.equal(playerInfoBefore[0].toString(), 0);
              assert.equal(playerInfoBefore[1].toString(), 0);
              assert.equal(playerInfoBefore[2], false);
              assert.equal(playerInfoAfter[0].toString(), amount * 99 / 100);
              assert.equal(playerInfoAfter[1].toString(), timestamp);
              assert.equal(playerInfoAfter[2], true);
            });

            it('check referral info before / after', async () => {
              let playerInfoBefore = await theGame.playerInfo(referralAddr);
              await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
              let playerInfoAfter = await theGame.playerInfo(referralAddr);
              assert.equal(playerInfoBefore[0].toString(), amount);
              assert.equal(playerInfoBefore[1].toString(), referralTimestamp);
              assert.equal(playerInfoBefore[2], true);
              assert.equal(playerInfoAfter[0].toString(), amount + amount * 1 / 100);
              assert.equal(playerInfoAfter[1].toString(), referralTimestamp);
              assert.equal(playerInfoAfter[2], true);
            });

            it('throw on re-enter', async () => {
              await token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 });
              await assertRevert(token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 }));
            });

            it('throw if input < 1000', async () => {
              let success = await token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 });
              await assertRevert(token.transferAndCall(theGame.address, 500, referralAddr, { from: player1 }));
              assert(success);
            });
          });
        });
      });

      context('Ponzi token -> approve(address,uint), then The Game -> enter(uint256,address)', () => {
        let referralAddr;
        beforeEach(async () => {
          await token.approve(theGame.address, amount, { from: player1 });
          referralAddr = web3.toHex(0);
        });

        it('throw if player dont have ponzi token', async () => {
          await token.approve(theGame.address, amount, { from: player3 });
          let balance = await token.balanceOf(player3, { from: player3 });
          await assertRevert(theGame.enter(amount, referralAddr, { from: player3 }));
          assert.equal(balance.toString(), 0);
        });

        it('throw if player dont allowance for the game', async () => {
          await token.transfer(player3, amount, { from: tokenOwner });
          let balance = await token.balanceOf(player3, { from: player3 });
          await assertRevert(theGame.enter(amount, referralAddr, { from: player3 }));
          assert.equal(balance.toString(), amount);
        });

        it('success entrance', async () => {
          let success = await theGame.enter(amount, referralAddr, { from: player1 });
          assert(success);
        });

        it('check ponzi balance of player  before / after', async () => {
          let balanceBefore = await token.balanceOf(player1);
          let success = await theGame.enter(amount, referralAddr, { from: player1 });
          let balanceAfter = await token.balanceOf(player1);
          assert(success);
          assert.equal(balanceBefore.toString(), amount);
          assert.equal(balanceAfter.toString(), 0);
        });

        it('check ponzi balance of game before / after', async () => {
          let balanceBefore = await token.balanceOf(theGame.address);
          await theGame.enter(amount, referralAddr, { from: player1 });
          let balanceAfter = await token.balanceOf(theGame.address);
          assert.equal(balanceBefore.toString(), 0);
          assert.equal(balanceAfter.toString(), amount);
        });

        it('check player info before / after', async () => {
          let playerInfoBefore = await theGame.playerInfo(player1);
          await theGame.enter(amount, referralAddr, { from: player1 });
          let timestamp = latestTime();
          let playerInfoAfter = await theGame.playerInfo(player1);
          assert.equal(playerInfoBefore[0].toString(), 0);
          assert.equal(playerInfoBefore[1].toString(), 0);
          assert.equal(playerInfoBefore[2], false);
          assert.equal(playerInfoAfter[0].toString(), amount);
          assert.equal(playerInfoAfter[1].toString(), timestamp);
          assert.equal(playerInfoAfter[2], true);
        });

        it('check referral info before / after', async () => {
          let playerInfoBefore = await theGame.playerInfo(referralAddr);
          await theGame.enter(amount, referralAddr, { from: player1 });
          let playerInfoAfter = await theGame.playerInfo(referralAddr);
          assert.equal(playerInfoBefore[0].toString(), 0);
          assert.equal(playerInfoBefore[1].toString(), 0);
          assert.equal(playerInfoBefore[2], false);
          assert.equal(playerInfoAfter[0].toString(), 0);
          assert.equal(playerInfoAfter[1].toString(), 0);
          assert.equal(playerInfoAfter[2], false);
        });

        it('throw on re-enter', async () => {
          let success = await theGame.enter(amount / 2, referralAddr, { from: player1 });
          await assertRevert(theGame.enter(amount / 2, referralAddr, { from: player1 }));
          assert(success);
        });

        it('throw if input < 1000', async () => {
          let success = await token.transferAndCall(theGame.address, amount / 2, referralAddr, { from: player1 });
          await assertRevert(token.transferAndCall(theGame.address, 500, referralAddr, { from: player1 }));
          assert(success);
        });
      });
    });

    context('playerOutputAtNow(address)', () => {
      let amount = 10000;
      let referralAddr = web3.toHex(0);
      let player1Input = amount;
      let player2Input = amount / 2;
      let tax = PERCENT_TAX_ON_EXIT;
      let numerator;
      beforeEach(async () => {
        await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
        await token.transfer(player1, amount, { from: tokenOwner });
        await token.transfer(player2, amount, { from: tokenOwner });
        await token.transferAndCall(theGame.address, player1Input, referralAddr, { from: player1 });
        await token.transferAndCall(theGame.address, player2Input, referralAddr, { from: player2 });
        let rate = await theGame.interestRate({ from: tokenOwner });
        numerator = rate[0].toNumber();
      });

      it('throw on not Active State', async () => {
        await theGame.setState(StateGame.NotActive.str, { from: gameOwner });
        await assertRevert(theGame.playerOutputAtNow(player1, { from: player1 }));
      });

      it('output forn not player == 0 ', async () => {
        let playerOutput = await theGame.playerOutputAtNow(player3, { from: player1 });
        assert.equal(playerOutput.toString(), 0);
      });

      it('check output on 1 day ', async () => {
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        let player2Output = await theGame.playerOutputAtNow(player2, { from: player1 });
        assert.equal(player1Output.toString(), player1Input * (100 - tax) / 100);
        assert.equal(player2Output.toString(), player2Input * (100 - tax) / 100);
      });

      it('check output on 2 day ', async () => {
        await increaseTime(duration.days(2) + 100);
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        let player2Output = await theGame.playerOutputAtNow(player2, { from: player1 });
        assert.equal(player1Output.toString(), calcCompoundingInterest(player1Input, numerator, 2));
        assert.equal(player2Output.toString(), calcCompoundingInterest(player2Input, numerator, 2));
      });

      it('check output on 7 day ', async () => {
        await increaseTime(duration.days(7) + 100);
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        let player2Output = await theGame.playerOutputAtNow(player2, { from: player1 });
        assert.equal(player1Output.toString(), calcCompoundingInterest(player1Input, numerator, 7));
        assert.equal(player2Output.toString(), calcCompoundingInterest(player2Input, numerator, 7));
      });

      it('check output on 27 day ', async () => {
        await increaseTime(duration.days(27) + 100);
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        let player2Output = await theGame.playerOutputAtNow(player2, { from: player1 });
        assert.equal(player1Output.toString(), calcCompoundingInterest(player1Input, numerator, 27));
        assert.equal(player2Output.toString(), calcCompoundingInterest(player2Input, numerator, 27));
      });

      it('check output on 53 day ', async () => {
        await increaseTime(duration.days(53) + 100);
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        let player2Output = await theGame.playerOutputAtNow(player2, { from: player1 });
        assert.equal(player1Output.toString(), calcCompoundingInterest(player1Input, numerator, 53));
        assert.equal(player2Output.toString(), calcCompoundingInterest(player2Input, numerator, 53));
      });

      it('check output on 107 day ', async () => {
        await increaseTime(duration.days(107) + 100);
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        let player2Output = await theGame.playerOutputAtNow(player2, { from: player1 });
        assert.equal(player1Output.toString(), calcCompoundingInterest(player1Input, numerator, 107));
        assert.equal(player2Output.toString(), calcCompoundingInterest(player2Input, numerator, 107));
      });

      it('check output on 421 day ', async () => {
        await increaseTime(duration.days(421) + 100);
        await theGame.disown({ from: gameOwner });
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        let player2Output = await theGame.playerOutputAtNow(player2, { from: player1 });
        assert.equal(player1Output.toString(), calcCompoundingInterest(player1Input, numerator, 421));
        assert.equal(player2Output.toString(), calcCompoundingInterest(player2Input, numerator, 421));
      });
    });

    context('playerDelayOnExit(address)', () => {
      let amount = 10000;
      let referralAddr = web3.toHex(0);
      let playerEtranceTimestamp;
      beforeEach(async () => {
        await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
        await token.transfer(player1, amount, { from: tokenOwner });
        await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
        playerEtranceTimestamp = latestTime();
      });

      it('delay is zero if not player', async () => {
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let playerDelay = await theGame.playerDelayOnExit(player3, { from: player3 });
        assert.equal(playerDelay.toString(), 0);
      });

      it('delay on after 1h', async () => {
        await increaseTime(duration.hours(1));
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let now = latestTime();
        let playerDelay = await theGame.playerDelayOnExit(player1, { from: player1 });
        assert.equal(
          playerDelay.toString(),
          BigNumber(DELAY_ON_EXIT).minus(BigNumber(now).minus(playerEtranceTimestamp)).toString()
        );
      });

      it('delay on after 99h', async () => {
        await increaseTime(duration.hours(99));
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let now = latestTime();
        let playerDelay = await theGame.playerDelayOnExit(player1, { from: player1 });
        assert.equal(
          playerDelay.toString(),
          BigNumber(DELAY_ON_EXIT).minus(BigNumber(now).minus(playerEtranceTimestamp)).toString()
        );
      });

      it('delay on after 100h', async () => {
        await increaseTime(duration.hours(100));
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let playerDelay = await theGame.playerDelayOnExit(player1, { from: player1 });
        assert.equal(playerDelay.toString(), 0);
      });

      it('delay on after 102h', async () => {
        await increaseTime(duration.hours(102));
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let playerDelay = await theGame.playerDelayOnExit(player1, { from: player1 });
        assert.equal(playerDelay.toString(), 0);
      });
    });

    context('exit() - players try EXIT from game, and get outputs ', () => {
      let referralAddr = web3.toHex(0);
      let value = new BigNumber(19 * 1e17).toString();
      let playerInput;
      let tokenPrice = new BigNumber(1e7).toString();
      // if player by token on 1 eth
      // amount is 1000 * 10^8 = 10^11
      let amount = new BigNumber(1e11).toString();
      beforeEach(async () => {
        token = await PonziToken.new({ from: tokenOwner });
        await token.initContract({ from: tokenOwner });
        theGame = await TheGame.new(token.address, { from: gameOwner, value: value });
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
        await theGame.setPonziPriceinWei(tokenPrice, { from: gameOwner });
        await token.transfer(player1, amount, { from: tokenOwner });
        await token.transfer(player2, amount, { from: tokenOwner });
        await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
        await token.transferAndCall(theGame.address, amount, referralAddr, { from: player2 });
        let playerInfo = await theGame.playerInfo(player1, { from: player1 });
        playerInput = playerInfo[0].toNumber();
      });

      it('throw if not player`s calling', async () => {
        await assertRevert(theGame.exit({ from: player3 }));
      });

      it('throw if player has delay on exit', async () => {
        await assertRevert(theGame.exit({ from: player1 }));
      });

      it('check if player was not player after exit', async () => {
        let inGameBefore = await theGame.playerInfo(player1, { from: player1 });
        await increaseTime(DELAY_ON_EXIT);
        await theGame.exit({ from: player1 });
        let inGameAfter = await theGame.playerInfo(player1, { from: player1 });
        assert.equal(inGameAfter[2], false);
        assert.equal(inGameBefore[2], true);
      });

      context('exit when game has enough eth(output in eth)', () => {
        beforeEach(async () => {
          await increaseTime(DELAY_ON_EXIT);
        });
        it('check eth balances of player and game', async () => {
          let player1BalanceBefore = await getBalance(player1);
          let theGameBalanceBefore = await getBalance(theGame.address);
          await theGame.exit({ from: player1 });
          let gasUsed = new BigNumber(latestGasUsed() * gasPrice);
          let player1BalanceAfter = await getBalance(player1);
          let theGameBalanceAfter = await getBalance(theGame.address);
          let playerOutputInWei = new BigNumber(
            calcCompoundingInterest(
              playerInput,
              50,
              Math.floor(DELAY_ON_EXIT / COMPOUNDING_FREQ)
            )
          );
          playerOutputInWei = playerOutputInWei.multipliedBy(tokenPrice);
          assert.equal(
            player1BalanceBefore.toString(),
            player1BalanceAfter.minus(playerOutputInWei).plus(gasUsed).toString()
          );
          assert.equal(theGameBalanceBefore.toString(), theGameBalanceAfter.plus(playerOutputInWei).toString());
        });

        it('check ponzi balances of player and game', async () => {
          let player1BalanceBefore = await token.balanceOf(player1);
          let theGameBalanceBefore = await token.balanceOf(theGame.address);
          await theGame.exit({ from: player1 });
          let player1BalanceAfter = await token.balanceOf(player1);
          let theGameBalanceAfter = await token.balanceOf(theGame.address);
          assert.equal(player1BalanceBefore.toString(), player1BalanceAfter.toString());
          assert.equal(theGameBalanceBefore.toString(), theGameBalanceAfter.toString());
        });
      });

      context('exit when game dont has enough eth(output in ponzi)', () => {
        beforeEach(async () => {
          await increaseTime(DELAY_ON_EXIT);
          await theGame.exit({ from: player2 });
        });

        it('check eth balances of player and game', async () => {
          let player1BalanceBefore = await getBalance(player1);
          let theGameBalanceBefore = await getBalance(theGame.address);
          await theGame.exit({ from: player1 });
          let gasUsed = BigNumber(latestGasUsed() * gasPrice);
          let player1BalanceAfter = await getBalance(player1);
          let theGameBalanceAfter = await getBalance(theGame.address);
          assert.equal(player1BalanceBefore.toString(), player1BalanceAfter.plus(gasUsed).toString());
          assert.equal(theGameBalanceBefore.toString(), theGameBalanceAfter.toString());
        });

        it('check ponzi balances of player and game', async () => {
          let player1BalanceBefore = await token.balanceOf(player1);
          let theGameBalanceBefore = await token.balanceOf(theGame.address);
          await theGame.exit({ from: player1 });
          let player1BalanceAfter = await token.balanceOf(player1);
          let theGameBalanceAfter = await token.balanceOf(theGame.address);
          let playerOutputInWei = new BigNumber(
            calcCompoundingInterest(
              playerInput,
              50,
              Math.floor(DELAY_ON_EXIT / COMPOUNDING_FREQ)
            )
          );
          assert.equal(player1BalanceBefore.toString(), player1BalanceAfter.minus(playerOutputInWei).toString());
          assert.equal(theGameBalanceBefore.toString(), theGameBalanceAfter.plus(playerOutputInWei).toString());
        });
      });

      context('exit when game dont has enough eth and ponzi(output in ponzi + new level)', () => {
        beforeEach(async () => {
          // game 1 lvl - 5% interest rate
          // 2 players with 2 input, ponzi balance of game = 2*input
          // 2*input =< input *(1.05)^n - 10%
          // 2 =< (1.05)^n - 10%
          // n = 20 is ok
          await increaseTime(duration.days(20));
        });

        it('check eth balances of player and game', async () => {
          let player1BalanceBefore = await getBalance(player1);
          let theGameBalanceBefore = await getBalance(theGame.address);
          await theGame.exit({ from: player1 });
          let gasUsed = BigNumber(latestGasUsed() * gasPrice);
          let player1BalanceAfter = await getBalance(player1);
          let theGameBalanceAfter = await getBalance(theGame.address);
          assert.equal(player1BalanceBefore.toString(), player1BalanceAfter.plus(gasUsed).toString());
          assert.equal(theGameBalanceBefore.toString(), theGameBalanceAfter.toString());
        });

        it('check ponzi balances of player and game', async () => {
          let player1BalanceBefore = await token.balanceOf(player1);
          let theGameBalanceBefore = await token.balanceOf(theGame.address);
          await theGame.exit({ from: player1 });
          let player1BalanceAfter = await token.balanceOf(player1);
          let theGameBalanceAfter = await token.balanceOf(theGame.address);
          assert.equal(player1BalanceBefore.toString(), player1BalanceAfter.minus(theGameBalanceBefore).toString());
          assert.equal(theGameBalanceAfter.toString(), 0);
        });

        it('check if new level is up and game not avaliable', async () => {
          await theGame.exit({ from: player1 });
          let newLevelTimestamp = await theGame.levelStartupTimestamp();
          let level = await theGame.level();
          await assertRevert(theGame.playerInfo(player1));
          assert.equal(latestTime(), newLevelTimestamp.toString());
          assert.equal(level.toString(), 2);
        });
      });
    });
  });

  describe('Level 2', () => {
    let referralAddr = web3.toHex(0);
    let amount = 10000;
    context('check `rulls`', () => {
      let levelStartupTimestampReal;
      before(async () => {
        token = await PonziToken.new({ from: tokenOwner });
        await token.initContract({ from: tokenOwner });
        await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
        theGame = await TheGame.new(token.address, { from: gameOwner });
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        await token.transfer(player1, 1000000, { from: tokenOwner });
        await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
        await increaseTime(DELAY_ON_EXIT);
        await theGame.exit({ from: player1 });
        levelStartupTimestampReal = latestTime();
      });

      it('level == 2', async () => {
        let level = await theGame.level({ from: player1 });
        assert.equal(level.toString(), 2);
      });

      it('levelStartupTimestamp == levelStartupTimestampReal', async () => {
        let levelStartupTimestamp = await theGame.levelStartupTimestamp({ from: player1 });
        assert.equal(levelStartupTimestamp.toString(), levelStartupTimestampReal);
      });

      it('compoundingFreq == 1day = 86400sec', async () => {
        let compoundingFreq = await theGame.compoundingFreq({ from: player1 });
        assert.equal(compoundingFreq.toString(), 86400);
      });

      it('interestRate == 4% = 40 / 1000', async () => {
        let interestRate = await theGame.interestRate({ from: player1 });
        let numerator = 40;
        let denominator = 1000;
        assert.equal(interestRate[0].toString(), numerator);
        assert.equal(interestRate[1].toString(), denominator);
      });

      it('totalPonziInGame == 0', async () => {
        let totalPonziInGame = await theGame.totalPonziInGame({ from: player1 });
        assert.equal(totalPonziInGame.toString(), 0);
      });

      it('currentDelayOnNewLevel == ' + duration.days(7), async () => {
        let currentDelayOnNewLevel = await theGame.currentDelayOnNewLevel({ from: player1 });
        assert(
          (DELAY_ON_NEW_LEVEL - 2 <= currentDelayOnNewLevel.toNumber()) &&
          (currentDelayOnNewLevel.toNumber() <= DELAY_ON_NEW_LEVEL)
        );
      });
    });

    context('players try ENTER to game', () => {
      beforeEach(async () => {
        token = await PonziToken.new({ from: tokenOwner });
        await token.initContract({ from: tokenOwner });
        await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
        theGame = await TheGame.new(token.address, { from: gameOwner });
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        await token.transfer(player1, 1000000, { from: tokenOwner });
        await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
        await increaseTime(DELAY_ON_EXIT);
        await theGame.exit({ from: player1 });
      });

      it('currentDelayOnNewLevel()', async () => {
        let currentDelayOnNewLevel = await theGame.currentDelayOnNewLevel();
        assert(
          (DELAY_ON_NEW_LEVEL - 2 <= currentDelayOnNewLevel.toNumber()) &&
          (currentDelayOnNewLevel.toNumber() <= DELAY_ON_NEW_LEVEL)
        );
      });

      it('throw if DELAY_ON_NEW_LEVEL was not expiried', async () => {
        await assertRevert(token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 }));
      });

      it('success entrance after DELAY_ON_NEW_LEVEL', async () => {
        await increaseTime(DELAY_ON_NEW_LEVEL);
        let success = await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
        assert(success);
      });

      it('check player`s output on 31 day ', async () => {
        await increaseTime(DELAY_ON_NEW_LEVEL);
        await token.transferAndCall(theGame.address, amount, referralAddr, { from: player1 });
        await increaseTime(duration.days(31) + 100);
        await theGame.setState(StateGame.Active.str, { from: gameOwner });
        let player1Output = await theGame.playerOutputAtNow(player1, { from: player1 });
        assert.equal(player1Output.toString(), calcCompoundingInterest(amount, 40, 31));
      });
    });
  });

  describe('Level 5', () => {
    let level = 5;
    let numerator = 10;
    let amount = 10000;
    before(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      await token.initContract({ from: tokenOwner });
      await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await token.transfer(player1, 1000000, { from: tokenOwner });
      await goToLevel(theGame, token, level, player1, amount);
    });

    it('level == ' + level, async () => {
      let level = await theGame.level({ from: player1 });
      assert.equal(level.toString(), level);
    });

    it('interestRate == ' + numerator / INTEREST_RATE_DENOMINATOR * 100 + '% = ' + numerator + ' / 1000', async () => {
      let interestRate = await theGame.interestRate({ from: player1 });
      assert.equal(interestRate[0].toString(), numerator);
      assert.equal(interestRate[1].toString(), INTEREST_RATE_DENOMINATOR);
    });
  });

  describe('Level 7', () => {
    let level = 7;
    let numerator = 8;
    let amount = 10000;
    before(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      await token.initContract({ from: tokenOwner });
      await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await token.transfer(player1, 1000000, { from: tokenOwner });
      await goToLevel(theGame, token, level, player1, amount);
    });

    it('level == ' + level, async () => {
      let level = await theGame.level({ from: player1 });
      assert.equal(level.toString(), level);
    });

    it('interestRate == ' + numerator / INTEREST_RATE_DENOMINATOR * 100 + '% = ' + numerator + ' / 1000', async () => {
      let interestRate = await theGame.interestRate({ from: player1 });
      assert.equal(interestRate[0].toString(), numerator);
      assert.equal(interestRate[1].toString(), INTEREST_RATE_DENOMINATOR);
    });
  });

  describe('Level 14', () => {
    let level = 14;
    let numerator = 1;
    let amount = 10000;
    before(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      await token.initContract({ from: tokenOwner });
      await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await token.transfer(player1, 1000000, { from: tokenOwner });
      await goToLevel(theGame, token, level, player1, amount);
    });

    it('level == ' + level, async () => {
      let level = await theGame.level({ from: player1 });
      assert.equal(level.toString(), level);
    });

    it('interestRate == ' + numerator / INTEREST_RATE_DENOMINATOR * 100 + '% = ' + numerator + ' / 1000', async () => {
      let interestRate = await theGame.interestRate({ from: player1 });
      assert.equal(interestRate[0].toString(), numerator);
      assert.equal(interestRate[1].toString(), INTEREST_RATE_DENOMINATOR);
    });
  });

  describe('Level 17', () => {
    let level = 17;
    let numerator = 1;
    let amount = 10000;
    before(async () => {
      token = await PonziToken.new({ from: tokenOwner });
      await token.initContract({ from: tokenOwner });
      await token.setState(StateToken.PublicUse.str, { from: tokenOwner });
      theGame = await TheGame.new(token.address, { from: gameOwner });
      await theGame.setState(StateGame.Active.str, { from: gameOwner });
      await token.transfer(player1, 1000000, { from: tokenOwner });
      await goToLevel(theGame, token, level, player1, amount);
    });

    // it('go to level ' + level, async () => {
    //   await goToLevel(theGame, token, level, player1, amount);
    // });

    it('level == ' + level, async () => {
      let level = await theGame.level({ from: player1 });
      assert.equal(level.toString(), level);
    });

    it('interestRate == ' + numerator / INTEREST_RATE_DENOMINATOR * 100 + '% = ' + numerator + ' / 1000', async () => {
      let interestRate = await theGame.interestRate({ from: player1 });
      assert.equal(interestRate[0].toString(), numerator);
      assert.equal(interestRate[1].toString(), INTEREST_RATE_DENOMINATOR);
    });
  });

  describe('fallback', () => {
    let value = ether(1);
    let ponziAddr;
    before(async () => {
      ponziAddr = player2;
      theGame = await TheGame.new(ponziAddr, { from: gameOwner });
    });

    it('throw on not Ponzi address calling', async () => {
      // we must increase gas, because coverall overwrite fallback
      await assertRevert(
        toPromise(web3.eth.sendTransaction)({
          from: gameOwner,
          to: theGame.address,
          value: value,
          gas: 70000
        }),
      );
    });

    it('succuss form Ponzi address', async () => {
      let balanceBefore = await getBalance(theGame.address);
      // we must increase gas, because coverall overwrite fallback
      await web3.eth.sendTransaction({
        from: ponziAddr,
        to: theGame.address,
        value: value,
        gas: 70000
      });
      let balanceAfter = await getBalance(theGame.address);
      assert.equal(balanceBefore.plus(value).toString(), balanceAfter.toString())
    });
  });
});
