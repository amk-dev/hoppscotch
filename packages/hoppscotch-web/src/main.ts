import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./firebase/auth"
import { def as envDef } from "./environments"
import { def as historyDef } from "./history"
import { def as settingsDef } from "./settings"

createHoppApp("#app", {
  auth: authDef,
  environments: envDef,
  history: historyDef,
  settings: settingsDef,
})
