import type { BlockData, BlockProcessingStatus, LocationOption } from './types'
const apiBase=(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/,'')
const completedBlocks = new Map<string, { expiresAt: number; data: BlockData }>()
const pendingBlocks = new Map<string, Promise<BlockData>>()
let locationsRequest: Promise<LocationOption[]> | null = null

function apiPath(path:string){ return `${apiBase}${path}` }
const blockKey = (state: string, district: string, block: string) => JSON.stringify([state, district, block])
const wait=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms))

export async function getLocations(): Promise<LocationOption[]> {
  if (!locationsRequest) locationsRequest = fetch(apiPath('/api/locations'))
    .then(async r => { if (!r.ok) throw new Error('Could not load available locations'); return r.json() })
    .catch(error => { locationsRequest = null; throw error })
  return locationsRequest
}
export async function getGPLocation(id:string):Promise<LocationOption>{
  const r=await fetch(apiPath(`/api/gp-location?id=${encodeURIComponent(id)}`)); if(!r.ok) throw new Error('No GP forecast found for this id'); return r.json()
}
export async function getBlock(state:string,district:string,block:string,onProcessingStatus?:(status:BlockProcessingStatus)=>void):Promise<BlockData>{
  const key = blockKey(state, district, block)
  const cached = completedBlocks.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.data
  if (cached) completedBlocks.delete(key)
  const inFlight = pendingBlocks.get(key)
  if (inFlight) return inFlight
  const request = loadBlock(state, district, block, key, onProcessingStatus)
  pendingBlocks.set(key, request)
  try { return await request } finally { pendingBlocks.delete(key) }
}

async function loadBlock(state:string,district:string,block:string,key:string,onProcessingStatus?: (status:BlockProcessingStatus)=>void):Promise<BlockData>{
  const q=new URLSearchParams({state,district,block})
  let response=await fetch(apiPath(`/api/block?${q}`))
  let payload=await response.json()
  if(response.status===202){
    const jobId=payload.jobId
    if(typeof jobId!=='string'||!jobId)throw new Error('The block-processing service did not return a job ID.')
    while(true){
      const statusResponse=await fetch(apiPath(`/api/block-processing-status?jobId=${encodeURIComponent(jobId)}`))
      const statusPayload:BlockProcessingStatus & {error?:string}=await statusResponse.json()
      if(!statusResponse.ok)throw new Error(statusPayload.error||'Could not check block-processing status.')
      onProcessingStatus?.(statusPayload)
      if(statusPayload.status==='failed')throw new Error(statusPayload.error||'Block processing failed. Check the backend logs for details.')
      if(statusPayload.status==='completed')break
      await wait(1500)
    }
    response=await fetch(apiPath(`/api/block?${q}`))
    payload=await response.json()
  }
  if(!response.ok)throw new Error(payload.error||(response.status===404?'The selected block is not in the official location registry.':'Could not load block weather'))
  completedBlocks.set(key, { data: payload, expiresAt: Date.now() + 30_000 })
  return payload
}
