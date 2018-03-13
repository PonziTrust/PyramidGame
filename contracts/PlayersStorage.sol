pragma solidity ^0.4.18;


// contract to store all info about players 
contract PlayersStorage {
  struct Player {
    uint256 input; 
    uint256 timestamp;
    bool exist;
  }
  mapping (address => Player) private m_players;
  address private m_owner;
    
  modifier onlyOwner() {
    require(msg.sender == m_owner);
    _;
  }
  
  function PlayersStorage() public {
    m_owner = msg.sender;  
  }

  // http://solidity.readthedocs.io/en/develop/contracts.html#fallback-function 
  // Contracts that receive Ether directly (without a function call, i.e. using send 
  // or transfer) but do not define a fallback function throw an exception, 
  // sending back the Ether (this was different before Solidity v0.4.0).
  // function() payable { revert(); }


  /**
  * @dev Try create new player in storage.
  * @param addr Adrress of player.
  * @param input Input of player.
  * @param timestamp Timestamp of player.
  */
  function newPlayer(address addr, uint256 input, uint256 timestamp) 
    public 
    onlyOwner() 
    returns(bool)
  {
    if (m_players[addr].exist) {
      return false;
    }
    m_players[addr].input = input;
    m_players[addr].timestamp = timestamp;
    m_players[addr].exist = true;
    return true;
  }
  
  /**
  * @dev Delet specified player from storage.
  * @param addr Adrress of specified player.
  */
  function deletePlayer(address addr) public onlyOwner() {
    delete m_players[addr];
  }
  
  /**
  * @dev Get info about specified player.
  * @param addr Adrress of specified player.
  * @return input Input of specified player.
  * @return timestamp Timestamp of specified player.
  * @return exist Whether specified player in storage or not.
  */
  function playerInfo(address addr) 
    public
    view
    onlyOwner() 
    returns(uint256 input, uint256 timestamp, bool exist) 
  {
    input = m_players[addr].input;
    timestamp = m_players[addr].timestamp;
    exist = m_players[addr].exist;
  }
  
  /**
  * @dev Get input of specified player.
  * @param addr Adrress of specified player.
  * @return input Input of specified player.
  */
  function playerInput(address addr) 
    public
    view
    onlyOwner() 
    returns(uint256 input) 
  {
    input = m_players[addr].input;
  }
  
  /**
  * @dev Get whether specified player in storage or not.
  * @param addr Adrress of specified player.
  * @return exist Whether specified player in storage or not.
  */
  function playerExist(address addr) 
    public
    view
    onlyOwner() 
    returns(bool exist) 
  {
    exist = m_players[addr].exist;
  }
  
  /**
  * @dev Get Timestamp of specified player.
  * @param addr Adrress of specified player.
  * @return timestamp Timestamp of specified player.
  */
  function playerTimestamp(address addr) 
    public
    view
    onlyOwner() 
    returns(uint256 timestamp) 
  {
    timestamp = m_players[addr].timestamp;
  }
  
  /**
  * @dev Try set input of specified player.
  * @param addr Adrress of specified player.
  * @param newInput New input of specified player.
  * @return  Whether successful or not.
  */
  function playerSetInput(address addr, uint256 newInput)
    public
    onlyOwner()
    returns(bool) 
  {
    if (!m_players[addr].exist) {
      return false;
    }
    m_players[addr].input = newInput;
    return true;
  }
  
  /**
  * @dev Do selfdestruct.
  */
  function kill() public onlyOwner() {
    selfdestruct(m_owner);
  }
}
