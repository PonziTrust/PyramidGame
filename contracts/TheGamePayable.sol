pragma solidity ^0.4.18;
import "./TheGame.sol";


// this contract is must have, because solidity-coverage has a bag and
// no way to receive eth on fallback like this method
// see: https://github.com/sc-forks/solidity-coverage/issues/106
contract TheGamePayable is TheGame {
  function TheGamePayable(address addr) TheGame(addr) public payable { }
}