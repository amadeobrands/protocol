/*
 * @file Unit tests for vault via the EngineAdapter (input validation only)
 *
 * @dev This file only contains tests for callOnIntegration param validation.
 * Other tests rely on EVM manipulation not allowed on testnets (only local blockchain).
 * Those tests are in engineAdapterLocal.test.js
 * All funds are denominated in MLN so that funds can receive MLN as investment
 * 
 * @test takeOrder: __validateTakeOrderParams
 */

import { toWei } from 'web3-utils';
import { send } from '~/utils/deploy-contract';
import { CONTRACT_NAMES } from '~/utils/constants';
import { setupFundWithParams } from '~/utils/fund';
import { getFunctionSignature } from '~/utils/metadata';
import { encodeTakeOrderArgs } from '~/utils/formatting';
import { getDeployed } from '~/utils/getDeployed';
import mainnetAddrs from '~/config';

let deployer, manager;
let dai, mln, weth, engineAdapter, fundFactory;
let managerTxOpts;
let fund;
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
  engineAdapter = getDeployed(CONTRACT_NAMES.ENGINE_ADAPTER);
  fundFactory = getDeployed(CONTRACT_NAMES.FUND_FACTORY);
});

describe('takeOrder', () => {
  describe('__validateTakeOrderParams', () => {
    let makerAsset, makerQuantity, takerAsset, takerQuantity;
    let badAsset;

    beforeAll(async () => {
      makerAsset = weth.options.address;
      makerQuantity = toWei('0.02', 'ether');
      takerAsset = mln.options.address;
      takerQuantity = toWei('0.01', 'ether');
      badAsset = dai.options.address;

      // Set up fund
      fund = await setupFundWithParams({
        integrationAdapters: [engineAdapter.options.address],
        initialInvestment: {
          contribAmount: toWei('1', 'ether'),
          investor: deployer,
          tokenContract: mln
        },
        manager,
        quoteToken: mln.options.address,
        fundFactory
      });
    });

    it('does not allow maker asset other than WETH', async () => {
      const { vault } = fund;

      const encodedArgs = encodeTakeOrderArgs({
        makerAsset: badAsset,
        makerQuantity,
        takerAsset,
        takerQuantity,
      });

      await expect(
        send(
          vault,
          'callOnIntegration',
          [
            engineAdapter.options.address,
            takeOrderSignature,
            encodedArgs,
          ],
          managerTxOpts
        )
      ).rejects.toThrowFlexible("maker asset does not match nativeAsset")
    });

    it('does not allow taker asset other than MLN', async () => {
      const { vault } = fund;

      const encodedArgs = encodeTakeOrderArgs({
        makerAsset,
        makerQuantity,
        takerAsset: badAsset,
        takerQuantity,
      });

      await expect(
        send(
          vault,
          'callOnIntegration',
          [
            engineAdapter.options.address,
            takeOrderSignature,
            encodedArgs,
          ],
          managerTxOpts
        )
      ).rejects.toThrowFlexible("taker asset does not match mlnToken")
    });

    it('does not allow trade when no ether in engine', async () => {
      const { vault } = fund;
      const zeroMakerQuanity = 0;

      const encodedArgs = encodeTakeOrderArgs({
        makerAsset,
        makerQuantity: zeroMakerQuanity,
        takerAsset: takerAsset,
        takerQuantity,
      });

      await expect(
        send(
          vault,
          'callOnIntegration',
          [
            engineAdapter.options.address,
            takeOrderSignature,
            encodedArgs,
          ],
          managerTxOpts
        )
      ).rejects.toThrowFlexible("Not enough liquid ether to send")
    });
  });
});
