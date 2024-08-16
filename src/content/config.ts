import { WHITELISTS } from '@email.reciever/consts/white-lists'
import { defineCollection, z } from 'astro:content'

export type Collections = Lowercase<keyof typeof WHITELISTS>

export const allCollectionsEntries = Object.keys(WHITELISTS).map((v) =>
  v.toLocaleLowerCase()
) as Collections[]

const collectionSchema = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().optional(),
    avatar: z.string().optional(),
    subAuthor: z.string().optional(),
    date: z.string(),
    layout: z.string().optional(),
    origin_url: z.string().optional(),
    email_recorder: z.string().optional(),
    origin_site: z.string().optional(),
    translated: z.boolean().optional(),
    banner: z.string().optional()
  })
})

export const collections = allCollectionsEntries.reduce(
  (reduceCollect, collect) => ({
    ...reduceCollect,
    [collect]: collectionSchema
  }),
  {} as Record<Collections, typeof collectionSchema>
)
