declare module 'astro:extends-markdown' {
  export interface frontmatter {
    title: string
    description: string
    author: string
    avatar?: string
    date?: string
    layout: string
    origin_url: string
    origin_site?: string
    translated?: boolean
  }
}
