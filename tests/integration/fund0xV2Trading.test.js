/*
 * @file Tests funds vault via the 0x adapter
 *
 * @test Fund takes an order
 * @test Fund takes an order with a taker fee
 */

import { BN, toWei } from 'web3-utils';
import { call, send } from '~/utils/deploy-contract';
import { CONTRACT_NAMES } from '~/utils/constants';
import { setupFundWithParams } from '~/utils/fund';
import { getFunctionSignature } from '~/utils/metadata';
import {
  createUnsignedZeroExOrder,
  encodeZeroExTakeOrderArgs,
  isValidZeroExSignatureOffChain,
  signZeroExOrder
} from '~/utils/zeroExV2';
import { getDeployed } from '~/utils/getDeployed';
import mainnetAddrs from '~/config';

let deployer, manager, investor;
let defaultTxOpts, managerTxOpts;
let mln, zrx, weth, erc20Proxy, zeroExAdapter, zeroExExchange;
let fund;
let takeOrderSignature;

beforeAll(async () => {
  [deployer, manager, investor] = await web3.eth.getAccounts();
  defaultTxOpts = { from: deployer, gas: 8000000 };
  managerTxOpts = { ...defaultTxOpts, from: manager };

  takeOrderSignature = getFunctionSignature(
    CONTRACT_NAMES.ORDER_TAKER,
    'takeOrder',
  );

  mln = getDeployed(CONTRACT_NAMES.ERC20_WITH_FIELDS, mainnetAddrs.tokens.MLN);
  weth = getDeployed(CONTRACT_NAMES.WETH, mainnetAddrs.tokens.WETH);
  zrx = getDeployed(CONTRACT_NAMES.ERC20_WITH_FIELDS, mainnetAddrs.tokens.ZRX);
  erc20Proxy = getDeployed(CONTRACT_NAMES.ZERO_EX_V2_ERC20_PROXY, mainnetAddrs.zeroExV2.ZeroExV2ERC20Proxy);
  zeroExAdapter = getDeployed(CONTRACT_NAMES.ZERO_EX_V2_ADAPTER);
  zeroExExchange = getDeployed(CONTRACT_NAMES.ZERO_EX_V2_EXCHANGE_INTERFACE, mainnetAddrs.zeroExV2.ZeroExV2Exchange);
  const fundFactory = getDeployed(CONTRACT_NAMES.FUND_FACTORY);

  fund = await setupFundWithParams({
    integrationAdapters: [zeroExAdapter.options.address],
    initialInvestment: {
      contribAmount: toWei('1', 'ether'),
      investor,
      tokenContract: weth
    },
    manager,
    quoteToken: weth.options.address,
    fundFactory
  });
});

describe('Fund takes an order', () => {
  let signedOrder;

  test('Third party makes and validates an off-chain order', async () => {
    const makerAddress = deployer;
    const makerAssetAmount = toWei('1', 'Ether');
    const takerAssetAmount = toWei('0.05', 'Ether');

    const unsignedOrder = await createUnsignedZeroExOrder(
      zeroExExchange.options.address,
      {
        makerAddress,
        makerTokenAddress: zrx.options.address,
        makerAssetAmount,
        takerTokenAddress: weth.options.address,
        takerAssetAmount,
      }
    );

    await send(zrx, 'approve', [erc20Proxy.options.address, makerAssetAmount], defaultTxOpts);
    signedOrder = await signZeroExOrder(unsignedOrder, deployer);
    const signatureValid = await isValidZeroExSignatureOffChain(
      unsignedOrder,
      signedOrder.signature,
      deployer
    );

    expect(signatureValid).toBeTruthy();
  });

  test('Manager takes order through adapter', async () => {
    const { vault } = fund;
    const fillQuantity = signedOrder.takerAssetAmount;

    const preMlnDeployer = new BN(await call(zrx, 'balanceOf', [deployer]));
    const preWethDeployer = new BN(await call(weth, 'balanceOf', [deployer]));
    const preFundBalanceOfWeth = new BN(await call(weth, 'balanceOf', [vault.options.address]));
    const preFundBalanceOfMln = new BN(await call(zrx, 'balanceOf', [vault.options.address]));

    const encodedArgs = encodeZeroExTakeOrderArgs(signedOrder, fillQuantity);

    await send(
      vault,
      'callOnIntegration',
      [
        zeroExAdapter.options.address,
        takeOrderSignature,
        encodedArgs,
      ],
      managerTxOpts
    );

    const postMlnDeployer = new BN(await call(zrx, 'balanceOf', [deployer]));
    const postWethDeployer = new BN(await call(weth, 'balanceOf', [deployer]));
    const postFundBalanceOfWeth = new BN(await call(weth, 'balanceOf', [vault.options.address]));
    const postFundBalanceOfMln = new BN(await call(zrx, 'balanceOf', [vault.options.address]));

    expect(postMlnDeployer).bigNumberEq(preMlnDeployer.sub(new BN(signedOrder.makerAssetAmount)));
    expect(postWethDeployer).bigNumberEq(preWethDeployer.add(new BN(signedOrder.takerAssetAmount)));

    const fundBalanceOfWethDiff = preFundBalanceOfWeth.sub(postFundBalanceOfWeth);
    const fundBalanceOfMlnDiff = postFundBalanceOfMln.sub(preFundBalanceOfMln);

    // Confirm that expected asset amounts were filled
    expect(fundBalanceOfWethDiff).bigNumberEq(new BN(signedOrder.takerAssetAmount));
    expect(fundBalanceOfMlnDiff).bigNumberEq(new BN(signedOrder.makerAssetAmount));
  });
});

describe('Fund takes an order with a taker fee', () => {
  let signedOrder;

  test('Third party makes and validates an off-chain order', async () => {
    const makerAddress = deployer;
    const takerFee = new BN(toWei('0.0001', 'ether'));

    const makerAssetAmount = toWei('1', 'Ether');
    const takerAssetAmount = toWei('0.05', 'Ether');

    const unsignedOrder = await createUnsignedZeroExOrder(
      zeroExExchange.options.address,
      {
        feeRecipientAddress: investor,
        makerAddress,
        makerTokenAddress: mln.options.address,
        makerAssetAmount,
        takerFee,
        takerTokenAddress: weth.options.address,
        takerAssetAmount,
      }
    );

    await send(mln, 'approve', [erc20Proxy.options.address, makerAssetAmount], defaultTxOpts);
    signedOrder = await signZeroExOrder(unsignedOrder, deployer);
    const signatureValid = await isValidZeroExSignatureOffChain(
      unsignedOrder,
      signedOrder.signature,
      deployer
    );

    expect(signatureValid).toBeTruthy();
  });

  test('manager takes order through adapter', async () => {
    const { vault } = fund;
    const fillQuantity = signedOrder.takerAssetAmount;

    const preMlnDeployer = new BN(await call(mln, 'balanceOf', [deployer]));
    const preWethDeployer = new BN(await call(weth, 'balanceOf', [deployer]));
    const preFundBalanceOfWeth = new BN(await call(weth, 'balanceOf', [vault.options.address]));
    const preFundBalanceOfMln = new BN(await call(mln, 'balanceOf', [vault.options.address]));
    const preFundBalanceOfZrx = new BN(await call(zrx, 'balanceOf', [vault.options.address]));

    const encodedArgs = encodeZeroExTakeOrderArgs(signedOrder, fillQuantity);

    await send(
      vault,
      'callOnIntegration',
      [
        zeroExAdapter.options.address,
        takeOrderSignature,
        encodedArgs,
      ],
      managerTxOpts
    );

    const postMlnDeployer = new BN(await call(mln, 'balanceOf', [deployer]));
    const postWethDeployer = new BN(await call(weth, 'balanceOf', [deployer]));
    const postFundBalanceOfWeth = new BN(await call(weth, 'balanceOf', [vault.options.address]));
    const postFundBalanceOfMln = new BN(await call(mln, 'balanceOf', [vault.options.address]));
    const postFundBalanceOfZrx = new BN(await call(zrx, 'balanceOf', [vault.options.address]));

    expect(postMlnDeployer).bigNumberEq(preMlnDeployer.sub(new BN(signedOrder.makerAssetAmount)));
    expect(postWethDeployer).bigNumberEq(preWethDeployer.add(new BN(signedOrder.takerAssetAmount)));

    const fundBalanceOfWethDiff = preFundBalanceOfWeth.sub(postFundBalanceOfWeth);
    const fundBalanceOfMlnDiff = postFundBalanceOfMln.sub(preFundBalanceOfMln);
    const fundBalanceOfZrxDiff = preFundBalanceOfZrx.sub(postFundBalanceOfZrx);

    // Confirm that expected asset amounts were filled
    expect(fundBalanceOfWethDiff).bigNumberEq(new BN(signedOrder.takerAssetAmount));
    expect(fundBalanceOfMlnDiff).bigNumberEq(new BN(signedOrder.makerAssetAmount));
    expect(fundBalanceOfZrxDiff).bigNumberEq(new BN(signedOrder.takerFee));
  });
});
