import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export const CONVEX_PLATFORM_ID = 'Convex'
export const CURVE_PLATFORM_ID = 'Curve'

export const BIG_DECIMAL_1E6 = BigDecimal.fromString('1e6')
export const BIG_DECIMAL_1E8 = BigDecimal.fromString('1e8')
export const BIG_DECIMAL_1E18 = BigDecimal.fromString('1e18')
export const BIG_DECIMAL_1E10 = BigDecimal.fromString('1e10')
export const BIG_DECIMAL_ZERO = BigDecimal.fromString('0')
export const BIG_DECIMAL_ONE = BigDecimal.fromString('1')
export const BIG_DECIMAL_TWO = BigDecimal.fromString('2')

export const BIG_INT_MINUS_ONE = BigInt.fromI32(-1)
export const BIG_INT_ZERO = BigInt.fromString('0')
export const BIG_INT_ONE = BigInt.fromString('1')
export const BIG_INT_1E18 = BigInt.fromString('1000000000000000000')

export const SECONDS_PER_YEAR = BigDecimal.fromString('31536000')
export const RKP3R_TOKEN = '0xEdB67Ee1B171c4eC66E6c10EC43EDBbA20FaE8e9'
export const RKP3R_ADDRESS = Address.fromString(RKP3R_TOKEN)
export const CVX_TOKEN = '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B'
export const CVX_ADDRESS = Address.fromString(CVX_TOKEN)
export const CRV_TOKEN = '0xD533a949740bb3306d119CC777fa900bA034cd52'
export const CRV_ADDRESS = Address.fromString(CRV_TOKEN)
export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000')
export const WETH_ADDRESS = Address.fromString('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
export const USDT_ADDRESS = Address.fromString('0xdac17f958d2ee523a2206206994597c13d831ec7')
export const WBTC_ADDRESS = Address.fromString('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599')
export const LINK_ADDRESS = Address.fromString('0x514910771af9ca656af840dff83e8264ecf986ca')
export const LINK_LP_TOKEN_ADDRESS = Address.fromString('0xcee60cFa923170e4f8204AE08B4fA6A3F5656F3a')
export const CRVUSD_ADDRESS = Address.fromString('0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E')

// for Forex and EUR pool, map lp token to Chainlink price feed
export const EURT_LP_TOKEN = '0xfd5db7463a3ab53fd211b4af195c5bccc1a03890'
export const EURS_LP_TOKEN = '0x194ebd173f6cdace046c53eacce9b953f28411d1'
export const EURN_LP_TOKEN = '0x3fb78e61784c9c637d560ede23ad57ca1294c14a'

// Fixed forex proper
export const EUR_LP_TOKEN = '0x19b080fe1ffa0553469d20ca36219f17fcf03859'
export const JPY_LP_TOKEN = '0x8818a9bb44fbf33502be7c15c500d0c783b73067'
export const KRW_LP_TOKEN = '0x8461a004b50d321cb22b7d034969ce6803911899'
export const GBP_LP_TOKEN = '0xd6ac1cb9019137a896343da59dde6d097f710538'
export const AUD_LP_TOKEN = '0x3f1b0278a9ee595635b61817630cc19de792f506'
export const CHF_LP_TOKEN = '0x9c2c8910f113181783c249d8f6aa41b51cde0f0c'

// Mixed USDT-forex (USDT-Forex) pools
export const EURS_USDC_LP_TOKEN = '0x3d229e1b4faab62f621ef2f6a610961f7bd7b23b'
export const EURT_USDT_LP_TOKEN = '0x3b6831c0077a1e44ed0a21841c3bc4dc11bce833'

export const CVX_CRV_LP_TOKEN = '0x9d0464996170c6b9e75eed71c68b99ddedf279e8'

export const FXS_TOKEN = '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0'
export const CVXFXS_TOKEN = '0xfeef77d3f69374f66429c91d732a244f074bdf74'
// export const FACTORY_POOLS = [EUR_LP_TOKEN, JPY_LP_TOKEN, KRW_LP_TOKEN, GBP_LP_TOKEN, AUD_LP_TOKEN, CHF_LP_TOKEN, CVX_CRV_LP_TOKEN, EURT_LP_TOKEN, MIM_LP_TOKEN]

// https://etherscan.io/address/0x3abce8f1db258fbc64827b0926e14a0f90525cf7#code

export const FOREX_ORACLES = new Map<string, Address>()
FOREX_ORACLES.set(EURT_USDT_LP_TOKEN, Address.fromString('0xb49f677943BC038e9857d61E7d053CaA2C1734C1'))
FOREX_ORACLES.set(EURS_USDC_LP_TOKEN, Address.fromString('0xb49f677943BC038e9857d61E7d053CaA2C1734C1'))
FOREX_ORACLES.set(EURT_LP_TOKEN, Address.fromString('0xb49f677943BC038e9857d61E7d053CaA2C1734C1'))
FOREX_ORACLES.set(EURS_LP_TOKEN, Address.fromString('0xb49f677943BC038e9857d61E7d053CaA2C1734C1'))
FOREX_ORACLES.set(EURN_LP_TOKEN, Address.fromString('0xb49f677943BC038e9857d61E7d053CaA2C1734C1'))
FOREX_ORACLES.set(EUR_LP_TOKEN, Address.fromString('0xb49f677943BC038e9857d61E7d053CaA2C1734C1'))
FOREX_ORACLES.set(KRW_LP_TOKEN, Address.fromString('0x01435677FB11763550905594A16B645847C1d0F3'))
FOREX_ORACLES.set(JPY_LP_TOKEN, Address.fromString('0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3'))
FOREX_ORACLES.set(GBP_LP_TOKEN, Address.fromString('0x5c0Ab2d9b5a7ed9f470386e82BB36A3613cDd4b5'))
FOREX_ORACLES.set(AUD_LP_TOKEN, Address.fromString('0x77F9710E7d0A19669A13c055F62cd80d313dF022'))
FOREX_ORACLES.set(CHF_LP_TOKEN, Address.fromString('0x449d117117838fFA61263B61dA6301AA2a88B13A'))

// handle tokens that only trade on Curve
// maps to other token on curve pool that can be priced elswhere
// and token indice to know whether to invert price oracle or not
class OracleInfo {
  pricingToken: Address
  tokenIndex: i32
  constructor(pricingToken: Address, tokenIndex: i32) {
    this.pricingToken = pricingToken
    this.tokenIndex = tokenIndex
  }
}
export const T_TOKEN = '0xcdf7028ceab81fa0c6971208e83fa7872994bee5'
export const CURVE_ONLY_TOKENS = new Map<string, OracleInfo>()
CURVE_ONLY_TOKENS.set(CVXFXS_TOKEN, new OracleInfo(Address.fromString(FXS_TOKEN), 1))
CURVE_ONLY_TOKENS.set(T_TOKEN, new OracleInfo(WETH_ADDRESS, 1))

export const SUSHISWAP_WETH_USDT_PAIR_ADDRESS = Address.fromString('0x06da0fd433c1a5d7a4faa01111c044910a184553')
export const SUSHI_FACTORY_ADDRESS = Address.fromString('0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac')
export const UNI_FACTORY_ADDRESS = Address.fromString('0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f')
export const UNI_V3_FACTORY_ADDRESS = Address.fromString('0x1F98431c8aD98523631AE4a59f267346ea31F984')
export const UNI_V3_QUOTER = Address.fromString('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6')

export const BOOSTER_ADDRESS = Address.fromString('0xf403c135812408bfbe8713b5a23a04b3d48aae31')
export const CURVE_REGISTRY = Address.fromString('0x90e00ace148ca3b23ac1bc8c240c2a7dd9c2d7f5')
export const CURVE_REGISTRY_V2 = Address.fromString('0x4AacF35761d06Aa7142B9326612A42A2b9170E33')
export const CURVE_FACTORY_V1 = Address.fromString('0x0959158b6040d32d04c301a72cbfd6b39e21c9ae')
export const CURVE_FACTORY_V1_2 = Address.fromString('0xb9fc157394af804a3578134a6585c0dc9cc990d4')
export const CURVE_FACTORY_V2 = Address.fromString('0xf18056bbd320e96a48e3fbf8bc061322531aac99')
export const CURVE_TRICRYPTO_FACTORY = Address.fromString('0x0c0e5f2ff0ff18a3be9b835635039256dc4b4963')
export const ONE_WAY_LENDING_FACTORY = Address.fromString('0xeA6876DDE9e3467564acBeE1Ed5bac88783205E0')

export const TRIPOOL_ADDRESS = Address.fromString('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7')
export const TRICRYPTO_LP_ADDRESS = Address.fromString('0xca3d75ac011bf5ad07a98d02f18225f9bd9a6bdf')
export const TRICRYPTO2_LP_ADDRESS = Address.fromString('0xc4ad29ba4b3c580e6d59105fff484999997675ff')
export const EURS_USDC_LP_ADDRESS = Address.fromString(EURS_USDC_LP_TOKEN)
export const EURT_3CRV_LP_ADDRESS = Address.fromString(EURT_USDT_LP_TOKEN)
export const TRICRYPTO_LP_ADDRESSES = [TRICRYPTO_LP_ADDRESS, TRICRYPTO2_LP_ADDRESS]
export const TRICRYPTO2_POOL_ADDRESS = Address.fromString('0xd51a44d3fae010294c616388b506acda1bfaae46')
export const TRICRYPTO_ARBITRUM_POOL_ADDRESS = Address.fromString('0x960ea3e3c7fb317332d990873d354e18d7645590')
export const TRICRYPTO_ARBITRUM_LP_TOKEN_ADDRESS = Address.fromString('0x8e0b8c8bb9db49a46697f3a5bb8a308e744821d2')

// Pools that are v2 but were originally added to v1 registry
export const EURT_USD_POOL = Address.fromString('0x9838eCcC42659FA8AA7daF2aD134b53984c9427b')
export const EURS_USDC_POOL = Address.fromString('0x98a7F18d4E56Cfe84E3D081B40001B3d5bD3eB8B')
export const TRICRYPTO_V1_POOL = Address.fromString('0x80466c64868E1ab14a1Ddf27A676C3fcBE638Fe5')
export const EARLY_V2_POOLS = [TRICRYPTO2_POOL_ADDRESS, EURS_USDC_POOL, EURT_USD_POOL]

export const DENOMINATOR = BigInt.fromI32(10000)
export const CVX_REWARDS = '0xcf50b810e57ac33b91dcf525c6ddd9881b139332'
export const CVX_REWARDS_ADDRESS = Address.fromString(CVX_REWARDS)
export const CVXCRV_REWARDS = '0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e'
export const CVXCRV_REWARDS_ADDRESS = Address.fromString(CVXCRV_REWARDS)
export const LOCK_FEES_ADDRESS = Address.fromString('0x7091dbb7fcbA54569eF1387Ac89Eb2a5C9F6d2EA')
export const THREEPOOL_ADDRESS = Address.fromString('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7')

export const VOTIUM_BRIBE_CONTRACT = '0x19bbc3463dd8d07f55438014b021fb457ebd4595'
export const VOTIUM_BRIBE_CONTRACT_ADDRESS = Address.fromString(VOTIUM_BRIBE_CONTRACT)

export const THREE_CRV_TOKEN = '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'
export const THREE_CRV_ADDRESS = Address.fromString(THREE_CRV_TOKEN)
export const EURT_TOKEN = '0xC581b735A1688071A1746c968e0798D642EDE491'
export const EURT_ADDRESS = Address.fromString(EURT_TOKEN)
export const EURS_TOKEN = '0xdB25f211AB05b1c97D595516F45794528a807ad8'
export const EURS_ADDRESS = Address.fromString(EURS_TOKEN)

export const STAKING_CONTRACTS = new Map<string, string>()
STAKING_CONTRACTS.set('0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e', 'cvxCrv')
STAKING_CONTRACTS.set('0xcf50b810e57ac33b91dcf525c6ddd9881b139332', 'cvx')

export const STAKING_TOKENS = new Map<string, string>()
STAKING_TOKENS.set('0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e', CRV_TOKEN)
STAKING_TOKENS.set('0xcf50b810e57ac33b91dcf525c6ddd9881b139332', CVX_TOKEN)

export const FACTORY_V10 = 'FACTORY_V10'
export const FACTORY_V12 = 'FACTORY_V12'
export const FACTORY_V20 = 'FACTORY_V20'
export const REGISTRY_V1 = 'REGISTRY_V1'
export const REGISTRY_V2 = 'REGISTRY_V2'
export const LENDING = 'LENDING'

// The arrays are to map the asset types for the various curve pools
// It's necessary because pools are often instantiated with the wrong asset type
// so the values from the registry's get_pool_asset_type method can't be relied
// upon and can change.
// Also Curve only ran a batch fix on June 19th, after most of the tracked pools
// were instantiated. Map will likely need manual update in the future and
// therefore resyncs.
// cf: https://etherscan.io/tx/0xf8e8d67ec16657ecc707614f733979d105e0b814aa698154c153ba9b44bf779b

export const ASSET_TYPES = new Map<string, i32>()
ASSET_TYPES.set('0x06364f10b501e868329afbc005b3492902d6c763', 0)
ASSET_TYPES.set('0x071c661b4deefb59e2a3ddb20db036821eee8f4b', 2)
ASSET_TYPES.set('0x0ce6a5ff5217e38315f87032cf90686c96627caa', 3)
ASSET_TYPES.set('0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1', 0)
ASSET_TYPES.set('0x2dded6da1bf5dbdf597c45fcfaa3194e53ecfeaf', 0)
ASSET_TYPES.set('0x3e01dd8a5e1fb3481f0f589056b428fc308af0fb', 0)
ASSET_TYPES.set('0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604', 0)
ASSET_TYPES.set('0x42d7025938bec20b69cbae5a77421082407f053a', 0)
ASSET_TYPES.set('0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c', 0)
ASSET_TYPES.set('0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51', 0)
ASSET_TYPES.set('0x4807862aa8b2bf68830e4c8dc86d0e9a998e085a', 0)
ASSET_TYPES.set('0x4ca9b3063ec5866a4b82e437059d2c43d1be596f', 2)
ASSET_TYPES.set('0x4f062658eaaf2c1ccf8c8e36d6824cdf41167956', 0)
ASSET_TYPES.set('0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c', 0)
ASSET_TYPES.set('0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27', 0)
ASSET_TYPES.set('0x7f55dde206dbad629c080068923b36fe9d6bdbef', 2)
ASSET_TYPES.set('0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714', 2)
ASSET_TYPES.set('0x8038c01a0390a8c547446a0b2c18fc9aefecc10c', 0)
ASSET_TYPES.set('0x80466c64868e1ab14a1ddf27a676c3fcbe638fe5', 4)
ASSET_TYPES.set('0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6', 0)
ASSET_TYPES.set('0x890f4e345b1daed0367a877a1612f86a1f86985f', 0)
ASSET_TYPES.set('0x93054188d876f558f4a66b2ef1d97d16edf0895b', 2)
ASSET_TYPES.set('0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56', 0)
ASSET_TYPES.set('0xa5407eae9ba41422680e2e00537571bcc53efbfd', 0)
ASSET_TYPES.set('0xa96a65c051bf88b4095ee1f2451c2a9d43f53ae2', 1)
ASSET_TYPES.set('0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', 0)
ASSET_TYPES.set('0xc18cc39da8b11da8c3541c598ee022258f9744da', 0)
ASSET_TYPES.set('0xc25099792e9349c7dd09759744ea681c7de2cb66', 2)
ASSET_TYPES.set('0xc5424b857f758e906013f3555dad202e4bdb4567', 1)
ASSET_TYPES.set('0xd51a44d3fae010294c616388b506acda1bfaae46', 0)
ASSET_TYPES.set('0xd632f22692fac7611d2aa1c0d552930d43caed3b', 0)
ASSET_TYPES.set('0xd81da8d904b52208541bade1bd6595d8a251f8dd', 2)
ASSET_TYPES.set('0xdc24316b9ae028f1497c275eb9192a3ea0f67022', 1)
ASSET_TYPES.set('0xdebf20617708857ebe4f679508e7b7863a8a8eee', 0)
ASSET_TYPES.set('0xeb16ae0052ed37f479f7fe63849198df1765a733', 0)
ASSET_TYPES.set('0xecd5e75afb02efa118af914515d6521aabd189f1', 0)
ASSET_TYPES.set('0xed279fdd11ca84beef15af5d39bb4d4bee23f0ca', 0)
ASSET_TYPES.set('0xf178c0b5bb7e7abf4e12a4838c7b7c5ba2c623c0', 3)
ASSET_TYPES.set('0xf9440930043eb3997fc70e1339dbb11f341de7a8', 1)
ASSET_TYPES.set('0xfd5db7463a3ab53fd211b4af195c5bccc1a03890', 3)
ASSET_TYPES.set('0x9d0464996170c6b9e75eed71c68b99ddedf279e8', 3)
ASSET_TYPES.set('0xc4c319e2d4d66cca4464c0c2b32c9bd23ebe784e', 1)
ASSET_TYPES.set('0xfbdca68601f835b27790d98bbb8ec7f05fdeaa9b', 2)

export const V2_SWAPS = new Map<string, string>()
V2_SWAPS.set('0x3b6831c0077a1e44ed0a21841c3bc4dc11bce833', '0x9838eCcC42659FA8AA7daF2aD134b53984c9427b')
V2_SWAPS.set('0x3d229e1b4faab62f621ef2f6a610961f7bd7b23b', '0x98a7F18d4E56Cfe84E3D081B40001B3d5bD3eB8B')

export const CRV_FRAX = '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'
export const CRV_FRAX_ADDRESS = Address.fromString(CRV_FRAX)
export const FRAXBP_ADDRESS = Address.fromString('0xdcef968d416a41cdac0ed8702fac8128a64241a2')

// Fee addresses for Frax Convex

export const FEE_REGISTRY = '0xC9aCB83ADa68413a6Aa57007BC720EE2E2b3C46D'
export const FEE_REGISTRY_ADDRESS = Address.fromString(FEE_REGISTRY)

// Lending pools using cTokens have their balance labelled in cTokens
// which must be converted to underlying using each token's exchange
// rate and decimals. We keep this list to handle these edge cases
export const CTOKENS = [
  '0x8e595470ed749b85c6f7669de83eae304c2ec68f',
  '0x76eb2fe28b36b3ee97f3adae0c69606eedb2a37c',
  '0x48759f220ed983db51fa7a8c0d2aab8f3ce4166a',
  '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  '0x39aa39c021dfbae8fac545936693ac917d5e7563',
]

export const CTOKEN_POOLS = [
  '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56',
  '0x8925d9d9b4569d737a48499def3f67baa5a144b9',
  '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27',
  '0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c',
  '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51',
  '0x2dded6da1bf5dbdf597c45fcfaa3194e53ecfeaf',
]

export const YTOKEN_POOLS = ['0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51', '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27']

export const YTOKENS = [
  '0x16de59092dae5ccf4a1e6439d611fd0653f0bd01',
  '0xd6ad7a6750a7593e092a9b218d66c0a814a3436e',
  '0x83f798e925bcd4017eb265844fddabb448f1707d',
  '0x73a052500105205d34daf004eab301916da8190f',
  '0xc2cb1040220768554cf699b0d863a3cd4324ce32',
  '0x26ea744e5b887e5205727f55dfbe8685e3b21951',
  '0xe6354ed5bc4b393a5aad09f21c46e101e692d447',
  '0x04bc0ab673d88ae9dbc9da2380cb6b79c4bca9ae',
]

export const TRICRYPTONG_POOL = Address.fromString('0x7f86bf177dd4f3494b841a37e810a34dd56c829b')
export const PRISMA_ETH_POOL = Address.fromString('0x322135dd9cbae8afa84727d9ae1434b5b3eba44b')
export const CVX_ETH_POOL = Address.fromString('0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4')
export const PRISMA_TOKEN_ADDRESS = Address.fromString('0xdA47862a83dac0c112BA89c6abC2159b95afd71C')
export const CVX_PRISMA_TOKEN_ADDRESS = Address.fromString('0x34635280737b5BFe6c7DC2FC3065D60d66e78185')
export const CVX_PRISMA_STAKING_ADDRESS = Address.fromString('0x0c73f1cFd5C9dFc150C8707Aa47Acbd14F0BE108')
export const YPRISMA_TOKEN_ADDRESS = Address.fromString('0xe3668873D944E4A949DA05fc8bDE419eFF543882')
export const NEW_YPRISMA_STAKING_ADDRESS = Address.fromString('0xE3EE395C9067dD15C492Ca950B101a7d6c85b5Fc')
export const YPRISMA_STAKING_ADDRESS = Address.fromString('0x774a55C3Eeb79929fD445Ae97191228Ab39c4d0f')
export const CVXPRISMA_PRISMA_CURVE_POOL = Address.fromString('0x3b21c2868b6028cfb38ff86127ef22e68d16d53b')
export const YPRISMA_PRISMA_CURVE_POOL = Address.fromString('0x69833361991ed76f9e8dbbcdf9ea1520febfb4a7')
export const WSTETH_TOKEN_ADDRESS = Address.fromString('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0')
export const MKUSD_TOKEN_ADDRESS = Address.fromString('0x4591DBfF62656E7859Afe5e45f6f47D3669fBB28')
