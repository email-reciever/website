import rss from '@astrojs/rss'
import { SITETITLE, SITEDESCRIPTION } from 'astro:env/client'
import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'
import { allCollectionsEntries } from '@/content/config'

export async function GET(context: APIContext) {
  const allCollectionPosts = await Promise.all(
    allCollectionsEntries.map((collection) => getCollection(collection))
  )
  return rss({
    title: SITETITLE,
    description: SITEDESCRIPTION,
    site: context.site!,
    items: allCollectionPosts.flat().map((post) => ({
      title: post.data.title,
      pubDate: post.data.date as unknown as Date,
      description: post.data.description,
      author: post.data.author,
      origin_site: post.data.origin_site,
      link: `/post/${post.data.author}/${post.slug}/`
    }))
  })
}
