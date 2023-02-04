import { Address } from '@graphprotocol/graph-ts'
import { User } from '../../generated/schema'

export function getUser(address: Address): User {
  let user = User.load(address.toHexString())
  if (!user) {
    user = new User(address.toHexString())
    user.address = address
    user.save()
  }
  return user
}
