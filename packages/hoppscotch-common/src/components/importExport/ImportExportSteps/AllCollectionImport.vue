<template>
  <div class="select-wrapper">
    <select
      v-model="selectedWorkspaceID"
      autocomplete="off"
      class="select"
      autofocus
    >
      <option :key="undefined" :value="undefined" disabled selected>
        {{ t("collection.select") }}
      </option>
      <option
        v-for="workspace in workspaces"
        :key="`collection-${workspace.id}`"
        :value="workspace.id"
        class="bg-primary"
      >
        {{ workspace.name }}
      </option>
    </select>
    <select
      v-model="selectedCollectionID"
      autocomplete="off"
      class="select"
      autofocus
    >
      <option :key="undefined" :value="undefined" disabled selected>
        {{ t("collection.select") }}
      </option>
      <option
        v-for="collection in selectableCollections"
        :key="collection.id"
        :value="collection.id"
        class="bg-primary"
      >
        {{ collection.title }}
      </option>
    </select>
  </div>

  <div class="my-4">
    <HoppButtonPrimary
      class="w-full"
      :label="t('import.title')"
      :loading="loading"
      :disabled="!hasSelectedCollectionID || loading"
      @click="getCollectionDetailsAndImport"
    />
  </div>
</template>

<script setup lang="ts">
import { HoppCollection } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { computed, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { runGQLQuery } from "~/helpers/backend/GQLClient"
import {
  RootCollectionsOfTeamDocument,
  TeamCollection,
} from "~/helpers/backend/graphql"
import NewTeamCollectionAdapter, {
  TEAMS_BACKEND_PAGE_SIZE,
} from "~/helpers/teams/TeamCollectionAdapter"
import { getRESTCollection, restCollections$ } from "~/newstore/collections"
import { WorkspaceService } from "~/services/workspace.service"
import * as E from "fp-ts/Either"
import {
  getCollectionChildCollections,
  getSingleCollection,
} from "~/helpers/teams/TeamCollection"
import {
  getCollectionChildRequests,
  getSingleRequest,
} from "~/helpers/teams/TeamRequest"
import { getTeamCollectionJSON } from "~/helpers/backend/helpers"

const workspaceService = useService(WorkspaceService)
const teamListAdapter = workspaceService.acquireTeamListAdapter(null)
const myTeams = useReadonlyStream(teamListAdapter.teamList$, null)

const t = useI18n()

defineProps<{
  loading: boolean
}>()

const selectedCollectionID = ref<string | undefined>(undefined)

const hasSelectedCollectionID = computed(() => {
  return selectedCollectionID.value !== undefined
})

const personalCollections = useReadonlyStream(restCollections$, [])

const selectedWorkspaceID = ref<string | undefined>(undefined)

const isGettingWorkspaceRootCollections = ref(false)

const selectableCollections = ref<
  {
    id: string
    title: string
    data?: string | null
  }[]
>([])

watch(
  selectedWorkspaceID,
  async () => {
    if (!selectedWorkspaceID.value) {
      // do some cleanup on the previous workspace selection
      selectableCollections.value = personalCollections.value.map(
        (collection, collectionIndex) => ({
          id: `${collectionIndex}`, // because we don't have an ID for personal collections
          title: collection.name,
        })
      )
      return
    }

    console.group("selectedWorkspaceID changed")
    if (selectedWorkspaceID.value === "personal") {
      return
    }

    isGettingWorkspaceRootCollections.value = true

    const res = await getWorkspaceRootCollections(selectedWorkspaceID.value)

    if (E.isLeft(res)) {
      console.error(res.left)
      isGettingWorkspaceRootCollections.value = false
      return
    }

    console.group("Root collections of workspace ", selectedWorkspaceID.value)
    console.log(res.right)
    console.groupEnd()

    selectableCollections.value = res.right

    isGettingWorkspaceRootCollections.value = false

    console.groupEnd()
  },
  {
    immediate: true,
  }
)

const emit = defineEmits<{
  (e: "importCollection", content: HoppCollection): void
}>()

const workspaces = computed(() => {
  const allWorkspaces = [
    {
      id: "personal",
      name: t("workspace.personal"),
    },
  ]

  myTeams.value?.forEach((team) => {
    allWorkspaces.push({
      id: team.id,
      name: team.name,
    })
  })

  return allWorkspaces
})

const getWorkspaceRootCollections = async (workspaceID: string) => {
  const totalCollections: {
    id: string
    title: string
    data?: string | null
  }[] = []

  while (true) {
    const result = await runGQLQuery({
      query: RootCollectionsOfTeamDocument,
      variables: {
        teamID: workspaceID,
        cursor:
          totalCollections.length > 0
            ? totalCollections[totalCollections.length - 1].id
            : undefined,
      },
    })

    if (E.isLeft(result)) {
      return E.left(result.left)
    }

    totalCollections.push(...result.right.rootCollectionsOfTeam)

    if (result.right.rootCollectionsOfTeam.length < TEAMS_BACKEND_PAGE_SIZE) {
      break
    }
  }

  return E.right(totalCollections)
}

const getTeamCollection = async (collectionID: string) => {
  console.log("Getting team collection", collectionID)
  const rootCollection = await getSingleCollection(collectionID)

  if (E.isLeft(rootCollection)) {
    return E.left(rootCollection.left)
  }

  console.group("Root collection")
  console.log(rootCollection.right.collection)
  console.groupEnd()

  const childRequests = await getCollectionChildRequests(collectionID)

  if (E.isLeft(childRequests)) {
    return E.left(childRequests.left)
  }

  const childCollections = await getCollectionChildCollections(collectionID)

  if (E.isLeft(childCollections)) {
    return E.left(childCollections.left)
  }

  const childCollectionExpandedPromises =
    childCollections.right.collection?.children.map(
      (col): Promise<HoppCollection> => getTeamCollection(col.id)
    )

  return <HoppCollection>{
    v: 3,
    name: rootCollection.right.collection?.title,
  }

  // getSingleCollection
  // getSingleRequest
  // getCollectionChildCollections
  // getCollectionChildRequests
}

const getCollectionDetailsAndImport = async () => {
  if (!selectedCollectionID.value) {
    return
  }

  if (selectedWorkspaceID.value === "personal") {
    getPersonalCollection(parseInt(selectedCollectionID.value))
  } else {
    getTeamCollection(selectedCollectionID.value)
  }
}

const getPersonalCollection = async (collectionID: number) => {
  const collection = getRESTCollection(collectionID)

  if (collection) {
    emit("importCollection", collection)
  }
}

// TODO: edgecases
// 1. do not show the current workspace in the import options\
</script>
