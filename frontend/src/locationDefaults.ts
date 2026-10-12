import type { LocationOption } from './types'

export function defaultLocation(locations: LocationOption[]) {
  const bhor = locations.find(location =>
    location.state === 'Maharashtra' &&
    location.district === 'Pune' &&
    location.block.trim().toLocaleLowerCase() === 'bhor' &&
    location.available !== false
  )
  return bhor ?? locations.find(location => location.available !== false) ?? locations[0]
}
