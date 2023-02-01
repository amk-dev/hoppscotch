import { AuthPlatformDef } from "./auth"
import { UIPlatformDef } from "./ui"
import { EnvironmentsPlatformDef } from "./environments"
import { HistoryPlatformDef } from "./history"
import { SettingsPlatfromDef } from "./settings"
import { RequestPlatformDef } from "./request"

export type PlatformDef = {
  ui?: UIPlatformDef
  auth: AuthPlatformDef
  environments: EnvironmentsPlatformDef
  history: HistoryPlatformDef
  settings: SettingsPlatfromDef
  request: RequestPlatformDef
}

export let platform: PlatformDef

export function setPlatformDef(def: PlatformDef) {
  platform = def
}
