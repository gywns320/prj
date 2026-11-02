import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 제주in놀다 API 는 CORS 헤더가 없어 브라우저에서 직접 부를 수 없습니다.
// 개발·미리보기 서버가 /api/event 를 대신 호출해 줍니다. (배포 시에는 vercel.json 의 rewrites 가 같은 역할)
const proxy = {
  '/api/event': {
    target: 'https://www.jejunolda.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/event\/?/, '/api/event/'),
  },
}

// 비짓제주 API 는 키가 필요해서 서버 함수(api/visitjeju.js)가 호출합니다.
// 배포(Vercel)에서는 Vercel 이 그 함수를 실행하고, 로컬에서는 아래 플러그인이 같은 파일을 그대로 실행합니다.
// 키는 .env.local 의 VISITJEJU_API_KEY 에서 읽으며 브라우저 번들에는 들어가지 않습니다.
function localApi(env) {
  const mount = (server) => {
    server.middlewares.use('/api/visitjeju', async (req, res) => {
      // 값이 있을 때만 대입 (undefined 를 대입하면 문자열 "undefined" 가 들어가 버립니다)
      if (!process.env.VISITJEJU_API_KEY && env.VISITJEJU_API_KEY) process.env.VISITJEJU_API_KEY = env.VISITJEJU_API_KEY
      const url = new URL(req.url, 'http://localhost')
      req.query = Object.fromEntries(url.searchParams)
      res.status = (code) => { res.statusCode = code; return res }
      res.json = (body) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)) }
      try {
        const { default: handler } = await import(pathToFileURL(resolve('api/visitjeju.js')).href)
        await handler(req, res)
      } catch (e) {
        res.status(500).json({ error: e.message })
      }
    })
  }
  return { name: 'local-vercel-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // VITE_ 가 없어도 읽기 (서버 쪽에서만 사용)
  return {
    plugins: [react(), localApi(env)],
    server: { proxy },
    preview: { proxy },
  }
})
