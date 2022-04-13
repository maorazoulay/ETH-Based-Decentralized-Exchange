pragma solidity ^0.5.0;

import "./Token.sol";

// TODO:
// [X] Set the fee
// [X] Deposit Ether
// [X] Withdraw Ether
// [X] Deposit tokens
// [X] Withdraw tokens
// [X] Check balances
// [X] Make order
// [X] Cancel order
// [X] Fill order
// [X] Charge fees

contract Exchange {
    using SafeMath for uint256;

    address public feeAccount; //The account that receives exchange fees
    uint256 public feePercent;
    // The tokens' mapping -> Key: token_address, value: user_balance of token
    address constant ETHER = address(0); //Store Ether in tokens mapping with blank address
    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    uint256 public orderCount;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Order(uint256 id, address user, address tokenGet, uint256 amountGet, 
                address tokenGive, uint256 amountGive, uint256 timestamp);
    event Cancel(uint256 id, address user, address tokenGet, uint256 amountGet, 
                address tokenGive, uint256 amountGive, uint256 timestamp);
    event Trade(uint256 id, address user, address tokenGet, uint256 amountGet, 
                address tokenGive, uint256 amountGive, address userFill, uint256 timestamp);
    // Structs
    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    // a way to model the order
    // a way to store the order
    // Add the order to storage

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

    function balanceOf(address _token, address _user) public view returns (uint256){
        return tokens[_token][_user];
    }

    function makeOrder(address _tokenGet,uint256 _amountGet,address _tokenGive,uint256 _amountGive) public {
        orderCount = orderCount.add(1);
        uint256 _id = orderCount;
        orders[_id] = _Order(_id,msg.sender,_tokenGet,_amountGet,_tokenGive,_amountGive,now);
        emit Order(_id,msg.sender,_tokenGet,_amountGet,_tokenGive,_amountGive,now); 
    }

    function cancelOrder(uint256 _id)public {
        // Must be "my" order
        // Order must exist!
        _Order storage _order = orders[_id];
        require(address(_order.user) == msg.sender);
        require(_order.id == _id);
        orderCancelled[_id] = true; 
        emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, _order.timestamp);
    }

    function fillOrder(uint256 _id) public {
        require(_id > 0 && _id <= orderCount);
        require(!orderFilled[_id]);
        require(!orderCancelled[_id]);
        // Fetch the order 
        _Order storage _order = orders[_id];
        _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
        // Mark order as filled
        orderFilled[_id] = true;
    }

    function _trade(uint256 _orderId, address _user, address _tokenGet,uint256 _amountGet,address _tokenGive,uint256 _amountGive) internal {
        // Charge fees:
        // Fee paid by the user that fills the order aka msg.sender
        // Fee deducted from _amountGet
        uint256 _feeAmount = _amountGive.mul(feePercent).div(100);
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount);
        // // Execute the trade
        address sender = msg.sender; //The person who fills the order
        tokens[_tokenGet][sender] = tokens[_tokenGet][sender].sub(_amountGet.add(_feeAmount));
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
        tokens[_tokenGive][sender] = tokens[_tokenGive][sender].add(_amountGive);
        // Emit a trade event
        emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, sender, now);
    } 
}
