import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

const MAX_CONTENT_LENGTH = 15_000

export interface ArticleContent {
  title: string
  content: string
  byline: string | null
  length: number
}

export async function fetchArticle(url: string): Promise<ArticleContent> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; SurvivorFantasyBot/1.0; +https://github.com/survivor-fantasy)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    throw new Error(`Fetch ${res.status}: ${url}`)
  }

  const html = await res.text()
  const { document } = parseHTML(html)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reader = new Readability(document as any)
  const article = reader.parse()

  if (!article) {
    throw new Error(`Readability could not parse article: ${url}`)
  }

  // Strip HTML tags from the textContent, keep plain text
  const text = article.textContent.trim()

  // Truncate to avoid huge Claude context
  const truncated =
    text.length > MAX_CONTENT_LENGTH
      ? text.slice(0, MAX_CONTENT_LENGTH) + '\n\n[... truncated]'
      : text

  return {
    title: article.title,
    content: truncated,
    byline: article.byline,
    length: text.length,
  }
}
