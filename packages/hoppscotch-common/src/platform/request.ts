import { HoppRESTRequest } from "@hoppscotch/data"
import { Subscription } from "rxjs"

export type RequestPlatformDef = {
  loadRequestFromSync: () => Promise<HoppRESTRequest | null>
  startRequestSync: () => Subscription
}
