import { translate as ggta } from '$ggta'
import { HttpProxyAgent } from '$hpa'
import type { RouterMiddleware } from '$oak'
import { load } from '$ci'

const fpSite = 'https://free-proxy-list.net'
const fallbackIP = 'http://50.217.226.44:80'

const defaultOptions = {
  from: 'en',
  to: 'zh'
}

async function getAgent() {
  let ip = fallbackIP
  try {
    const html = await fetch(fpSite).then((response) => response.text())
    const $ = load(html)
    const matchIp = $('table.table-striped > tbody > tr').filter(
      (_index, item) => {
        return ['US', 'anonymous'].every((v) => $(item).text().includes(v))
      }
    )
    if (matchIp.length) {
      ip = $(matchIp.get(0)!)
        .children('td')
        .slice(0, 2)
        .map((_index, child) => $(child).text())
        .get()
        .join(':')
      ip = `${ip.endsWith('443') ? 'https' : 'http'}://${ip}`
    }
  } catch (e) {
    console.log('get agent failed')
  }

  console.log('translate ip', ip)
  return new HttpProxyAgent(ip)
}

export const translate: RouterMiddleware<'/translate'> = async (ctx) => {
  let { content: translateContent } = await ctx.request.body.json()
  const agent = await getAgent()
  try {
    const { text } = await ggta(translateContent!, {
      ...defaultOptions,
      fetchOptions: {
        agent
      }
    })
    translateContent = text
  } catch (e) {
    console.log('translate error', e)
  }

  ctx.response.body = {
    translateContent
  }
}
