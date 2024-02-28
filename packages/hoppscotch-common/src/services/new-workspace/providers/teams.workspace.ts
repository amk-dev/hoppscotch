import { Service } from "dioc"
import { WorkspaceProvider } from "../provider"
import { NewWorkspaceService } from ".."
import { HandleRef } from "../handle"
import { Workspace, WorkspaceCollection, WorkspaceRequest } from "../workspace"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

import * as E from "fp-ts/Either"
import { platform } from "~/platform"
import {
  createNewRootCollection,
  createChildCollection,
  updateTeamCollection,
  deleteCollection,
} from "~/helpers/backend/mutations/TeamCollection"
import {
  createRequestInCollection,
  updateTeamRequest,
  deleteTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import { createTeam } from "~/helpers/backend/mutations/Team"
import { Ref, computed, ref } from "vue"
import {
  RESTCollectionChildrenView,
  RESTCollectionLevelAuthHeadersView,
  RESTCollectionViewItem,
  RootRESTCollectionView,
} from "../view"
import { runGQLQuery, runGQLSubscription } from "~/helpers/backend/GQLClient"
import {
  GetCollectionChildrenDocument,
  GetMyTeamsDocument,
  RootCollectionsOfTeamDocument,
  TeamCollectionAddedDocument,
  TeamCollectionMovedDocument,
  TeamCollectionRemovedDocument,
  TeamCollectionUpdatedDocument,
  TeamRequestAddedDocument,
  TeamRequestDeletedDocument,
  TeamRequestMovedDocument,
  TeamRequestOrderUpdatedDocument,
  TeamRequestUpdatedDocument,
} from "~/helpers/backend/graphql"
import { Subscription } from "wonka"

import { generateKeyBetween } from "fractional-indexing"

export class TeamsWorkspaceProviderService
  extends Service
  implements WorkspaceProvider
{
  public static readonly ID = "TEAMS_WORKSPACE_PROVIDER_SERVICE"

  public readonly providerID = "TEAMS_WORKSPACE_PROVIDER"

  private workspaceService = this.bind(NewWorkspaceService)

  private workspaces: Ref<Workspace[]> = ref([])

  private collections: Ref<
    (WorkspaceCollection & {
      parentCollectionID?: string
      order: string
    })[]
  > = ref([])

  private requests: Ref<
    (WorkspaceRequest & {
      order: string
    })[]
  > = ref([])

  private orderedCollections = computed(() => {
    return sortByOrder(this.collections.value)
  })

  private orderedRequests = computed(() => {
    return sortByOrder(this.requests.value)
  })

  private subscriptions: Subscription[] = []

  private fetchingWorkspaces = ref(false)
  private loadingCollections = ref<string[]>([])

  constructor() {
    super()

    this.fetchingWorkspaces = ref(true)

    fetchAllWorkspaces().then((res) => {
      // ignoring error for now, write logic for that later
      if (E.isLeft(res)) {
        console.error("Failed to fetch workspaces")

        this.fetchingWorkspaces.value = false

        return
      }

      console.log(res.right.myTeams)

      this.workspaces.value = res.right.myTeams.map((team) => {
        return {
          name: team.name,
          workspaceID: team.id,
          providerID: this.providerID,
        }
      })

      this.fetchingWorkspaces.value = false
    })

    this.workspaceService.registerWorkspaceProvider(this)
  }

  // this is temporary, i need this to create workspaces
  async createWorkspace(
    workspaceName: string
  ): Promise<E.Either<unknown, HandleRef<Workspace>>> {
    const res = await createTeam(workspaceName)()

    if (E.isLeft(res)) {
      return res
    }

    const workspaceID = res.right.id

    const workspace = {
      name: workspaceName,
      workspaceID,
      providerID: this.providerID,
    }

    this.workspaces.value.push(workspace)

    return E.right(
      computed(() => {
        return {
          data: workspace,
          type: "ok" as const,
        }
      })
    )
  }

  // this is temporary, i need this to populate root collections
  async selectWorkspace(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<unknown, void>> {
    if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE" as const)
    }

    // set this as activeWorkspaceHandle in workspaceService
    this.workspaceService.activeWorkspaceHandle.value = workspaceHandle

    // unsubscribe previous subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe())

    // setup new subscriptions
    this.setupTeamsCollectionAddedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsCollectionUpdatedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsCollectionRemovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestAddedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestUpdatedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestRemovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestMovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsCollectionMovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamRequestOrderUpdatedSubscription(
      workspaceHandle.value.data.workspaceID
    )

    // start fetching root collections
    const res = await fetchRootCollections(
      workspaceHandle.value.data.workspaceID
    )

    if (E.isLeft(res)) {
      return res
    }

    let previousOrder: string | null = null

    this.collections.value = res.right.rootCollectionsOfTeam.map(
      (collection) => {
        const order = generateKeyBetween(previousOrder, null)

        previousOrder = order

        return {
          collectionID: collection.id,
          providerID: this.providerID,
          workspaceID: workspaceHandle.value.data.workspaceID,
          name: collection.title,
          order,
        }
      }
    )

    return E.right(undefined)
  }

  async createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    newCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE" as const)
    }

    const { name } = newCollection

    const res = await createNewRootCollection(
      name,
      workspaceHandle.value.data.workspaceID
    )()

    if (E.isLeft(res)) {
      return res
    }

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      platform: "rest",
      workspaceType: "team",
      isRootCollection: true,
    })

    const collectionID = res.right.createRootCollection.id
    const providerID = workspaceHandle.value.data.providerID
    const workspaceID = workspaceHandle.value.data.workspaceID

    return E.right(
      computed(() => {
        if (!isValidWorkspaceHandle(workspaceHandle, providerID)) {
          return {
            type: "invalid" as const,
            reason: "INVALID_COLLECTION_HANDLE",
          }
        }

        return {
          data: {
            name,
            collectionID,
            providerID,
            workspaceID,
          },
          type: "ok" as const,
        }
      })
    )
  }

  async createRESTChildCollection(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (parentCollectionHandle.value.type === "invalid") {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const { name } = newChildCollection

    const res = await createChildCollection(
      name,
      parentCollectionHandle.value.data.collectionID
    )()

    if (E.isLeft(res)) {
      return res
    }

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      platform: "rest",
      workspaceType: "team",
      isRootCollection: false,
    })

    const collectionID = res.right.createChildCollection.id
    const providerID = parentCollectionHandle.value.data.providerID
    const workspaceID = parentCollectionHandle.value.data.workspaceID

    return E.right(
      computed(() => {
        if (!isValidCollectionHandle(parentCollectionHandle, providerID)) {
          return {
            type: "invalid" as const,
            reason: "INVALID_COLLECTION_HANDLE",
          }
        }

        return {
          data: {
            name,
            collectionID,
            providerID,
            workspaceID,
          },
          type: "ok" as const,
        }
      })
    )
  }

  async updateRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>> {
    if (!isValidCollectionHandle(collectionHandle, this.providerID)) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const res = await updateTeamCollection(
      collectionHandle.value.data.collectionID,
      {
        headers: updatedCollection.headers,
        auth: updatedCollection.auth,
      },
      updatedCollection.name
    )()

    if (E.isLeft(res)) {
      return res
    }

    return E.right(undefined)
  }

  async createRESTRequest(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>> {
    if (!isValidCollectionHandle(parentCollectionHandle, this.providerID)) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const collectionID = parentCollectionHandle.value.data.collectionID

    const res = await createRequestInCollection(collectionID, {
      request: JSON.stringify(newRequest),
      teamID: parentCollectionHandle.value.data.workspaceID,
      title: newRequest.name,
    })()

    if (E.isLeft(res)) {
      return res
    }

    const requestID = res.right.createRequestInCollection.id
    const providerID = parentCollectionHandle.value.data.providerID
    const workspaceID = parentCollectionHandle.value.data.workspaceID

    return E.right(
      computed(() => {
        if (!isValidCollectionHandle(parentCollectionHandle, providerID)) {
          return {
            type: "invalid" as const,
            reason: "INVALID_COLLECTION_HANDLE",
          }
        }

        return {
          data: {
            requestID,
            providerID,
            workspaceID,
            collectionID,
            request: newRequest,
          },
          type: "ok" as const,
        }
      })
    )
  }

  async updateRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest> & { name: string }
  ): Promise<E.Either<unknown, void>> {
    if (!isValidRequestHandle(requestHandle, this.providerID)) {
      return E.left("INVALID_REQUEST_HANDLE" as const)
    }

    const res = await updateTeamRequest(requestHandle.value.data.requestID, {
      request: JSON.stringify(updatedRequest),
      title: updatedRequest.name,
    })()

    if (E.isLeft(res)) {
      return res
    }

    return E.right(undefined)
  }

  async removeRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>> {
    if (!isValidCollectionHandle(collectionHandle, this.providerID)) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const res = await deleteCollection(
      collectionHandle.value.data.collectionID
    )()

    if (E.isLeft(res)) {
      return res
    }

    return Promise.resolve(E.right(undefined))
  }

  async removeRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>> {
    if (!isValidRequestHandle(requestHandle, this.providerID)) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const res = await deleteTeamRequest(requestHandle.value.data.requestID)()

    if (E.isLeft(res)) {
      return res
    }

    return Promise.resolve(E.right(undefined))
  }

  getWorkspaces(): HandleRef<HandleRef<Workspace>[]> {
    return computed(() => {
      if (this.fetchingWorkspaces.value) {
        return {
          type: "invalid" as const,
          reason: "LOADING_WORKSPACES",
        }
      }

      return {
        data: this.workspaces.value.map((workspace) => {
          return computed(() => {
            const existsStill = this.workspaces.value.includes(workspace)

            if (!existsStill) {
              return {
                type: "invalid" as const,
                reason: "WORKSPACE_DOES_NOT_EXIST",
              }
            }

            return {
              data: workspace,
              type: "ok" as const,
            }
          })
        }),
        type: "ok" as const,
      }
    })

    // return this.workspaces.value.map((workspace) => {
    //   return computed(() => {
    //     const existsStill = this.workspaces.value.includes(workspace)

    //     if (!existsStill) {
    //       return {
    //         type: "invalid" as const,
    //         reason: "WORKSPACE_DOES_NOT_EXIST",
    //       }
    //     }

    //     return {
    //       data: workspace,
    //       type: "ok" as const,
    //     }
    //   })
    // })
  }

  async getCollectionHandle(
    workspaceHandle: HandleRef<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE" as const)
    }

    const collection = computed(() => {
      return this.collections.value.find(
        (collection) => collection.collectionID === collectionID
      )
    })

    if (!collection.value) {
      return E.left("COLLECTION_DOES_NOT_EXIST" as const)
    }

    return E.right(
      computed(() => {
        if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
          return {
            type: "invalid" as const,
            reason: "INVALID_WORKSPACE_HANDLE",
          }
        }

        if (!collection.value) {
          return {
            type: "invalid" as const,
            reason: "COLLECTION_DOES_NOT_EXIST",
          }
        }

        return {
          data: {
            collectionID: collection.value.collectionID,
            providerID: collection.value.providerID,
            workspaceID: collection.value.workspaceID,
            name: collection.value.name,
          },
          type: "ok" as const,
        }
      })
    )
  }

  async getRESTCollectionChildrenView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<RESTCollectionChildrenView>>> {
    if (!isValidCollectionHandle(collectionHandle, this.providerID)) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    // PR-COMMENT: this feels a little weird, we're returning a computed, i could move this into the returned computed
    // look into this later
    const collectionChildren = computed((): RESTCollectionViewItem[] =>
      sortByOrder(
        this.collections.value.filter(
          (collection) =>
            collection.parentCollectionID ===
            collectionHandle.value.data.collectionID
        )
      ).map((collection) => ({
        type: "collection",
        value: {
          collectionID: collection.collectionID,
          name: collection.name,
        },
      }))
    )

    return E.right(
      computed(() => {
        if (!isValidCollectionHandle(collectionHandle, this.providerID)) {
          return {
            type: "invalid" as const,
            reason: "INVALID_COLLECTION_HANDLE",
          }
        }

        return {
          data: {
            collectionID: collectionHandle.value.data.collectionID,
            providerID: collectionHandle.value.data.providerID,
            workspaceID: collectionHandle.value.data.workspaceID,
            content: collectionChildren,
            loading: ref(false), // TODO: make this dynamic
          },
          type: "ok" as const,
        }
      })
    )
  }

  getRESTCollectionLevelAuthHeadersView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<RESTCollectionLevelAuthHeadersView>>> {
    throw new Error("Method not implemented.")
  }

  async getRESTRootCollectionView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<unknown, HandleRef<RootRESTCollectionView>>> {
    if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const rootCollections = computed(() =>
      sortByOrder(
        this.collections.value.filter(
          (collection) => !collection.parentCollectionID
        )
      ).map((collection) => ({
        collectionID: collection.collectionID,
        name: collection.name,
      }))
    )

    return E.right(
      computed(() => {
        return {
          data: {
            workspaceID: workspaceHandle.value.data.workspaceID,
            providerID: this.providerID,
            collections: rootCollections,
            loading: ref(false), // TODO: make this dynamic
          },
          type: "ok" as const,
        }
      })
    )
  }

  async getRequestHandle(
    workspaceHandle: HandleRef<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>> {
    if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE" as const)
    }

    const request = computed(() => {
      return this.requests.value.find(
        (request) => request.requestID === requestID
      )
    })

    if (!request.value) {
      return E.left("REQUEST_DOES_NOT_EXIST" as const)
    }

    return E.right(
      computed(() => {
        if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
          return {
            type: "invalid" as const,
            reason: "INVALID_WORKSPACE_HANDLE",
          }
        }

        if (!request.value) {
          return {
            type: "invalid" as const,
            reason: "REQUEST_DOES_NOT_EXIST",
          }
        }

        return {
          data: {
            requestID: request.value.requestID,
            providerID: request.value.providerID,
            workspaceID: request.value.workspaceID,
            collectionID: request.value.collectionID,
            request: request.value.request,
          },
          type: "ok" as const,
        }
      })
    )
  }

  // this might be temporary, might move this to decor
  async getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, HandleRef<Workspace>>> {
    const workspace = computed(() => {
      return this.workspaces.value.find(
        (workspace) => workspace.workspaceID === workspaceID
      )
    })

    if (!workspace.value) {
      return E.left("WORKSPACE_DOES_NOT_EXIST" as const)
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (!workspace.value) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_DOES_NOT_EXIST",
            }
          }

          return {
            data: workspace.value,
            type: "ok" as const,
          }
        })
      )
    )
  }

  private async setupTeamsCollectionAddedSubscription(workspaceID: string) {
    const [teamCollAdded$, teamCollAddedSub] =
      runTeamCollectionAddedSubscription(workspaceID)

    this.subscriptions.push(teamCollAddedSub)

    teamCollAdded$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Collection Added")
      console.log(result)
      console.groupEnd()

      const parentCollectionID = result.right.teamCollectionAdded.parent?.id

      const siblingCollections = this.collections.value.filter(
        (collection) => collection.parentCollectionID === parentCollectionID
      )
      const lastChild = siblingCollections.at(-1)
      const order = generateKeyBetween(lastChild?.order, null)

      const collection: WorkspaceCollection & {
        parentCollectionID?: string
        order: string
      } = {
        name: result.right.teamCollectionAdded.title,
        collectionID: result.right.teamCollectionAdded.id,
        providerID: this.providerID,
        workspaceID: workspaceID,
        parentCollectionID: result.right.teamCollectionAdded.parent?.id,
        order,
      }

      this.collections.value.push(collection)
    })
  }

  private async setupTeamsCollectionUpdatedSubscription(workspaceID: string) {
    const [teamCollUpdated$, teamCollUpdatedSub] =
      runTeamCollectionUpdatedSubscription(workspaceID)

    this.subscriptions.push(teamCollUpdatedSub)

    teamCollUpdated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Collection Updated")
      console.log(result)
      console.groupEnd()

      this.collections.value = this.collections.value.map((collection) => {
        if (collection.collectionID === result.right.teamCollectionUpdated.id) {
          return {
            ...collection,
            name: result.right.teamCollectionUpdated.title,
            // TODO: add result.right.teamCollectinUpdated.data
          }
        }

        return collection
      })
    })
  }

  private async setupTeamsCollectionRemovedSubscription(workspaceID: string) {
    const [teamCollRemoved$, teamCollRemovedSub] =
      runTeamCollectionRemovedSubscription(workspaceID)

    this.subscriptions.push(teamCollRemovedSub)

    teamCollRemoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Collection Removed")
      console.log(result)
      console.groupEnd()

      this.collections.value = this.collections.value.filter(
        (collection) =>
          collection.collectionID !== result.right.teamCollectionRemoved
      )
    })
  }

  private async setupTeamsCollectionMovedSubscription(workspaceID: string) {
    const [teamCollMoved$, teamCollMovedSub] =
      runTeamCollectionMovedSubscription(workspaceID)

    this.subscriptions.push(teamCollMovedSub)

    teamCollMoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      const siblingCollections = this.collections.value.filter(
        (collection) =>
          collection.parentCollectionID ===
          result.right.teamCollectionMoved.parent?.id
      )

      const lastChild = siblingCollections.at(-1)

      const order = generateKeyBetween(lastChild?.order, null)

      this.collections.value = this.collections.value.map((collection) => {
        if (collection.collectionID === result.right.teamCollectionMoved.id) {
          return {
            ...collection,
            parentCollectionID: result.right.teamCollectionMoved.parent?.id,
            order,
          }
        }

        return collection
      })
    })
  }

  private async setupTeamsRequestAddedSubscription(workspaceID: string) {
    const [teamRequestAdded$, teamRequestAddedSub] =
      runTeamRequestAddedSubscription(workspaceID)

    this.subscriptions.push(teamRequestAddedSub)

    teamRequestAdded$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Request Added")
      console.log(result)
      console.groupEnd()

      const siblingRequests = this.requests.value.filter(
        (request) =>
          request.collectionID === result.right.teamRequestAdded.collectionID
      )

      const lastSibling = siblingRequests.at(-1)

      const order = generateKeyBetween(lastSibling?.order, null)

      const request: WorkspaceRequest & {
        order: string
      } = {
        requestID: result.right.teamRequestAdded.id,
        providerID: this.providerID,
        workspaceID: workspaceID,
        collectionID: result.right.teamRequestAdded.collectionID,
        request: JSON.parse(result.right.teamRequestAdded.request),
        order,
      }

      this.requests.value.push(request)
    })
  }

  private async setupTeamsRequestUpdatedSubscription(workspaceID: string) {
    const [teamRequestUpdated$, teamRequestUpdatedSub] =
      runTeamRequestUpdatedSubscription(workspaceID)

    this.subscriptions.push(teamRequestUpdatedSub)

    teamRequestUpdated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Request Updated")
      console.log(result)
      console.groupEnd()

      const updatedRequest: WorkspaceRequest = {
        collectionID: result.right.teamRequestUpdated.collectionID,
        providerID: this.providerID,
        requestID: result.right.teamRequestUpdated.id,
        workspaceID: workspaceID,
        request: JSON.parse(result.right.teamRequestUpdated.request),
      }

      this.requests.value = this.requests.value.map((request) => {
        if (request.requestID === result.right.teamRequestUpdated.id) {
          return {
            ...request,
            ...updatedRequest,
          }
        }

        return request
      })
    })
  }

  private async setupTeamsRequestRemovedSubscription(workspaceID: string) {
    const [teamRequestRemoved$, teamRequestRemovedSub] =
      runTeamRequestRemovedSubscription(workspaceID)

    this.subscriptions.push(teamRequestRemovedSub)

    teamRequestRemoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Request Removed")
      console.log(result)
      console.groupEnd()

      this.requests.value = this.requests.value.filter(
        (request) => request.requestID !== result.right.teamRequestDeleted
      )
    })
  }

  private async setupTeamsRequestMovedSubscription(workspaceID: string) {
    const [teamRequestMoved$, teamRequestMovedSub] =
      runTeamRequestMovedSubscription(workspaceID)

    this.subscriptions.push(teamRequestMovedSub)

    teamRequestMoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      const siblingRequests = this.requests.value.filter(
        (request) =>
          request.collectionID === result.right.requestMoved.collectionID
      )

      const lastSibling = siblingRequests.at(-1)

      const order = generateKeyBetween(lastSibling?.order, null)

      this.requests.value = this.requests.value.map((request) => {
        if (request.requestID === result.right.requestMoved.id) {
          return {
            ...request,
            collectionID: result.right.requestMoved.collectionID,
            order,
          }
        }

        return request
      })
    })
  }

  private async setupTeamRequestOrderUpdatedSubscription(workspaceID: string) {
    const [teamRequestOrderUpdated$, teamRequestOrderUpdatedSub] =
      runTeamRequestOrderUpdatedSubscription(workspaceID)

    this.subscriptions.push(teamRequestOrderUpdatedSub)

    teamRequestOrderUpdated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      const { request, nextRequest } = result.right.requestOrderUpdated

      const reorderOperation = reorderItemsWithoutChangingParent(
        request.id,
        nextRequest?.id ?? null,
        this.orderedRequests.value,
        "requestID",
        "collectionID"
      )

      if (E.isLeft(reorderOperation)) {
        console.error(reorderOperation.left)
        return
      }

      this.requests.value = reorderOperation.right
    })
  }
}

const isValidWorkspaceHandle = (
  workspace: HandleRef<Workspace>,
  providerID: string
): workspace is Ref<{
  data: Workspace
  type: "ok"
}> => {
  return (
    workspace.value.type === "ok" &&
    workspace.value.data.providerID === providerID
  )
}

const isValidCollectionHandle = (
  collection: HandleRef<WorkspaceCollection>,
  providerID: string
): collection is Ref<{
  data: WorkspaceCollection
  type: "ok"
}> => {
  return (
    collection.value.type === "ok" &&
    collection.value.data.providerID === providerID
  )
}

const isValidRequestHandle = (
  request: HandleRef<WorkspaceRequest>,
  providerID: string
): request is Ref<{
  data: WorkspaceRequest
  type: "ok"
}> => {
  return (
    request.value.type === "ok" && request.value.data.providerID === providerID
  )
}

const fetchAllWorkspaces = async (cursor?: string) => {
  const result = await runGQLQuery({
    query: GetMyTeamsDocument,
    variables: {
      cursor,
    },
  })

  return result
}

const fetchRootCollections = async (teamID: string, cursor?: string) => {
  const result = await runGQLQuery({
    query: RootCollectionsOfTeamDocument,
    variables: {
      teamID,
      cursor,
    },
  })

  return result
}

const getCollectionChildren = async (collectionID: string, cursor?: string) => {
  const res = await runGQLQuery({
    query: GetCollectionChildrenDocument,
    variables: {
      collectionID: collectionID,
      cursor,
    },
  })

  return res
}

const runTeamCollectionAddedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionAddedDocument,
    variables: {
      teamID: teamID,
    },
  })

const runTeamCollectionUpdatedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionUpdatedDocument,
    variables: {
      teamID,
    },
  })

const runTeamCollectionRemovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionRemovedDocument,
    variables: {
      teamID,
    },
  })

const runTeamCollectionMovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionMovedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestAddedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestAddedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestUpdatedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestUpdatedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestRemovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestDeletedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestMovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestMovedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestOrderUpdatedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestOrderUpdatedDocument,
    variables: {
      teamID,
    },
  })

window.TeamsWorkspaceProviderService = TeamsWorkspaceProviderService

// createWorkspace + selectWorkspace situation
// cache the children of a collection
// cursors
// setup subscriptions for the changes

const testProvider = async () => {
  const provider = new TeamsWorkspaceProviderService()

  window.testProvider = provider

  const workspace = await provider.createWorkspace("Teams Workspace 1")

  if (E.isLeft(workspace)) {
    return
  }

  const res = await provider.selectWorkspace(workspace.right)

  if (E.isLeft(res)) {
    console.log("Workspace Selection Failed")
    return
  }

  if (workspace.right.value.type === "invalid") {
    return
  }

  const workspaceID = workspace.right.value.data.workspaceID

  const teamCollection = await provider.createRESTRootCollection(
    workspace.right,
    {
      name: "Team Collection 1",
    }
  )

  if (E.isLeft(teamCollection)) {
    return
  }

  if (!isValidCollectionHandle(teamCollection.right, provider.providerID)) {
    console.log("Invalid Collection Handle")
    return
  }

  const childCollection = await provider.createRESTChildCollection(
    teamCollection.right,
    {
      name: "Team Child Collection 1",
    }
  )

  if (E.isLeft(childCollection)) {
    return
  }

  if (!isValidCollectionHandle(childCollection.right, provider.providerID)) {
    console.log("Invalid Collection Handle")
    return
  }

  window.currentProvider = provider
}

window.testProvider = testProvider

const reorderItemsWithoutChangingParent = <
  ParentIDKey extends keyof Reorderable,
  IDKey extends keyof Reorderable,
  Reorderable extends { order: string } & {
    [key in ParentIDKey]: string | null
  } & {
    [key in IDKey]: string
  },
>(
  sourceItemID: string,
  destinationItemID: string | null,
  items: Reorderable[],
  idKey: IDKey,
  parentIDKey: ParentIDKey
) => {
  const sourceItem = items.find((item) => item[idKey] === sourceItemID)

  if (!sourceItem) {
    return E.left("SOURCE_ITEM_NOT_FOUND_WHILE_REORDERING")
  }

  let destinationItem: Reorderable | undefined
  let destinationOrder: string | null = null

  if (destinationItemID) {
    destinationItem = items.find((item) => item[idKey] === destinationItemID)

    if (!destinationItem) {
      return E.left("DESTINATION_ITEM_NOT_FOUND_WHILE_REORDERING")
    }

    destinationOrder = destinationItem.order
  }

  const siblingItems = items.filter(
    (item) => item[parentIDKey] === sourceItem[parentIDKey]
  )

  const previousItem = (() => {
    // if the destination order is null, we're moving the collection to the end of the list
    if (destinationOrder === null) {
      return E.right(siblingItems.at(-1))
    }

    const destinationCollection = siblingItems.find(
      (collection) => collection[idKey] === destinationItemID
    )

    if (!destinationCollection) {
      return E.left("DESTINATION_ITEM_NOT_FOUND")
    }

    return E.right(destinationCollection)
  })()

  if (E.isLeft(previousItem)) {
    return previousItem
  }

  const newOrder = generateKeyBetween(
    previousItem.right?.order ?? null,
    destinationItem?.order ?? null
  )

  return E.right(
    items.map((item) =>
      item[idKey] === sourceItemID
        ? {
            ...item,
            order: newOrder,
          }
        : item
    )
  )
}

const sortByOrder = <OrderedItem extends { order: string }>(
  items: OrderedItem[]
) => {
  return items.sort((item1, item2) => {
    if (item1.order < item2.order) {
      return -1
    }

    if (item1.order > item2.order) {
      return 1
    }

    return 0
  })
}

// TODO
// where to put the getChildren api call
// cursor + pagination stuff
// decor stuff
// inherited auth + headers stuff
