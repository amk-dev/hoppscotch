import { Container, Service } from "dioc"
import {
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"

import { v4 as uuidV4 } from "uuid"

import * as E from "fp-ts/Either"

import { ComputedRef, computed } from "vue"

import { generateKeyBetween } from "fractional-indexing"

const container = new Container()

export type UpdatedHoppRESTRequest = {
  v: string
  name: string
  method: string
  endpoint: string
  params: HoppRESTParam[]
  headers: HoppRESTHeader[]
  preRequestScript: string
  testScript: string
  auth: HoppRESTAuth
  body: HoppRESTReqBody

  // changes from HoppRESTRequest
  order: string
  // id is mandatory now, for representing the backendID we'll use backendID
  id: string
  backendID?: string
  // parentCollectionID is mandatory for requests, since they can't be in the root for now
  parentCollectionID: string
}

export type UpdatedHoppCollection = {
  v: number
  name: string

  // changes from HoppCollection
  // removed folders & requests
  // id is mandatory now, for representing the backendID we'll use backendID
  id: string
  backendID?: string
  parentCollectionID?: string
  order: string
}

class RequestsService extends Service {
  public static ID = "RequestsService"

  public requests: UpdatedHoppRESTRequest[] = []
}

class CollectionService extends Service {
  public static ID = "CollectionsService"

  private collections: UpdatedHoppCollection[] = []
  private requestService = this.bind(RequestsService)

  private ordredCollections = computed(() => {
    return this.collections.sort()
  })

  public collectionTree: ComputedRef<HoppCollection<HoppRESTRequest>[]> =
    computed(() => {
      return makeCollectionTree(this.collections, this.requestService.requests)
    })

  setCollections(collections: UpdatedHoppCollection[]) {
    this.collections = collections
  }

  appendCollections(collections: UpdatedHoppCollection[]) {
    this.collections.push(...collections)
  }

  addCollection(collection: Omit<UpdatedHoppCollection, "id" | "order">) {
    const id = uuidV4()

    let lastCollectionOrder: string | null

    const collectionsLength = this.ordredCollections.value.length

    if (collectionsLength > 0) {
      const lastCollection = this.ordredCollections.value[collectionsLength - 1]

      lastCollectionOrder = lastCollection.order
    } else {
      lastCollectionOrder = null
    }

    this.collections.push({
      id,
      ...collection,
      order: generateKeyBetween(lastCollectionOrder, null),
    })

    return id
  }

  removeCollection(id: string) {
    this.collections = this.collections.filter(
      (collection) => collection.id != id
    )
  }

  editCollection(
    id: string,
    updatedCollectionFields: Partial<UpdatedHoppCollection>
  ) {
    this.collections = this.collections.map((c) =>
      c.id === id ? { ...c, ...updatedCollectionFields } : c
    )
  }

  updateCollectionOrder(collectionID: string, destinationCollectionID: string) {
    const sourceCollection = this.collections.find(
      (collection) => collection.id == collectionID
    )

    let destinationCollection: UpdatedHoppCollection | undefined

    if (!sourceCollection) {
      return E.left("Source collection not found")
    }

    if (destinationCollectionID) {
      destinationCollection = this.collections.find(
        (collection) => collection.id == destinationCollectionID
      )

      if (!destinationCollection) {
        return E.left("Destination collection not found")
      }
    }
  }
}

export const collectionsService = container.bind(CollectionService)
export const requestsService = container.bind(RequestsService)

export function makeCollectionTree(
  collections: UpdatedHoppCollection[],
  requests: UpdatedHoppRESTRequest[]
) {
  const collectionsTree: HoppCollection<HoppRESTRequest>[] = []
  const collectionsMap = new Map<
    string,
    HoppCollection<HoppRESTRequest> & UpdatedHoppCollection
  >()

  // build a copy of the collections array with empty folders & requests
  // so we don't mutate the original argument array
  const hoppCollections = collections.map((collection) => ({
    ...collection,
    folders: [],
    requests: [],
  }))

  const uniqueParentCollectionIDs = new Set<string>()

  hoppCollections.forEach((collection) => {
    if (collection.parentCollectionID) {
      uniqueParentCollectionIDs.add(collection.parentCollectionID)
    } else {
      collectionsTree.push(collection)
    }

    collectionsMap.set(collection.id, collection)
  })

  const collectionsMapArray = Array.from(collectionsMap)

  uniqueParentCollectionIDs.forEach((parentCollectionID) => {
    const childCollections = collectionsMapArray
      .filter(([, collection]) => {
        return collection.parentCollectionID == parentCollectionID
      })
      .map(([, collection]) => collection)
      .sort((a, b) => a.order.localeCompare(b.order))

    const childRequests = requests
      .filter((request) => request.parentCollectionID == parentCollectionID)
      .sort((a, b) => a.order.localeCompare(b.order))

    const parentCollection = collectionsMap.get(parentCollectionID)
    parentCollection?.folders.push(...childCollections)
    parentCollection?.requests.push(...childRequests)
  })

  return collectionsTree
}

window.makeCollectionTree = makeCollectionTree
