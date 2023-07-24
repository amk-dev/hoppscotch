import { describe, it, expect } from "vitest"
import {
  UpdatedHoppCollection,
  UpdatedHoppRESTRequest,
  makeCollectionTree,
} from "./collections.service"

describe("makeCollectionTree", () => {
  it("should render proper tree from flat collections", () => {
    const collections: UpdatedHoppCollection[] = [
      {
        id: "collection_1",
        name: "Collection 1",
        order: "a0",
        v: 1,
      },
      {
        id: "collection_2",
        name: "Collection 2",
        order: "a1",
        v: 1,
      },
      {
        id: "collection_1.1",
        name: "Collection 1.1",
        order: "a0a0",
        parentCollectionID: "collection_1",
        v: 1,
      },
      {
        id: "collection_1.1.1",
        name: "Collection 1.1.1",
        order: "a0a0a0",
        parentCollectionID: "collection_1.1",
        v: 1,
      },
      {
        id: "collection_1.1.2",
        name: "Collection 1.1.2",
        order: "a0a0a1",
        parentCollectionID: "collection_1.1",
        v: 1,
      },
      {
        id: "collection_1.2",
        name: "Collection 1.2",
        order: "a0a1",
        parentCollectionID: "collection_1",
        v: 1,
      },
      {
        id: "collection_2.1",
        name: "Collection 2.1",
        order: "a1a0",
        parentCollectionID: "collection_2",
        v: 1,
      },
      {
        id: "collection_2.2",
        name: "Collection 2.2",
        order: "a1a1",
        parentCollectionID: "collection_2",
        v: 1,
      },
      {
        id: "collection_2.1.1",
        name: "Collection 2.1.1",
        order: "a1a0a0",
        parentCollectionID: "collection_2.1",
        v: 1,
      },
    ]

    const requests: UpdatedHoppRESTRequest[] = [
      makeSampleRequest("Request 1", "collection_1"),
      makeSampleRequest("Request 2", "collection_1"),
      makeSampleRequest("Request 3", "collection_1.1"),
      makeSampleRequest("Request 4", "collection_1.1.1"),
      makeSampleRequest("Request 5", "collection_1.1.2"),
      makeSampleRequest("Request 6", "collection_1.2"),
      makeSampleRequest("Request 7", "collection_2"),
      makeSampleRequest("Request 8", "collection_2.1"),
      makeSampleRequest("Request 9", "collection_2.2"),
      makeSampleRequest("Request 10", "collection_2.1.1"),
    ]

    const tree = makeCollectionTree(collections, requests)

    expect(tree).toMatchInlineSnapshot(`
      [
        {
          "folders": [
            {
              "folders": [
                {
                  "folders": [],
                  "id": "collection_1.1.1",
                  "name": "Collection 1.1.1",
                  "order": "a0a0a0",
                  "parentCollectionID": "collection_1.1",
                  "requests": [],
                  "v": 1,
                },
                {
                  "folders": [],
                  "id": "collection_1.1.2",
                  "name": "Collection 1.1.2",
                  "order": "a0a0a1",
                  "parentCollectionID": "collection_1.1",
                  "requests": [],
                  "v": 1,
                },
              ],
              "id": "collection_1.1",
              "name": "Collection 1.1",
              "order": "a0a0",
              "parentCollectionID": "collection_1",
              "requests": [
                {
                  "auth": {
                    "authActive": true,
                    "authType": "none",
                  },
                  "body": {
                    "body": null,
                    "contentType": null,
                  },
                  "endpoint": "https://example.com",
                  "headers": [],
                  "id": "Request_3",
                  "method": "GET",
                  "name": "Request 3",
                  "order": "a1",
                  "params": [],
                  "parentCollectionID": "collection_1.1",
                  "preRequestScript": "",
                  "testScript": "",
                  "v": "1",
                },
              ],
              "v": 1,
            },
            {
              "folders": [],
              "id": "collection_1.2",
              "name": "Collection 1.2",
              "order": "a0a1",
              "parentCollectionID": "collection_1",
              "requests": [],
              "v": 1,
            },
          ],
          "id": "collection_1",
          "name": "Collection 1",
          "order": "a0",
          "requests": [
            {
              "auth": {
                "authActive": true,
                "authType": "none",
              },
              "body": {
                "body": null,
                "contentType": null,
              },
              "endpoint": "https://example.com",
              "headers": [],
              "id": "Request_1",
              "method": "GET",
              "name": "Request 1",
              "order": "a1",
              "params": [],
              "parentCollectionID": "collection_1",
              "preRequestScript": "",
              "testScript": "",
              "v": "1",
            },
            {
              "auth": {
                "authActive": true,
                "authType": "none",
              },
              "body": {
                "body": null,
                "contentType": null,
              },
              "endpoint": "https://example.com",
              "headers": [],
              "id": "Request_2",
              "method": "GET",
              "name": "Request 2",
              "order": "a1",
              "params": [],
              "parentCollectionID": "collection_1",
              "preRequestScript": "",
              "testScript": "",
              "v": "1",
            },
          ],
          "v": 1,
        },
        {
          "folders": [
            {
              "folders": [
                {
                  "folders": [],
                  "id": "collection_2.1.1",
                  "name": "Collection 2.1.1",
                  "order": "a1a0a0",
                  "parentCollectionID": "collection_2.1",
                  "requests": [],
                  "v": 1,
                },
              ],
              "id": "collection_2.1",
              "name": "Collection 2.1",
              "order": "a1a0",
              "parentCollectionID": "collection_2",
              "requests": [
                {
                  "auth": {
                    "authActive": true,
                    "authType": "none",
                  },
                  "body": {
                    "body": null,
                    "contentType": null,
                  },
                  "endpoint": "https://example.com",
                  "headers": [],
                  "id": "Request_8",
                  "method": "GET",
                  "name": "Request 8",
                  "order": "a1",
                  "params": [],
                  "parentCollectionID": "collection_2.1",
                  "preRequestScript": "",
                  "testScript": "",
                  "v": "1",
                },
              ],
              "v": 1,
            },
            {
              "folders": [],
              "id": "collection_2.2",
              "name": "Collection 2.2",
              "order": "a1a1",
              "parentCollectionID": "collection_2",
              "requests": [],
              "v": 1,
            },
          ],
          "id": "collection_2",
          "name": "Collection 2",
          "order": "a1",
          "requests": [
            {
              "auth": {
                "authActive": true,
                "authType": "none",
              },
              "body": {
                "body": null,
                "contentType": null,
              },
              "endpoint": "https://example.com",
              "headers": [],
              "id": "Request_7",
              "method": "GET",
              "name": "Request 7",
              "order": "a1",
              "params": [],
              "parentCollectionID": "collection_2",
              "preRequestScript": "",
              "testScript": "",
              "v": "1",
            },
          ],
          "v": 1,
        },
      ]
    `)
  })
})

function makeSampleRequest(
  requestName: string,
  parentCollection: string
): UpdatedHoppRESTRequest {
  return {
    id: requestName.replace(" ", "_"),
    name: requestName,
    order: "a1",
    parentCollectionID: parentCollection,
    v: "1",
    auth: {
      authType: "none",
      authActive: true,
    },
    endpoint: "https://example.com",
    headers: [],
    params: [],
    body: {
      body: null,
      contentType: null,
    },
    method: "GET",
    preRequestScript: "",
    testScript: "",
  }
}
