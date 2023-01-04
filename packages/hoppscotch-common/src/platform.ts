import { CommonAuthModuleDefinition } from "./helpers/fb/auth"

export type PlatformConfig = {
  auth: CommonAuthModuleDefinition
}

export let platformConfig: PlatformConfig

export function getPlatformConfig() {
  console.log(platformConfig)
  return platformConfig
}

export function setPlatformConfig(newPlatformConfig: PlatformConfig) {
  platformConfig = newPlatformConfig
}
