pragma solidity 0.6.1;
pragma experimental ABIEncoderV2;

import "../interfaces/IZeroExV3.sol";
import "../libs/ExchangeAdapter.sol";
import "../libs/OrderTaker.sol";

/// @title ZeroExV3Adapter Contract
/// @author Melonport AG <team@melonport.com>
/// @notice Adapter to 0xV3 Exchange Contract
contract ZeroExV3Adapter is ExchangeAdapter, OrderTaker {
    /// @notice Takes an active order on 0x v3 (takeOrder)
    /// @param _targetExchange Address of 0x v3 exchange
    /// @param _orderAddresses [0] 0x Order param: makerAddress
    /// @param _orderAddresses [1] 0x Order param: takerAddress
    /// @param _orderAddresses [2] Maker asset
    /// @param _orderAddresses [3] Taker asset
    /// @param _orderAddresses [4] 0x Order param: feeRecipientAddress
    /// @param _orderAddresses [5] 0x Order param: senderAddress
    /// @param _orderAddresses [6] Maker fee asset
    /// @param _orderAddresses [7] Taker fee asset
    /// @param _orderData [0] 0x Order param: makerAssetData
    /// @param _orderData [1] 0x Order param: takerAssetData
    /// @param _orderData [2] 0x Order param: makerFeeAssetData
    /// @param _orderData [3] 0x Order param: takerFeeAssetData
    /// @param _orderValues [0] 0x Order param: makerAssetAmount
    /// @param _orderValues [1] 0x Order param: takerAssetAmount
    /// @param _orderValues [2] 0x Order param: makerFee
    /// @param _orderValues [3] 0x Order param: takerFee
    /// @param _orderValues [4] 0x Order param: expirationTimeSeconds
    /// @param _orderValues [5] 0x Order param: salt
    /// @param _orderValues [6] Taker asset fill quantity
    /// @param _identifier Order identifier
    /// @param _signature Signature of the order
    /// @param _fillData Encoded data to pass to OrderFiller
    function __fillTakeOrder(
        address _targetExchange,
        address[8] memory _orderAddresses,
        uint256[8] memory _orderValues,
        bytes[4] memory _orderData,
        bytes32 _identifier,
        bytes memory _signature,
        bytes memory _fillData
    )
        internal
        override
        validateAndFinalizeFilledOrder(_targetExchange, _fillData)
    {
        (,uint256[] memory fillExpectedAmounts,) = __decodeOrderFillData(_fillData);

        // Execute take order on exchange
        IZeroExV3(_targetExchange).fillOrder(
            __constructOrderStruct(_orderAddresses, _orderValues, _orderData),
            fillExpectedAmounts[1],
            _signature
        );
    }

    /// @notice Formats arrays of _fillAssets and their _fillExpectedAmounts for a takeOrder call
    /// @param _targetExchange Address of 0x v3 exchange
    /// @param _orderAddresses [0] 0x Order param: makerAddress
    /// @param _orderAddresses [1] 0x Order param: takerAddress
    /// @param _orderAddresses [2] Maker asset
    /// @param _orderAddresses [3] Taker asset
    /// @param _orderAddresses [4] 0x Order param: feeRecipientAddress
    /// @param _orderAddresses [5] 0x Order param: senderAddress
    /// @param _orderAddresses [6] Maker fee asset
    /// @param _orderAddresses [7] Taker fee asset
    /// @param _orderData [0] 0x Order param: makerAssetData
    /// @param _orderData [1] 0x Order param: takerAssetData
    /// @param _orderData [2] 0x Order param: makerFeeAssetData
    /// @param _orderData [3] 0x Order param: takerFeeAssetData
    /// @param _orderValues [0] 0x Order param: makerAssetAmount
    /// @param _orderValues [1] 0x Order param: takerAssetAmount
    /// @param _orderValues [2] 0x Order param: makerFee
    /// @param _orderValues [3] 0x Order param: takerFee
    /// @param _orderValues [4] 0x Order param: expirationTimeSeconds
    /// @param _orderValues [5] 0x Order param: salt
    /// @param _orderValues [6] Taker asset fill quantity
    /// @param _identifier Order identifier
    /// @param _signature Signature of the order
    /// @return _fillAssets Assets to fill
    /// - [0] Maker asset (same as _orderAddresses[2])
    /// - [1] Taker asset (same as _orderAddresses[3])
    /// - [2] Protocol Fee asset (WETH)
    /// - [3] Taker Fee asset (same as _orderAddresses[7])
    /// @return _fillExpectedAmounts Asset fill amounts
    /// - [0] Expected (min) quantity of maker asset to receive
    /// - [1] Expected (max) quantity of taker asset to spend
    /// - [2] Expected (max) quantity of protocol asset to spend
    /// - [3] Expected (max) quantity of taker fee asset to spend
    /// @return _fillApprovalTargets Recipients of assets in fill order
    /// - [0] Taker (fund), set to address(0)
    /// - [1] 0x asset proxy for the taker asset
    /// - [2] 0x protocolFeeCollector
    /// - [3] 0x asset proxy for the taker fee asset
    function __formatFillTakeOrderArgs(
        address _targetExchange,
        address[8] memory _orderAddresses,
        uint256[8] memory _orderValues,
        bytes[4] memory _orderData,
        bytes32 _identifier,
        bytes memory _signature
    )
        internal
        view
        override
        returns (address[] memory, uint256[] memory, address[] memory)
    {
        address[] memory fillAssets = new address[](4);
        fillAssets[0] = _orderAddresses[2]; // maker asset
        fillAssets[1] = _orderAddresses[3]; // taker asset
        fillAssets[2] = __getNativeAssetAddress(); // protocol fee
        fillAssets[3] = _orderAddresses[7]; // taker fee asset

        uint256[] memory fillExpectedAmounts = new uint256[](4);
        fillExpectedAmounts[0] = __calculateRelativeQuantity(
            _orderValues[1],
            _orderValues[0],
            _orderValues[6]
        ); // maker fill amount; calculated relative to taker fill amount
        fillExpectedAmounts[1] = _orderValues[6]; // taker fill amount
        fillExpectedAmounts[2] = __calcProtocolFeeAmount(_targetExchange); // protocol fee
        fillExpectedAmounts[3] = __calculateRelativeQuantity(
            _orderValues[1],
            _orderValues[3],
            _orderValues[6]
        ); // taker fee amount; calculated relative to taker fill amount

        address[] memory fillApprovalTargets = new address[](4);
        fillApprovalTargets[0] = address(0); // Fund (Use 0x0)
        fillApprovalTargets[1] = __getAssetProxy(_targetExchange, _orderData[1]); // 0x asset proxy for taker asset
        fillApprovalTargets[2] = IZeroExV3(_targetExchange).protocolFeeCollector(); // 0x protocol fee collector
        fillApprovalTargets[3] = __getAssetProxy(_targetExchange, _orderData[3]); // 0x asset proxy for taker fee asset

        return (fillAssets, fillExpectedAmounts, fillApprovalTargets);
    }

    /// @notice Validate the parameters of a takeOrder call
    /// @param _targetExchange Address of 0x v3 exchange
    /// @param _orderAddresses [0] 0x Order param: makerAddress
    /// @param _orderAddresses [1] 0x Order param: takerAddress
    /// @param _orderAddresses [2] Maker asset
    /// @param _orderAddresses [3] Taker asset
    /// @param _orderAddresses [4] 0x Order param: feeRecipientAddress
    /// @param _orderAddresses [5] 0x Order param: senderAddress
    /// @param _orderAddresses [6] Maker fee asset
    /// @param _orderAddresses [7] Taker fee asset
    /// @param _orderData [0] 0x Order param: makerAssetData
    /// @param _orderData [1] 0x Order param: takerAssetData
    /// @param _orderData [2] 0x Order param: makerFeeAssetData
    /// @param _orderData [3] 0x Order param: takerFeeAssetData
    /// @param _orderValues [0] 0x Order param: makerAssetAmount
    /// @param _orderValues [1] 0x Order param: takerAssetAmount
    /// @param _orderValues [2] 0x Order param: makerFee
    /// @param _orderValues [3] 0x Order param: takerFee
    /// @param _orderValues [4] 0x Order param: expirationTimeSeconds
    /// @param _orderValues [5] 0x Order param: salt
    /// @param _orderValues [6] Taker asset fill quantity
    /// @param _identifier Order identifier
    /// @param _signature Signature of the order
    function __validateTakeOrderParams(
        address _targetExchange,
        address[8] memory _orderAddresses,
        uint256[8] memory _orderValues,
        bytes[4] memory _orderData,
        bytes32 _identifier,
        bytes memory _signature
    )
        internal
        view
        override
    {
        require(
            __getAssetAddress(_orderData[0]) == _orderAddresses[2],
            "__validateTakeOrderParams: makerAssetData does not match address"
        );
        require(
            __getAssetAddress(_orderData[1]) == _orderAddresses[3],
            "__validateTakeOrderParams: takerAssetData does not match address"
        );
        require(
            _orderValues[6] <= _orderValues[1],
            "__validateTakeOrderParams: taker fill amount greater than max order quantity"
        );
        if (_orderValues[3] > 0) {
            require(
                __getAssetAddress(_orderData[3]) == _orderAddresses[7],
                "__validateTakeOrderParams: takerFeeAssetData does not match address"
            );
        }
        require(
            IZeroExV3(_targetExchange).isValidOrderSignature(
                __constructOrderStruct(_orderAddresses, _orderValues, _orderData),
                _signature
            ),
            "__validateTakeOrderParams: order signature is invalid"
        );
    }

    // PRIVATE FUNCTIONS

    function __calcProtocolFeeAmount(address _targetExchange) private view returns (uint256) {
        return mul(IZeroExV3(_targetExchange).protocolFeeMultiplier(), tx.gasprice);
    }

    /// @notice Parses user inputs into a ZeroExV3.Order format
    function __constructOrderStruct(
        address[8] memory _orderAddresses,
        uint256[8] memory _orderValues,
        bytes[4] memory _orderData
    )
        private
        pure
        returns (IZeroExV3.Order memory order_)
    {
        order_ = IZeroExV3.Order({
            makerAddress: _orderAddresses[0],
            takerAddress: _orderAddresses[1],
            feeRecipientAddress: _orderAddresses[4],
            senderAddress: _orderAddresses[5],
            makerAssetAmount: _orderValues[0],
            takerAssetAmount: _orderValues[1],
            makerFee: _orderValues[2],
            takerFee: _orderValues[3],
            expirationTimeSeconds: _orderValues[4],
            salt: _orderValues[5],
            makerAssetData: _orderData[0],
            takerAssetData: _orderData[1],
            makerFeeAssetData: _orderData[2],
            takerFeeAssetData: _orderData[3]
        });
    }

    /// @notice Gets the 0x assetProxy address for an ERC20 token
    function __getAssetProxy(address _targetExchange, bytes memory _assetData)
        private
        view
        returns (address assetProxy_)
    {
        bytes4 assetProxyId;
        assembly {
            assetProxyId := and(mload(
                add(_assetData, 32)),
                0xFFFFFFFF00000000000000000000000000000000000000000000000000000000
            )
        }
        assetProxy_ = IZeroExV3(_targetExchange).getAssetProxy(assetProxyId);
    }

    /// @notice Parses the asset address from 0x assetData
    function __getAssetAddress(bytes memory _assetData)
        private
        pure
        returns (address assetAddress_)
    {
        assembly {
            assetAddress_ := mload(add(_assetData, 36))
        }
    }
}