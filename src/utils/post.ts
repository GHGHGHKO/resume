import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'
import { XMLParser } from 'fast-xml-parser'

export async function fetchTistoryTopPosts(limit = 7) {
	const RSS_URL = 'https://pepega.tistory.com/rss'

	const res = await fetch(RSS_URL)
	if (!res.ok) throw new Error(`RSS fetch failed: ${res.statusText}`)

	const xml = await res.text()

	const parser = new XMLParser({ ignoreAttributes: false })
	const json = parser.parse(xml)
	const items = json.rss?.channel?.item ?? []

	return items.slice(0, limit).map((item: any) => ({
		slug: item.link.split('/').filter(Boolean).pop() ?? '',
		data: {
			title: item.title,
			link: item.link,
			description: item.description ?? '',
			publishDate: new Date(item.pubDate),
			draft: false,
			tags: ['Tistory'],
		},
	}))
}

/** Note: this function filters out draft posts based on the environment */
export async function getAllPosts() {
	return await getCollection('post', ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true
	})
}

export function sortMDByDate(posts: Array<CollectionEntry<'post'>>) {
	return posts.sort((a, b) => {
		const aDate = new Date(a.data.updatedDate ?? a.data.publishDate).valueOf()
		const bDate = new Date(b.data.updatedDate ?? b.data.publishDate).valueOf()
		return bDate - aDate
	})
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getAllTags(posts: Array<CollectionEntry<'post'>>) {
	return posts.flatMap((post) => [...post.data.tags])
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTags(posts: Array<CollectionEntry<'post'>>) {
	return [...new Set(getAllTags(posts))]
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTagsWithCount(
	posts: Array<CollectionEntry<'post'>>
): Array<[string, number]> {
	return [
		...getAllTags(posts).reduce(
			(acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
			new Map<string, number>()
		)
	].sort((a, b) => b[1] - a[1])
}
