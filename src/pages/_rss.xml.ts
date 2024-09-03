import rss from '@astrojs/rss'
import { SITETITLE, SITEDESCRIPTION } from 'astro:env/client'
import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'
import { allCollectionsEntries } from '@/content/config'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

export async function GET(context: APIContext) {
  const allCollectionPosts = await Promise.all(
    allCollectionsEntries.map((collection) => getCollection(collection))
  )
  return rss({
    title: SITETITLE,
    description: SITEDESCRIPTION,
    site: context.site!,
    items: allCollectionPosts
      .flat()
      .filter((v) => v.data.title)
      .map((post) => {
        return {
          title: post.data.title,
          pubDate: dayjs(post.data.date).toDate(),
          description: post.data.description,
          link: `/post/${post.data.author}/${post.slug}/`
        }
      })
  })
}
