/*
 * @file Unit tests for vault via the KyberAdapter
 *
 * @dev Note that liquidity pool is only added to in top-level beforeAll,
 * which is fine because these unit tests are agnostic to pricefeed
 *
 * @test takeOrder: __validateTakeOrderParams
 * @test takeOrder: Order 1: eth to token
 * @test takeOrder: Order 2: token to eth
 * @test takeOrder: Order 3: token to token
 */

import { BN, toWei } from 'web3-utils';
import { call, send } from '~/utils/deploy-contract';
import { BNExpMul } from '~/utils/BNmath';
import {
  CONTRACT_NAMES,
  KYBER_ETH_ADDRESS,
} from '~/utils/constants';
import { setupFundWithParams } from '~/utils/fund';
import {
  getEventCountFromLogs,
  getEventFromLogs,
  getFunctionSignature
} from '~/utils/metadata';
import { encodeTakeOrderArgs } from '~/utils/formatting';
import { getDeployed } from '~/utils/getDeployed';
import mainnetAddrs from '~/config';

let deployer, manager;
let managerTxOpts;
let dai, mln, weth;
let kyberAdapter, kyberNetworkProxy;
let fund, fundFactory;
let takeOrderSignature;

beforeAll(async () => {
  [deployer, manager] = await web3.eth.getAccounts();
  managerTxOpts = { from: manager, gas: 8000000 };

  takeOrderSignature = getFunctionSignature(
    CONTRACT_NAMES.ORDER_TAKER,
    'takeOrder',
  );

  dai = getDeployed(CONTRACT_NAMES.ERC20_WITH_FIELDS, mainnetAddrs.tokens.DAI);
  mln = getDeployed(CONTRACT_NAMES.ERC20_WITH_FIELDS, mainnetAddrs.tokens.MLN);
  weth = getDeployed(CONTRACT_NAMES.WETH, mainnetAddrs.tokens.WETH);
  kyberAdapter = getDeployed(CONTRACT_NAMES.KYBER_ADAPTER);
  kyberNetworkProxy = getDeployed(CONTRACT_NAMES.KYBER_NETWORK_INTERFACE, mainnetAddrs.kyber.KyberNetworkProxy);
  fundFactory = getDeployed(CONTRACT_NAMES.FUND_FACTORY);
});

describe('takeOrder', () => {
  // TODO: input validation, if necessary
  // @dev Only need to run this once
  // describe('__validateTakeOrderParams', () => {
  // });

  describe('Fill Order 1: eth to token', () => {
    let makerAsset, makerQuantity, takerAsset, takerQuantity;
    let tx;

    beforeAll(async () => {
      takerAsset = weth.options.address;
      takerQuantity = toWei('0.01', 'ether');
      makerAsset = mln.options.address;

      const { 0: expectedRate } = await call(
        kyberNetworkProxy,
        'getExpectedRate',
        [KYBER_ETH_ADDRESS, makerAsset, takerQuantity],
      );

      makerQuantity = BNExpMul(
        new BN(takerQuantity.toString()),
        new BN(expectedRate.toString()),
      ).toString();

      fund = await setupFundWithParams({
        integrationAdapters: [kyberAdapter.options.address],
        initialInvestment: {
          contribAmount: toWei('1', 'ether'),
          investor: deployer,
          tokenContract: weth
        },
        quoteToken: weth.options.address,
        fundFactory,
        manager
      });
    });

    test('order is filled through the fund', async () => {
      const { vault } = fund;

      const encodedArgs = encodeTakeOrderArgs({
        makerAsset,
        makerQuantity,
        takerAsset,
        takerQuantity,
      });

      tx = await send(
        vault,
        'callOnIntegration',
        [
          kyberAdapter.options.address,
          takeOrderSignature,
          encodedArgs,
        ],
        managerTxOpts
      );
    });

    it('emits correct OrderFilled event', async () => {
      const orderFilledCount = getEventCountFromLogs(
        tx.logs,
        CONTRACT_NAMES.KYBER_ADAPTER,
        'OrderFilled'
      );
      expect(orderFilledCount).toBe(1);

      const orderFilled = getEventFromLogs(
        tx.logs,
        CONTRACT_NAMES.KYBER_ADAPTER,
        'OrderFilled'
      );
      expect(orderFilled.buyAsset).toBe(makerAsset);
      expect(orderFilled.buyAmount).toBe(makerQuantity);
      expect(orderFilled.sellAsset).toBe(takerAsset);
      expect(orderFilled.sellAmount).toBe(takerQuantity);
      expect(orderFilled.feeAssets.length).toBe(0);
      expect(orderFilled.feeAmounts.length).toBe(0);
    });
  });

  // @dev Set denomination asset to MLN to allow investment in MLN
  describe('Fill Order 2: token to eth', () => {
    let makerAsset, makerQuantity, takerAsset, takerQuantity;
    let tx;

    beforeAll(async () => {
      takerAsset = mln.options.address;
      takerQuantity = toWei('0.01', 'ether');
      makerAsset = weth.options.address;

      const { 0: expectedRate } = await call(
        kyberNetworkProxy,
        'getExpectedRate',
        [takerAsset, KYBER_ETH_ADDRESS, takerQuantity],
      );

      makerQuantity = BNExpMul(
        new BN(takerQuantity.toString()),
        new BN(expectedRate.toString()),
      ).toString();

      fund = await setupFundWithParams({
        integrationAdapters: [kyberAdapter.options.address],
        initialInvestment: {
          contribAmount: toWei('1', 'ether'),
          investor: deployer,
          tokenContract: mln
        },
        quoteToken: mln.options.address,
        manager,
        fundFactory
      });
    });

    test('order is filled through the fund', async () => {
      const { vault } = fund;

      const encodedArgs = encodeTakeOrderArgs({
        makerAsset,
        makerQuantity,
        takerAsset,
        takerQuantity,
      });

      // TODO: this is the tx that fails now (just with revert, no message)
      tx = await send(
        vault,
        'callOnIntegration',
        [
          kyberAdapter.options.address,
          takeOrderSignature,
          encodedArgs,
        ],
        managerTxOpts
      );
    });

    it('emits correct OrderFilled event', async () => {
      const orderFilledCount = getEventCountFromLogs(
        tx.logs,
        CONTRACT_NAMES.KYBER_ADAPTER,
        'OrderFilled'
      );
      expect(orderFilledCount).toBe(1);

      const orderFilled = getEventFromLogs(
        tx.logs,
        CONTRACT_NAMES.KYBER_ADAPTER,
        'OrderFilled'
      );
      expect(orderFilled.buyAsset).toBe(makerAsset);
      expect(orderFilled.buyAmount).toBe(makerQuantity);
      expect(orderFilled.sellAsset).toBe(takerAsset);
      expect(orderFilled.sellAmount).toBe(takerQuantity);
      expect(orderFilled.feeAssets.length).toBe(0);
      expect(orderFilled.feeAmounts.length).toBe(0);
    });
  });

  // @dev Set denomination asset to MLN to allow investment in MLN
  describe('Fill Order 3: token to token', () => {
    let makerAsset, makerQuantity, takerAsset, takerQuantity;
    let tx;

    beforeAll(async () => {
      takerAsset = mln.options.address;
      takerQuantity = toWei('0.01', 'ether');
      makerAsset = dai.options.address;

      const { 0: expectedRate } = await call(
        kyberNetworkProxy,
        'getExpectedRate',
        [takerAsset, makerAsset, takerQuantity],
      );

      makerQuantity = BNExpMul(
        new BN(takerQuantity.toString()),
        new BN(expectedRate.toString()),
      ).toString();

      fund = await setupFundWithParams({
        integrationAdapters: [kyberAdapter.options.address],
        initialInvestment: {
          contribAmount: toWei('1', 'ether'),
          investor: deployer,
          tokenContract: mln
        },
        quoteToken: mln.options.address,
        fundFactory,
        manager
      });
    });

    test('order is filled through the fund', async () => {
      const { vault } = fund;

      const encodedArgs = encodeTakeOrderArgs({
        makerAsset,
        makerQuantity,
        takerAsset,
        takerQuantity,
      });

      tx = await send(
        vault,
        'callOnIntegration',
        [
          kyberAdapter.options.address,
          takeOrderSignature,
          encodedArgs,
        ],
        managerTxOpts
      );
    });

    it('emits correct OrderFilled event', async () => {
      const orderFilledCount = getEventCountFromLogs(
        tx.logs,
        CONTRACT_NAMES.KYBER_ADAPTER,
        'OrderFilled'
      );
      expect(orderFilledCount).toBe(1);

      const orderFilled = getEventFromLogs(
        tx.logs,
        CONTRACT_NAMES.KYBER_ADAPTER,
        'OrderFilled'
      );
      expect(orderFilled.buyAsset).toBe(makerAsset);
      expect(orderFilled.buyAmount).toBe(makerQuantity);
      expect(orderFilled.sellAsset).toBe(takerAsset);
      expect(orderFilled.sellAmount).toBe(takerQuantity);
      expect(orderFilled.feeAssets.length).toBe(0);
      expect(orderFilled.feeAmounts.length).toBe(0);
    });
  });
});
