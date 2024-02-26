import { Ref } from "vue"
import * as E from "fp-ts/Either"

import { HandleRef } from "./handle"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
  WorkspaceRequest,
} from "./workspace"
import {
  RESTCollectionLevelAuthHeadersView,
  RESTCollectionChildrenView,
  RootRESTCollectionView,
  RESTSearchResultsView,
  RESTCollectionJSONView,
} from "./view"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

export interface WorkspaceProvider {
  providerID: string

  workspaceDecor?: Ref<WorkspaceDecor>

  createWorkspace(
    workspaceTitle: string
  ): Promise<E.Either<unknown, HandleRef<Workspace>>>

  getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, HandleRef<Workspace>>>
  getCollectionHandle(
    workspaceHandle: HandleRef<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  // PR-COMMENT: add collectionID as params
  // because in teams, we cannot extract the collectionID from the requestID as we do in the current implementation
  // another consideration is we don't even need the collectionID or workspaceID if we're adding them to the request object
  // eg: a request belongs to a collection, and a collection belongs to a workspace. So, we can just pass the request id and get the collection and workspace from the request object
  getRequestHandle(
    workspaceHandle: HandleRef<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>

  getRESTRootCollectionView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<never, HandleRef<RootRESTCollectionView>>>
  getRESTCollectionChildrenView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<never, HandleRef<RESTCollectionChildrenView>>>
  getRESTCollectionLevelAuthHeadersView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<never, HandleRef<RESTCollectionLevelAuthHeadersView>>>
  getRESTSearchResultsView(
    workspaceHandle: HandleRef<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, HandleRef<RESTSearchResultsView>>>
  getRESTCollectionJSONView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<never, HandleRef<RESTCollectionJSONView>>>

  createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  createRESTChildCollection(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  updateRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>>
  removeRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>>
  createRESTRequest(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>
  updateRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest>
  ): Promise<E.Either<unknown, void>>
  removeRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>>

  importRESTCollections(
    workspaceHandle: HandleRef<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  exportRESTCollections(
    workspaceHandle: HandleRef<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>>
  exportRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    collection: HoppCollection
  ): Promise<E.Either<unknown, void>>

  reorderRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>>
  reorderRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionID: string,
    destinationRequestID: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>>
}
