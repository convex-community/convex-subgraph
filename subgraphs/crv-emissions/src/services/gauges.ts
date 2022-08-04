import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from '../../../../packages/constants'
import { GaugeType } from '../../generated/schema'

export function registerGaugeType(id: string, name: string): GaugeType {
  const gaugeType = new GaugeType(id)
  gaugeType.name = name
  gaugeType.gaugeCount = BIG_INT_ZERO
  gaugeType.weight = BIG_DECIMAL_ZERO
  return gaugeType
}
