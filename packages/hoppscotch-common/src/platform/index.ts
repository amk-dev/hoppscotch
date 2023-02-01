import { AuthPlatformDef } from "./auth"
import { UIPlatformDef } from "./ui"
import { EnvironmentsPlatformDef } from "./environments"
import { HistoryPlatformDef } from "./history"

export type PlatformDef = {
  ui?: UIPlatformDef
  auth: AuthPlatformDef
  environments: EnvironmentsPlatformDef
  history: HistoryPlatformDef
}

export let platform: PlatformDef

export function setPlatformDef(def: PlatformDef) {
  platform = def
}
