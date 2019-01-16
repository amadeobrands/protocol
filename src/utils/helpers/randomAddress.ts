import * as Web3Utils from 'web3-utils';
import { Address } from '@melonproject/token-math';

export const randomAddress = () => new Address(Web3Utils.randomHex(20));
