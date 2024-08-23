import type { RouterMiddleware } from '$oak'
import pm from '$pm'
import chunk from '$chunk'
import { resolve } from 'node:path'

function delay(time = 1000) {
  return new Promise((r) => {
    setTimeout(r, time)
  })
}

export const batchUpdate: RouterMiddleware<
  '/batch-update' | '/batch-update/:type'
> = async (ctx) => {
  const type = ctx.params.type
  try {
    const dirName = resolve(
      import.meta.dirname!,
      '../../../../',
      'batch',
      type!
    )
    const updateQueue: Record<string, unknown>[] = []
    for (const entry of Deno.readDirSync(dirName)) {
      const { name, isFile } = entry
      if (isFile) {
        const fileName = resolve(dirName, name)
        const { headers, date, html, text, subject } = await pm.parse(
          Deno.readFileSync(fileName)
        )
        const payload = {
          md: text,
          type,
          html,
          title: subject,
          date,
          headers
        }
        try {
          const response = await fetch(Deno.env.get('WORKER')!, {
            method: 'POST',
            body: JSON.stringify(payload)
          }).then((response) => response.json())

          if (response.translated) {
            Deno.removeSync(fileName)
            updateQueue.push({
              name,
              response
            })
            await delay()
            console.log(`${name} create success`)
          }
        } catch (e) {}
      }
    }

    ctx.response.body = {
      updateQueue,
      count: updateQueue.length,
      names: updateQueue.map((v) => v.name)
    }
  } catch (e) {}
}
