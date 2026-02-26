import { search } from 'duck-duck-scrape'

export interface SearchResult {
  title: string
  url: string
  description: string
}

export async function searchWeb(query: string, count = 10): Promise<SearchResult[]> {
  const response = await search(query, { safeSearch: 0 })

  const results: SearchResult[] = response.results.slice(0, count).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }))

  return results
}
