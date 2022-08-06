import { ASSET_TYPES } from 'const'

export function inferAssetType(curvePool: string, poolName: string): i32 {
  if (ASSET_TYPES.has(curvePool)) {
    return ASSET_TYPES.get(curvePool)
  }
  const description = poolName.toUpperCase()
  const stables = ['USD', 'DAI', 'MIM', 'TETHER']
  for (let i = 0; i < stables.length; i++) {
    if (description.indexOf(stables[i]) >= 0) {
      return 0
    }
  }

  if (description.indexOf('BTC') >= 0) {
    return 2
  } else if (description.indexOf('ETH') >= 0) {
    return 1
  } else {
    return 3
  }
}
