// Taken and adapted from the Curve subgraph
// https://github.com/curvefi/curve-subgraph/blob/main/src/mappings/dao/gauge-controller.ts

import { getIntervalFromTimestamp, WEEK } from 'utils/time'
import { Emission, Gauge, GaugeTotalWeight, GaugeType, GaugeWeight } from '../generated/schema'
import {
  AddType,
  GaugeController,
  NewGauge,
  NewGaugeWeight,
  NewTypeWeight,
  VoteForGauge,
} from '../generated/GaugeController/GaugeController'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ONE, BIG_INT_ONE, CRV_ADDRESS } from '../../../packages/constants'
import { LiquidityGauge } from '../generated/GaugeController/LiquidityGauge'
import { registerGaugeType } from './services/gauges'
import { CRVToken } from '../generated/GaugeController/CRVToken'
import { BigDecimal } from '@graphprotocol/graph-ts'

export function handleAddType(event: AddType): void {
  const gaugeController = GaugeController.bind(event.address)

  const nextWeek = getIntervalFromTimestamp(event.block.timestamp.plus(WEEK), WEEK)

  // Add gauge type
  const gaugeType = registerGaugeType(event.params.type_id.toString(), event.params.name)
  gaugeType.weight = gaugeController.points_type_weight(event.params.type_id, nextWeek).toBigDecimal()
  gaugeType.save()

  // Save total weight
  const totalWeight = new GaugeTotalWeight(nextWeek.toString())
  totalWeight.timestamp = nextWeek
  totalWeight.block = event.block.number
  totalWeight.weight = gaugeController.points_total(nextWeek).toBigDecimal().div(BIG_DECIMAL_1E18)
  totalWeight.save()
}

export function handleNewGauge(event: NewGauge): void {
  const gaugeController = GaugeController.bind(event.address)

  const nextWeek = getIntervalFromTimestamp(event.block.timestamp.plus(WEEK), WEEK)

  // Get or register gauge type
  let gaugeType = GaugeType.load(event.params.gauge_type.toString())

  if (!gaugeType) {
    gaugeType = registerGaugeType(
      event.params.gauge_type.toString(),
      gaugeController.gauge_type_names(event.params.gauge_type)
    )
  }

  gaugeType.gaugeCount = gaugeType.gaugeCount.plus(BIG_INT_ONE)
  gaugeType.save()

  // Add gauge instance
  const gauge = new Gauge(event.params.addr.toHexString())
  gauge.address = event.params.addr
  gauge.type = gaugeType.id

  gauge.created = event.block.timestamp
  gauge.createdAtBlock = event.block.number
  gauge.createdAtTransaction = event.transaction.hash

  // Associate gauge to an LP token
  const lpToken = LiquidityGauge.bind(event.params.addr).try_lp_token()

  if (!lpToken.reverted) {
    gauge.lpToken = lpToken.value
  }

  gauge.save()

  // Save gauge weight
  const gaugeWeight = new GaugeWeight(gauge.id + '-' + nextWeek.toString())
  gaugeWeight.gauge = gauge.id
  gaugeWeight.timestamp = nextWeek
  gaugeWeight.block = event.block.number
  gaugeWeight.weight = event.params.weight.toBigDecimal()
  gaugeWeight.save()

  // Save total weight
  const totalWeight = new GaugeTotalWeight(nextWeek.toString())
  totalWeight.timestamp = nextWeek
  totalWeight.block = event.block.number
  totalWeight.weight = gaugeController.points_total(nextWeek).toBigDecimal().div(BIG_DECIMAL_1E18)
  totalWeight.save()

  const emission = new Emission(gauge.id + '-' + nextWeek.toString())
  emission.timestamp = nextWeek
  emission.block = event.block.number
  const crvTokenContract = CRVToken.bind(CRV_ADDRESS)
  const crvTokenMinted = crvTokenContract.mintable_in_timeframe(nextWeek, nextWeek.plus(WEEK))
  const gaugeTypeWeight = gaugeType ? gaugeType.weight.div(BIG_DECIMAL_1E18) : BIG_DECIMAL_ONE
  const fullWeight = gaugeWeight.weight.times(gaugeTypeWeight).div(totalWeight.weight)
  const weeklyEmissions = crvTokenMinted.toBigDecimal().times(fullWeight)
  emission.crvAmount = weeklyEmissions.div(BIG_DECIMAL_1E18)
  emission.gauge = gauge.id
  emission.save()
}

export function handleNewGaugeWeight(event: NewGaugeWeight): void {
  const gauge = Gauge.load(event.params.gauge_address.toHexString())

  if (gauge != null) {
    const gaugeController = GaugeController.bind(event.address)

    const nextWeek = getIntervalFromTimestamp(event.block.timestamp.plus(WEEK), WEEK)

    // Save gauge weight
    const gaugeWeight = new GaugeWeight(gauge.id + '-' + nextWeek.toString())
    gaugeWeight.gauge = gauge.id
    gaugeWeight.timestamp = nextWeek
    gaugeWeight.block = event.block.number
    gaugeWeight.weight = event.params.weight.toBigDecimal()
    gaugeWeight.save()

    // Save total weight
    const totalWeight = new GaugeTotalWeight(nextWeek.toString())
    totalWeight.timestamp = nextWeek
    totalWeight.block = event.block.number
    totalWeight.weight = gaugeController.points_total(nextWeek).toBigDecimal().div(BIG_DECIMAL_1E18)
    totalWeight.save()

    const emission = new Emission(gauge.id + '-' + nextWeek.toString())
    emission.timestamp = nextWeek
    emission.block = event.block.number
    const crvTokenContract = CRVToken.bind(CRV_ADDRESS)
    const crvTokenMinted = crvTokenContract.mintable_in_timeframe(nextWeek, nextWeek.plus(WEEK))
    const gaugeType = GaugeType.load(gauge.type)
    const gaugeTypeWeight = gaugeType ? gaugeType.weight.div(BIG_DECIMAL_1E18) : BIG_DECIMAL_ONE
    const fullWeight = gaugeWeight.weight.times(gaugeTypeWeight).div(totalWeight.weight)
    const weeklyEmissions = crvTokenMinted.toBigDecimal().times(fullWeight)
    emission.crvAmount = weeklyEmissions.div(BIG_DECIMAL_1E18)
    emission.gauge = gauge.id
    emission.save()
  }
}

export function handleNewTypeWeight(event: NewTypeWeight): void {
  const gaugeType = GaugeType.load(event.params.type_id.toString())

  if (gaugeType != null) {
    gaugeType.weight = event.params.weight.toBigDecimal()
    gaugeType.save()

    const totalWeight = new GaugeTotalWeight(event.params.time.toString())
    totalWeight.timestamp = event.params.time
    totalWeight.block = event.block.number
    totalWeight.weight = event.params.total_weight.toBigDecimal().div(BIG_DECIMAL_1E18)
    totalWeight.save()
  }
}

export function handleVoteForGauge(event: VoteForGauge): void {
  const gauge = Gauge.load(event.params.gauge_addr.toHexString())

  if (gauge != null) {
    const gaugeController = GaugeController.bind(event.address)

    const nextWeek = getIntervalFromTimestamp(event.block.timestamp.plus(WEEK), WEEK)

    // Save gauge weight
    const gaugeWeight = new GaugeWeight(gauge.id + '-' + nextWeek.toString())
    gaugeWeight.gauge = gauge.id
    gaugeWeight.timestamp = nextWeek
    gaugeWeight.block = event.block.number
    gaugeWeight.weight = gaugeController.points_weight(event.params.gauge_addr, nextWeek).value0.toBigDecimal()
    gaugeWeight.save()

    // Save total weight
    const totalWeight = new GaugeTotalWeight(nextWeek.toString())
    totalWeight.timestamp = nextWeek
    totalWeight.block = event.block.number
    totalWeight.weight = gaugeController.points_total(nextWeek).toBigDecimal().div(BIG_DECIMAL_1E18)
    totalWeight.save()

    const emission = new Emission(gauge.id + '-' + nextWeek.toString())
    emission.timestamp = nextWeek
    emission.block = event.block.number
    const crvTokenContract = CRVToken.bind(CRV_ADDRESS)
    const crvTokenMinted = crvTokenContract.mintable_in_timeframe(nextWeek, nextWeek.plus(WEEK))
    const gaugeType = GaugeType.load(gauge.type)
    const gaugeTypeWeight = gaugeType ? gaugeType.weight.div(BIG_DECIMAL_1E18) : BIG_DECIMAL_ONE
    const fullWeight = gaugeWeight.weight.times(gaugeTypeWeight).div(totalWeight.weight)
    const weeklyEmissions = crvTokenMinted.toBigDecimal().times(fullWeight)
    emission.crvAmount = weeklyEmissions.div(BIG_DECIMAL_1E18)
    emission.gauge = gauge.id
    emission.save()
  }
}
