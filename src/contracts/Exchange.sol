pragma solidity ^0.5.0;

import "./Token.sol";

// TODO:
// [X] Set the fee
// [] Deposit Ether
// [] Withdraw Ether
// [] Deposit tokens
// [] Withdraw tokens
// [] Check balances
// [] Make order
// [] Cancel order
// [] Fill order
// [] Charge fees

contract Exchange{
    using SafeMath for uint;

    address public feeAccount; //The account that receives exchange fees 
    uint256 public feePercent;
    // The tokens' mapping -> Key: token_address, value: user_balance of token
    mapping(address => mapping(address => uint256)) public tokens;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);

    constructor (address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    function depositToken(address _token, uint _amount) public {
        // TODO: dont allow Ether deposits
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
        // Emit an event 

    }
}

