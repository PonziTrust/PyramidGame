import getAccounts from './helpers/getAccounts';
import assertRevert from './helpers/assertRevert';
import checkPublicABI from './helpers/checkPublicABI';

const PlayersStorage = artifacts.require('./contracts/PlayersStorage.sol');
let owner, playersStorage, sender, sender1, Accounts;

contract('PlayersStorage', () => {
  before(async function () {
    Accounts = await getAccounts();
  });

  describe('check initialization', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('has a limited public ABI', () => {
      let expectedABI = [
        // public functions
        'newPlayer',
        'deletePlayer',
        'playerInfo',
        'playerInput',
        'playerExist',
        'playerTimestamp',
        'playerSetInput',
        'kill',
      ];
      checkPublicABI(PlayersStorage, expectedABI);
    });
  });

  describe('NewPlayer(address,uint256,uint256)', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('check if data was changed', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      let existBefore = await playersStorage.playerExist(sender, { from: owner });
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      let playerInfo = await playersStorage.playerInfo(sender, { from: owner });
      assert.equal(existBefore, false);
      assert.equal(playerInfo[0].toString(), inputBefore);
      assert.equal(playerInfo[1].toString(), timestamptBefore);
      assert.equal(playerInfo[2], true);
    });

    it('throw on calling not from owner ', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      await assertRevert(playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: sender }));
    });

    it('not successed if player already exist; data not changed', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      let existBefore = await playersStorage.playerExist(sender, { from: owner });
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      await playersStorage.newPlayer(sender, 2 * inputBefore, 2 * timestamptBefore, { from: owner });
      let playerInfo = await playersStorage.playerInfo(sender, { from: owner });
      assert.equal(existBefore, false);
      assert.equal(playerInfo[0].toString(), inputBefore);
      assert.equal(playerInfo[1].toString(), timestamptBefore);
      assert.equal(playerInfo[2], true);
    });
  });

  describe('playerInput(address)', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('check validity input after create new player', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      let playerInput = await playersStorage.playerInput(sender, { from: owner });
      assert.equal(playerInput.toString(), inputBefore);
    });

    it('return 0 if player not exist', async () => {
      let playerInput = await playersStorage.playerInput(sender, { from: owner });
      assert.equal(playerInput.toString(), 0);
    });

    it('throw on calling not from owner', async () => {
      await assertRevert(playersStorage.playerInput(sender, { from: sender }));
    });
  });

  describe('playerTimestamp(address)', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('check validity input after create new player', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      let playerTimestamp = await playersStorage.playerTimestamp(sender, { from: owner });
      assert.equal(playerTimestamp.toString(), timestamptBefore);
    });

    it('return 0 if player not exist', async () => {
      let playerTimestamp = await playersStorage.playerTimestamp(sender, { from: owner });
      assert.equal(playerTimestamp.toString(), 0);
    });

    it('throw on calling not from owner', async () => {
      await assertRevert(playersStorage.playerTimestamp(sender, { from: sender }));
    });
  });

  describe('playerExist(address)', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('check validity exist after create new player', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      let playerExist = await playersStorage.playerExist(sender, { from: owner });
      assert.equal(playerExist, true);
    });

    it('return false if player not exist', async () => {
      let playerExist = await playersStorage.playerExist(sender, { from: owner });
      assert.equal(playerExist, false);
    });

    it('throw on calling not from owner', async () => {
      await assertRevert(playersStorage.playerExist(sender, { from: sender }));
    });
  });

  describe('deletePlayer(address)', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('delete existed player from owner', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      let existBefore = await playersStorage.playerExist(sender, { from: owner });
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      let playerInfo = await playersStorage.playerInfo(sender, { from: owner });
      assert.equal(existBefore, false);
      assert.equal(playerInfo[0].toString(), inputBefore);
      assert.equal(playerInfo[1].toString(), timestamptBefore);
      assert.equal(playerInfo[2], true);
      await playersStorage.deletePlayer(sender, { from: owner });
      playerInfo = await playersStorage.playerInfo(sender, { from: owner });
      assert.equal(playerInfo[0].toString(), 0);
      assert.equal(playerInfo[1].toString(), 0);
      assert.equal(playerInfo[2], false);
    });

    it('throw on calling not from owner', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      await assertRevert(playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: sender }));
    });
  });

  describe('playerSetInput(address,uint256)', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      sender1 = Accounts[2];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('set input for existed player from owner', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      let existBefore = await playersStorage.playerExist(sender, { from: owner });
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      let playerInfo = await playersStorage.playerInfo(sender, { from: owner });
      assert.equal(existBefore, false);
      assert.equal(playerInfo[0].toString(), inputBefore);
      assert.equal(playerInfo[1].toString(), timestamptBefore);
      assert.equal(playerInfo[2], true);
      await playersStorage.playerSetInput(sender, 2 * inputBefore, { from: owner });
      playerInfo = await playersStorage.playerInfo(sender, { from: owner });
      assert.equal(playerInfo[0].toString(), 2 * inputBefore);
      assert.equal(playerInfo[1].toString(), timestamptBefore);
      assert.equal(playerInfo[2], true);
    });

    it('dont setting input for not existed player from owner', async () => {
      let inputBefore = 100;
      await playersStorage.playerSetInput(sender1, 2 * inputBefore, { from: owner });
      let playerInfo = await playersStorage.playerInfo(sender1, { from: owner });
      assert.equal(playerInfo[0].toString(), 0);
      assert.equal(playerInfo[1].toString(), 0);
      assert.equal(playerInfo[2], false);
    });

    it('throw on calling not from owner', async () => {
      let inputBefore = 100;
      await assertRevert(playersStorage.playerSetInput(sender, inputBefore, { from: sender }));
    });
  });

  describe('kill()', () => {
    beforeEach(async () => {
      owner = Accounts[0];
      sender = Accounts[1];
      playersStorage = await PlayersStorage.new({ from: owner });
    });

    it('calling from owner', async () => {
      let inputBefore = 100;
      let timestamptBefore = Date.now();
      let existBefore = await playersStorage.playerExist(sender, { from: owner });
      await playersStorage.newPlayer(sender, inputBefore, timestamptBefore, { from: owner });
      let playerInfo = await playersStorage.playerInfo(sender, { from: owner });
      assert.equal(existBefore, false);
      assert.equal(playerInfo[0].toString(), inputBefore);
      assert.equal(playerInfo[1].toString(), timestamptBefore);
      assert.equal(playerInfo[2], true);
      await playersStorage.kill({ from: owner });
    });

    it('throw on calling not from owner', async () => {
      await assertRevert(playersStorage.kill({ from: sender }));
    });
  });
});
