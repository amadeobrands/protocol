pragma solidity ^0.4.19;

import './Asset.sol';
import '../libraries/safeMath.sol';

/// @title PreminedAsset Contract.
/// @author Melonport AG <team@melonport.com>
/// @notice An Asset with premined amount assigned to the creator, used to make markets
contract PreminedAsset is Asset {
    using safeMath for uint;

    // METHODS

    function PreminedAsset(string name, string symbol, uint decimals, uint amount)
        Asset(name, symbol, decimals)
    {
        balances[msg.sender] = balances[msg.sender].add(amount);
        totalSupply = totalSupply.add(amount);
    }
}
