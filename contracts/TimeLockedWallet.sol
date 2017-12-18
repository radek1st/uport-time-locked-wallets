pragma solidity ^0.4.18;

import "./ERC20.sol";

contract TimeLockedWallet {

    address public architect;
    address public owner;
    uint public unlockDate;
    uint public createdAt;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function TimeLockedWallet(
        address _architect,
        address _owner,
        uint _unlockDate
    ) public {
        architect = _architect;
        owner = _owner;
        unlockDate = _unlockDate;
        createdAt = now;
    }

    // keep all the Ether sent to this address
    function() payable public { 
        Received(msg.sender, msg.value);
    }

    function topup() payable public {
        Received(msg.sender, msg.value);    
    }

    // callable by owner only, after specified time
    function withdraw() onlyOwner public {
       require(now >= unlockDate);
       //now send all the balance
       msg.sender.transfer(this.balance);
       Withdrew(msg.sender, this.balance);
    }

    // callable by owner only, after specified time, ony for Tokens implementing ERC20
    function withdrawTokens(address _tokenContract) onlyOwner public {
       require(now >= unlockDate);
       ERC20 token = ERC20(_tokenContract);
       //now send all the token balance
       uint tokenBalance = token.balanceOf(this);
       token.transfer(owner, tokenBalance);
       WithdrewTokens(_tokenContract, msg.sender, tokenBalance);
    }

    function info() public view returns(address, address, uint, uint, uint) {
        return (architect, owner, unlockDate, createdAt, this.balance);
    }

    event Received(address from, uint amount);
    event Withdrew(address to, uint amount);
    event WithdrewTokens(address tokenContract, address to, uint amount);
}
