pragma solidity ^0.5.0;

import "./Token.sol";

// TODO:
// [X] Set the fee
// [X] Deposit Ether
// [X] Withdraw Ether
// [X] Deposit tokens
// [X] Withdraw tokens
// [X] Check balances
// [] Make order
// [] Cancel order
// [] Fill order
// [] Charge fees

contract Exchange {
    using SafeMath for uint256;

    address public feeAccount; //The account that receives exchange fees
    uint256 public feePercent;
    // The tokens' mapping -> Key: token_address, value: user_balance of token
    address constant ETHER = address(0); //Store Ether in tokens mapping with blank address
    mapping(address => mapping(address => uint256)) public tokens;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(
        address token,
        address user,
        uint256 amount,
        uint256 balance
    );

    constructor(address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // Fallback: reverts when Ether is sent to this smart contract by mistake
    function() external {
        revert();
    }

    function depositEther() public payable {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint256 _amount) public {
        require(tokens[ETHER][msg.sender] >= _amount);
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        msg.sender.transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    function depositToken(address _token, uint256 _amount) public {
        // TODO: dont allow Ether deposits
        require(_token != ETHER, "Canno't deposit Ether!");
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
        // Emit an event
    }

    function withdrawToken(address _token, uint256 _amount) public {
        require(_token != ETHER, "Canno't withdraw Ether using this function!");
        require(tokens[_token][msg.sender] >= _amount);
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        require(Token(_token).transfer(msg.sender, _amount));
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user)
        public
        view
        returns (uint256)
    {
        return tokens[_token][_user];
    }
}
