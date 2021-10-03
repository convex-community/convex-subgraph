import {Address, BigDecimal, BigInt} from '@graphprotocol/graph-ts'

export const BIG_DECIMAL_1E6 = BigDecimal.fromString("1e6");
export const BIG_DECIMAL_1E8 = BigDecimal.fromString("1e8");
export const BIG_DECIMAL_1E18 = BigDecimal.fromString("1e18");
export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
export const BIG_DECIMAL_ONE = BigDecimal.fromString("1");

export const BIG_INT_ZERO = BigInt.fromString("0");
export const BIG_INT_ONE = BigInt.fromString("1");

export const CVX_ADDRESS = Address.fromString("0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
export const CRV_ADDRESS = Address.fromString("0xD533a949740bb3306d119CC777fa900bA034cd52");
export const ADDRESS_ZERO = Address.fromString("0x0000000000000000000000000000000000000000");
export const WETH_ADDRESS = Address.fromString("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
export const USDT_ADDRESS = Address.fromString("0xdac17f958d2ee523a2206206994597c13d831ec7");
export const WBTC_ADDRESS = Address.fromString("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
export const LINK_ADDRESS = Address.fromString("0x514910771af9ca656af840dff83e8264ecf986ca");
export const LINK_LP_TOKEN_ADDRESS = Address.fromString("0xcee60cFa923170e4f8204AE08B4fA6A3F5656F3a");

// for Forex and EUR pool, map lp token to Chainlink price feed
export const EURT_LP_TOKEN = "0xfd5db7463a3ab53fd211b4af195c5bccc1a03890";
export const EURS_LP_TOKEN = "0x194ebd173f6cdace046c53eacce9b953f28411d1";
export const JPY_LP_TOKEN = "0x8818a9bb44fbf33502be7c15c500d0c783b73067";
export const KRW_LP_TOKEN = "0x8461a004b50d321cb22b7d034969ce6803911899";
export const GBP_LP_TOKEN = "0xd6ac1cb9019137a896343da59dde6d097f710538";
export const AUD_LP_TOKEN = "0x3f1b0278a9ee595635b61817630cc19de792f506";
export const CHF_LP_TOKEN = "0x9c2c8910f113181783c249d8f6aa41b51cde0f0c";

export const FOREX_ORACLES = {
  EURT_LP_TOKEN: Address.fromString("0xb49f677943BC038e9857d61E7d053CaA2C1734C1"),
  EURS_LP_TOKEN: Address.fromString("0xb49f677943BC038e9857d61E7d053CaA2C1734C1"),
  KRW_LP_TOKEN: Address.fromString("0x01435677FB11763550905594A16B645847C1d0F3"),
  JPY_LP_TOKEN: Address.fromString("0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3"),
  GBP_LP_TOKEN: Address.fromString("0x5c0Ab2d9b5a7ed9f470386e82BB36A3613cDd4b5"),
  AUD_LP_TOKEN: Address.fromString("0x77F9710E7d0A19669A13c055F62cd80d313dF022"),
  CHF_LP_TOKEN: Address.fromString("0x449d117117838fFA61263B61dA6301AA2a88B13A")
}

export const SUSHISWAP_WETH_USDT_PAIR_ADDRESS = Address.fromString("0x06da0fd433c1a5d7a4faa01111c044910a184553");
export const SUSHI_FACTORY_ADDRESS = Address.fromString("0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac");

export const BOOSTER_ADDRESS = Address.fromString("0xf403c135812408bfbe8713b5a23a04b3d48aae31");
export const CURVE_REGISTRY = Address.fromString("0x90e00ace148ca3b23ac1bc8c240c2a7dd9c2d7f5");

export const TRICRYPTO_LP_ADDRESS = Address.fromString("0xcA3d75aC011BF5aD07a98d02f18225F9bD9A6BDF");
export const TRICRYPTO2_LP_ADDRESS = Address.fromString("0xc4AD29ba4B3c580e6D59105FFf484999997675Ff")
export const V2_POOL_ADDRESSES = [TRICRYPTO_LP_ADDRESS, TRICRYPTO2_LP_ADDRESS]

export const CVX_CLIFF_SIZE = BigDecimal.fromString("100000"); // * 1e18; //new cliff every 100,000 tokens
export const CVX_CLIFF_COUNT = BigDecimal.fromString("1000"); // 1,000 cliffs
export const CVX_MAX_SUPPLY = BigDecimal.fromString("100000000"); // * 1e18; //100 mil max supply