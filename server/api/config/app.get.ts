import { defineEventHandler } from 'h3'
import { appStorage, frpPackageStorage } from '~~/app/stores/storages'
import { checkFrpInstalled } from '~~/server/utils/frp-checker'

export default defineEventHandler(() => {
  const installStatus = checkFrpInstalled(frpPackageStorage.version ?? undefined)

  return {
    theme: appStorage.theme,
    frpMode: appStorage.frpMode,
    githubTokenConfigured: Boolean(appStorage.githubToken),
    frp: {
      version: frpPackageStorage.version,
      releaseName: frpPackageStorage.releaseName,
      updatedAt: frpPackageStorage.updatedAt,
      downloadUrl: frpPackageStorage.downloadUrl,
      status: frpPackageStorage.status,
      installed: installStatus.installed,
      binaryExists: installStatus.binaryExists,
      configExists: installStatus.configExists
    }
  }
})
