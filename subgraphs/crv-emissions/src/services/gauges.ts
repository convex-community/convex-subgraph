import { BIG_INT_ZERO } from '../../../../packages/constants'
import { GaugeType } from '../../generated/schema'


export function registerGaugeType(id: string, name: string): GaugeType {
  let gaugeType = new GaugeType(id)
  gaugeType.name = name
  gaugeType.gaugeCount = BIG_INT_ZERO
  return gaugeType
}