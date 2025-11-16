import { BaseStorage } from './base'
import { useStorage } from './use-storage'

export type FrpPackageStatus = 'idle' | 'updating'

interface FrpPackageSchema {
  version: string | null
  releaseName: string | null
  updatedAt: string | null
  downloadUrl: string | null
  status: FrpPackageStatus
}

class FrpPackageStorage extends BaseStorage<FrpPackageSchema> {
  version: string | null = null
  releaseName: string | null = null
  updatedAt: string | null = null
  downloadUrl: string | null = null
  status: FrpPackageStatus = 'idle'
}

export const frpPackageStorage = useStorage(FrpPackageStorage)
