import type { LocationOption } from './types'

export default function LocationSelector({ locations, location, onChange, className = '' }: { locations: LocationOption[]; location: LocationOption; onChange: (location: LocationOption) => void; className?: string }) {
  const states = [...new Set(locations.map(item => item.state))]
  const districts = [...new Set(locations.filter(item => item.state === location.state).map(item => item.district))]
  const blocks = locations.filter(item => item.state === location.state && item.district === location.district)
  const selectState = (state: string) => onChange(locations.find(item => item.state === state) ?? location)
  const selectDistrict = (district: string) => onChange(locations.find(item => item.state === location.state && item.district === district) ?? location)
  const selectBlock = (block: string) => onChange(blocks.find(item => item.block === block) ?? location)
  return <div className={`location-selector ${className}`}>
    <label>State<select aria-label="State" value={location.state} onChange={event => selectState(event.target.value)}>{states.map(state => <option key={state}>{state}</option>)}</select></label>
    <label>District<select aria-label="District" value={location.district} onChange={event => selectDistrict(event.target.value)}>{districts.map(district => <option key={district}>{district}</option>)}</select></label>
    <label>Block<select aria-label="Block" value={location.block} onChange={event => selectBlock(event.target.value)}>{blocks.map(item => <option key={`${item.district}-${item.block}`} value={item.block}>{item.block}</option>)}</select></label>
  </div>
}
