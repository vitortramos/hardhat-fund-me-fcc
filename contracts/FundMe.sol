// SPDX-License-Identifier: MIT
//1- Pragma
pragma solidity ^0.8.8;
//2 -Imports
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
//import "hardhat/console.sol"; //used to print logging messages and contract variables
//3- Error Code
error FundMe__NotOwner();
error FundMe__FallbackCalled();

//4- Interfaces
//5- Libraries
//6- Contracts
/** @title A contract for crowd funding
 *  @author Vítor Ramos
 *  @notice This contract is a demo
 *  @dev This implements price feeds as our library
 */
contract FundMe {
    //1- Type declarations
    using PriceConverter for uint256;

    //2- State Variables
    mapping(address => uint256) private s_addressToAmountFunded;
    address[] private s_funders;
    // Could we make this constant?  /* hint: no! We should make it immutable! */
    address private immutable i_owner;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;
    AggregatorV3Interface private s_priceFeed;

    //3- Modifiers
    modifier onlyOwner() {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }

    //4- Funcitions
    //Functions Order:
    //// 4.1- constructor
    //// 4.2- receive
    //// 4.3- fallback
    //// 4.4- external
    //// 4.5- public
    //// 4.6- internal
    //// 4.7- private
    //// 4.8- view / pure

    //4.1 constructor
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // Explainer from: https://solidity-by-example.org/fallback/
    // Ether is sent to contract
    //      is msg.data empty?
    //          /   \
    //         yes  no
    //         /     \
    //    receive()?  fallback()
    //     /   \
    //   yes   no
    //  /        \
    //receive()  fallback()
    //4.2 receive
    receive() external payable {
        fund();
    }

    //4.3 fallback
    fallback() external payable {
        fund();
        //revert FundMe__FallbackCalled();
    }

    // 4.5- public
    /**   @notice This function funds this contract
     *  @dev Requires a minimum value
     */
    function fund() public payable {
        //console.log("Chamou fund()");
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "You need to spend more ETH!"
        );
        // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }

    function withdraw() public payable onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        // // transfer
        // payable(msg.sender).transfer(address(this).balance);
        // // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");
        // call
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function cheaperWithdraw() public payable onlyOwner {
        //you consume gas to read, so it is more gas efficient to save it to the memory
        address[] memory funders = s_funders;
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            //mappings can´t be in memory!
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        // // transfer
        // payable(msg.sender).transfer(address(this).balance);
        // // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");
        // call
        // payable() converts an address in to an address payable
        address payable i_owner_payable = payable(i_owner);
        (bool success /* bytes memory returnData*/, ) = i_owner_payable.call{
            value: address(this).balance
        }("");
        require(success, "Call failed");
    }

    // Explainer from: https://solidity-by-example.org/fallback/
    // Ether is sent to contract
    //      is msg.data empty?
    //          /   \
    //         yes  no
    //         /     \
    //    receive()?  fallback()
    //     /   \
    //   yes   no
    //  /        \
    //receive()  fallback()

    //5- Pure / View Functions
    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(
        address funder
    ) public view returns (uint256) {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed()
        public
        view
        returns (AggregatorV3Interface priceFeed)
    {
        return s_priceFeed;
    }
}
