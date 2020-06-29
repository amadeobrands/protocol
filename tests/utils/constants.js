export const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
export const KYBER_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const TRACKS = {
  // Track for testing with our own testing price feed
  TESTING: 'testing',
  // Track linked to the kyber price feed
  KYBER_PRICE: 'kyberPrice',
}

export const ENCODING_TYPES = {
  ZERO_EX_V2: ['address[4]', 'uint256[7]', 'bytes[2]', 'bytes'],
  ZERO_EX_V3: ['address[4]', 'uint256[7]', 'bytes[4]', 'bytes'],
  AIR_SWAP: ['address[6]', 'uint256[6]', 'bytes4[2]', 'bytes32[2]', 'uint8', 'bytes1'],
  OASIS_DEX: ['address', 'uint256', 'address', 'uint256', 'uint256'],
  MINIMAL: ['address', 'uint256', 'address', 'uint256'], // a general and minimal type
}

export const CONTRACT_NAMES = {
  ADDRESS_LIST: 'AddressList',
  AIR_SWAP_ADAPTER: 'AirSwapAdapter',
  AMGU_CONSUMER: 'AmguConsumer',
  ASSET_BLACKLIST: 'AssetBlacklist',
  ASSET_WHITELIST: 'AssetWhitelist',
  BURNABLE_TOKEN: 'BurnableToken',
  CONVERSION_RATES: 'ConversionRates',
  DAI: 'DAI',
  ENGINE: 'Engine',
  ENGINE_ADAPTER: 'EngineAdapter',
  ERC20_TRANSFER_HANDLER: 'ERC20TransferHandler',
  FEE_MANAGER: 'FeeManager',
  FEE_MANAGER_FACTORY: 'FeeManagerFactory',
  FUND_FACTORY: 'FundFactory',
  HUB: 'Hub',
  IERC20: 'IERC20',
  INTEGRATION_ADAPTER: 'IntegrationAdapter',
  IERC20: 'IERC20',
  KNC: 'KNC',
  KYBER_ADAPTER: 'KyberAdapter',
  KYBER_EXCHANGE: 'KyberNetwork',
  KYBER_MOCK_NETWORK: 'MockKyberNetwork',
  KYBER_NETWORK_PROXY: 'KyberNetworkProxy',
  KYBER_NETWORK_INTERFACE: 'IKyberNetworkProxy',
  KYBER_PRICEFEED: 'KyberPriceFeed',
  KYBER_RESERVE: 'KyberReserve',
  KYBER_WHITELIST: 'KyberWhiteList',
  MALICIOUS_TOKEN: 'MaliciousToken',
  MANAGEMENT_FEE: 'ManagementFee',
  MAX_CONCENTRATION: 'MaxConcentration',
  MAX_POSITIONS: 'MaxPositions',
  MLN: 'MLN',
  OASIS_DEX_ADAPTER: 'OasisDexAdapter',
  OASIS_DEX_EXCHANGE: 'OasisDexExchange',
  OASIS_DEX_INTERFACE: 'IOasisDex',
  ORDER_TAKER: 'OrderTaker',
  PERFORMANCE_FEE: 'PerformanceFee',
  POLICY: 'Policy',
  POLICY_MANAGER: 'PolicyManager',
  POLICY_MANAGER_FACTORY: 'PolicyManagerFactory',
  PREMINED_TOKEN: 'PreminedToken',
  PRICE_TOLERANCE: 'PriceTolerance',
  REGISTRY: 'Registry',
  SHARES: 'Shares',
  SHARES_FACTORY: 'SharesFactory',
  SHARES_REQUESTOR: 'SharesRequestor',
  SHARES_TOKEN: 'SharesToken',
  SPOKE: 'Spoke',
  STANDARD_TOKEN: 'StandardToken',
  TESTING_PRICEFEED: 'TestingPriceFeed',
  TRADING: 'Trading',
  TRANSFER_HANDLER_REGISTRY: 'TransferHandlerRegistry',
  UNISWAP_ADAPTER: 'UniswapAdapter',
  UNISWAP_FACTORY_INTERFACE: 'IUniswapFactory',
  UNISWAP_EXCHANGE: 'UniswapExchange',
  UNISWAP_EXCHANGE_INTERFACE: 'IUniswapExchange',
  UNISWAP_EXCHANGE_TEMPLATE: 'UniswapExchangeTemplate',
  AIR_SWAP_SWAP: 'AirSwapSwap',
  AIR_SWAP_TYPES: 'AirSwapTypes',
  AIR_SWAP_ADAPTER: 'AirSwapAdapter',
  USER_WHITELIST: 'UserWhitelist',
  VALUE_INTERPRETER: 'ValueInterpreter',
  VAULT: 'Vault',
  VAULT_FACTORY: 'VaultFactory',
  WETH: 'WETH',
  ZERO_EX_V2_ADAPTER: 'ZeroExV2Adapter',
  ZERO_EX_V2_ERC20_PROXY: 'ZeroExV2ERC20Proxy',
  ZERO_EX_V2_EXCHANGE_INTERFACE: 'IZeroExV2',
  ZERO_EX_V3_ADAPTER: 'ZeroExV3Adapter',
  ZERO_EX_V3_ERC20_PROXY: 'ZeroExV3ERC20Proxy',
  ZERO_EX_V3_EXCHANGE_INTERFACE: 'IZeroExV3',
  ZERO_EX_V3_STAKING: 'ZeroExV3Staking',
  ZERO_EX_V3_STAKING_PROXY: 'ZeroExV3StakingProxy',
  ZERO_EX_V3_ZRX_VAULT: 'ZeroExV3ZrxVault',
  ZRX: 'ZRX'
}
