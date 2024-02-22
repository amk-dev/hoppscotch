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
import { Ref, computed } from "vue"
import {
  RESTCollectionChildrenView,
  RESTCollectionLevelAuthHeadersView,
  RootRESTCollectionView,
} from "../view"

export class TeamsWorkspaceProviderService
  extends Service
  implements WorkspaceProvider
{
  public static readonly ID = "TEAMS_WORKSPACE_PROVIDER_SERVICE"

  public readonly providerID = "TEAMS_WORKSPACE_PROVIDER"

  private workspaceService = this.bind(NewWorkspaceService)

  constructor() {
    super()

    // setup subscriptions to the teams workspace provider
    this.workspaceService.registerWorkspaceProvider(this)
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

  getCollectionHandle(
    workspaceHandle: HandleRef<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    throw new Error("Method not implemented.")
  }

  getRESTCollectionChildrenView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<RESTCollectionChildrenView>>> {
    throw new Error("Method not implemented.")
  }

  getRESTCollectionLevelAuthHeadersView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<RESTCollectionLevelAuthHeadersView>>> {
    throw new Error("Method not implemented.")
  }

  getRESTRootCollectionView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<unknown, HandleRef<RootRESTCollectionView>>> {
    throw new Error("Method not implemented.")
  }

  getRequestHandle(
    workspaceHandle: HandleRef<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>> {
    throw new Error("Method not implemented.")
  }

  getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, HandleRef<Workspace>>> {
    throw new Error("Method not implemented.")
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
