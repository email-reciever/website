import { Application, Router } from '$oak'
import { resolve } from 'node:path'
import '$dotenvload'
import { batchUpdate } from './router/batchUpdate.ts'
import { translate } from './router/translate.ts'

const app = new Application()

const router = new Router()

router.post('/create', async (ctx) => {
  let status = 200
  try {
    const { path, content } = await ctx.request.body.json()
    const filePath = resolve(import.meta.dirname!, '../../../', path)
    console.log(filePath)
    Deno.writeTextFileSync(filePath, content)
  } catch (e) {
    status = 400
  }

  ctx.response.body = { status }
})

router.post('/read', async (ctx) => {
  let status = 200
  let response: Record<string, unknown> = {}

  try {
    const { fileName } = await ctx.request.body.json()
    const filePath = resolve(import.meta.dirname!, '../../../', fileName)
    const content = Deno.readTextFileSync(filePath)
    response = { content }
  } catch (e) {
    status = 400
  }

  ctx.response.body = { status, ...response }
})

router.post('/batch-update/:type', batchUpdate)
router.post('/translate', translate)

router.get('/', (ctx) => {
  ctx.response.redirect('https://email-reciever.pages.dev/')
})

// Logger
app.use(async (ctx, next) => {
  await next()
  const rt = ctx.response.headers.get('X-Response-Time')
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`)
})

// Timing
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.response.headers.set('X-Response-Time', `${ms}ms`)
})

app.use(router.routes())
app.use(router.allowedMethods())

app.addEventListener('listen', ({ hostname, port, secure }) => {
  console.log(
    `Listening on: ${secure ? 'https://' : 'http://'}${
      hostname ?? 'localhost'
    }:${port}`
  )
})

await app.listen({ port: 10856 })
