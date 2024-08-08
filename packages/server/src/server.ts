import { Application, Router } from '$oak'
import { resolve } from 'node:path'

const app = new Application()

const router = new Router()

router.post('/create', async (ctx) => {
  let status = 200
  try {
    const { path, content } = await ctx.request.body.json()
    const filePath = resolve(import.meta.dirname!, '../../../', path)
    Deno.writeTextFileSync(filePath, content)
  } catch (e) {
    status = 400
  }

  ctx.response.body = { status }
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
