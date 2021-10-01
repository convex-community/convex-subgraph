import {Address, BigDecimal, BigInt} from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = Address.fromString("0x0000000000000000000000000000000000000000");
export const CVX_TOKEN = Address.fromString("0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
export const CRV_TOKEN = Address.fromString("0xD533a949740bb3306d119CC777fa900bA034cd52");
export const SUSHISWAP_WETH_USDT_PAIR_ADDRESS = Address.fromString("0x06da0fd433c1a5d7a4faa01111c044910a184553");
export const BIG_DECIMAL_1E6 = BigDecimal.fromString("1e6");
export const BIG_DECIMAL_1E18 = BigDecimal.fromString("1e18");
export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
export const BIG_DECIMAL_ONE = BigDecimal.fromString("1");

export const BIG_INT_ZERO = BigInt.fromString("0");
export const BIG_INT_ONE = BigInt.fromString("1");

export const WETH_ADDRESS = Address.fromString("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
export const USDT_ADDRESS = Address.fromString("0xdac17f958d2ee523a2206206994597c13d831ec7");
export const SUSHI_FACTORY_ADDRESS = Address.fromString("0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac");

export const BOOSTER_ADDRESS = Address.fromString("0xf403c135812408bfbe8713b5a23a04b3d48aae31");
export const CURVE_REGISTRY = Address.fromString("0x90e00ace148ca3b23ac1bc8c240c2a7dd9c2d7f5");

export const TRICRYPTO_LP_ADDRESS = Address.fromString("0xcA3d75aC011BF5aD07a98d02f18225F9bD9A6BDF");
export const TRICRYPTO2_LP_ADDRESS = Address.fromString("0xc4AD29ba4B3c580e6D59105FFf484999997675Ff")
export const V2_POOL_ADDRESSES = [TRICRYPTO_LP_ADDRESS, TRICRYPTO2_LP_ADDRESS]

export const CVX_CLIFF_SIZE = BigDecimal.fromString("100000"); // * 1e18; //new cliff every 100,000 tokens
export const CVX_CLIFF_COUNT = BigDecimal.fromString("1000"); // 1,000 cliffs
export const CVX_MAX_SUPPLY = BigDecimal.fromString("100000000"); // * 1e18; //100 mil max supply