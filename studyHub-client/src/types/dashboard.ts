export interface UserStats {
  totalDocuments: number
  totalStorageUsed: {
    bytes: number
    megaBytes: number
    gigaBytes: number
  }
  storageLimit: {
    bytes: number
    megaBytes: number
    gigaBytes: number
  }
  storageUsedPercent: number
  isPro: boolean
}
