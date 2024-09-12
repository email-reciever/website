import { type RouterMiddleware } from '$oak'
import {
  WebhookClient,
  EmbedBuilder,
  ActionRowBuilder,
  type WebhookMessageCreateOptions
} from '$discord'
import { fromMarkdown } from 'https://esm.sh/mdast-util-from-markdown'
import { find, type Node } from 'https://esm.sh/unist-util-find'
import { gfmTableFromMarkdown } from 'https://esm.sh/mdast-util-gfm-table'
import { gfmTable } from 'https://esm.sh/micromark-extension-gfm-table'
import { Octokit } from '$gh'

type AnyObject = Record<string, any>

type NodeChildren = Node & {
  value: string
  url: string
  children: NodeChildren[]
}

const issuePrefix = 'ti:'

const allowedActions = ['labeled', 'edited']

const gh = new Octokit({
  auth: Deno.env.get('REPO_TOKEN')
})

export function findImage(commentBody: string) {
  const mdast = fromMarkdown(commentBody)
  const imageNode = find<NodeChildren>(mdast, (node) => node.type === 'image')
  return (
    imageNode?.url ??
    'https://api.iconify.design/uim:circle-layer.svg?color=%23c084fc'
  )
}

export function fromMDInfo(body: string) {
  const mdast = fromMarkdown(body, {
    extensions: [gfmTable()],
    mdastExtensions: [gfmTableFromMarkdown()]
  })
  const tableNode = find<NodeChildren>(mdast, (node) => node.type === 'table')
  if (tableNode && tableNode.children?.length > 1) {
    return tableNode.children.reduce((info, { children }) => {
      const cells = children.map((v) =>
        find<NodeChildren>(
          v,
          (node) => node.type === 'text' || node.type === 'link'
        )
      )
      return {
        ...(info ?? {}),
        ...Object.fromEntries(
          cells.length ? [cells.map((v) => v?.value || v?.url)] : []
        )
      }
    })
  }
}

export const discord: RouterMiddleware<'/discord'> = async (ctx) => {
  const { action, sender, issue, repository } =
    (await ctx.request.body.json()) as AnyObject
  const wbc = new WebhookClient({
    id: Deno.env.get('DISCORD_WEBHOOK_ID')!,
    token: Deno.env.get('DISCORD_WEBHOOK_TOKEN')!
  })

  if (
    sender?.login === Deno.env.get('ISSUE_USER') &&
    issue &&
    allowedActions.includes(action)
  ) {
    const { url, title, labels = [], body = '', created_at, number } = issue
    const repoInfo = {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: number
    }
    const issueInfo = {
      ...repoInfo,
      issue_number: number
    }
    // search image from comment info
    const { data: comments } = await gh.rest.issues.listComments(issueInfo)
    const image = findImage(comments?.[0]?.body ?? '')
    const blogInfo = fromMDInfo(body) as AnyObject
    const withoutTIDLabels =
      (labels as AnyObject[])?.filter?.(
        (v) => !v.name.startsWith(issuePrefix)
      ) ?? []
    const embed = new EmbedBuilder({
      title,
      color: 0x0099ff,
      url,
      thumbnail: {
        url: image
      },
      image: {
        url: image
      },
      author: {
        name: blogInfo?.author ?? 'see blog',
        icon_url:
          'https://email-reciever.pages.dev/media-source/email-reciever.svg'
      },
      timestamp: created_at,
      footer: {
        icon_url: sender.avatar_url,
        text: `power by ${sender.login}`
      },
      fields: withoutTIDLabels.map?.(({ name }) => ({
        name,
        value: `#${name}`,
        inline: true
      }))
    })

    const actionRow = new ActionRowBuilder({
      components: withoutTIDLabels?.map?.((v) => ({
        label: `#${v.name}`,
        type: 2,
        style: 5,
        url: `https://github.com/${repoInfo.owner}/${
          repoInfo.repo
        }/labels/${encodeURIComponent(v.name)}`
      }))
    })
    // find tr:id
    const threadId = (labels as AnyObject[]).find((v) =>
      v.name.startsWith(issuePrefix)
    )?.name

    const messagePayload: WebhookMessageCreateOptions = {
      embeds: [embed]
    }

    if (withoutTIDLabels?.length) {
      messagePayload.components = [actionRow]
    }

    // if labeled. find tag prefix with  ti:thread_id (the first label must be ti:)
    if (action === 'labeled' && labels.length > 1) {
      if (threadId) {
        const snowflake = threadId.replace(issuePrefix, '')
        // fetch preview message
        const editMessage = await wbc.fetchMessage(snowflake)
        await wbc.editMessage(editMessage, messagePayload)
      }
    }
    // else create message and create
    else if (action === 'edited' && comments.length && !threadId) {
      const response = await wbc.send(messagePayload)
      if (response?.id) {
        const labelName = `${issuePrefix}${response.id}`
        // create message label
        await gh.rest.issues.createLabel({
          ...repoInfo,
          name: labelName
        })
        const addonLabels = [
          labelName,
          ...(labels as AnyObject[])?.map?.((v) => v.name)
        ]
        await gh.rest.issues.addLabels({
          ...issueInfo,
          labels: addonLabels
        })
      }
    }
  }

  ctx.response.body = {
    success: true
  }
}
