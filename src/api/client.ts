import { generateToken, type JWTConfig } from "../auth/jwt.js";
import type { JsonApiResponse, JsonApiResource, PaginationLinks } from "./types.js";

const BASE_URL = "https://api.appstoreconnect.apple.com/v1";

export class AppStoreConnectClient {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  async request<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<JsonApiResponse<T>> {
    const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const token = await generateToken(this.config);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new AppStoreConnectError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    return response.json() as Promise<JsonApiResponse<T>>;
  }

  async requestAll<T extends JsonApiResource>(
    path: string,
    params?: Record<string, string>,
    maxPages: number = 5
  ): Promise<{ data: T[]; included: JsonApiResource[] }> {
    const allData: T[] = [];
    const allIncluded: JsonApiResource[] = [];
    let nextUrl: string | undefined = undefined;
    let page = 0;

    while (page < maxPages) {
      const response: JsonApiResponse<T[]> = nextUrl
        ? await this.request(nextUrl)
        : await this.request(path, params);

      if (Array.isArray(response.data)) {
        allData.push(...response.data);
      }
      if (response.included) {
        allIncluded.push(...response.included);
      }

      nextUrl = response.links?.next;
      if (!nextUrl) break;
      page++;
    }

    return { data: allData, included: allIncluded };
  }
}

export class AppStoreConnectError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "AppStoreConnectError";
    this.status = status;
    this.body = body;
  }
}
