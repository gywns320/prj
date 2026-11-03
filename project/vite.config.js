import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// api/ 폴더의 서버 함수(Vercel 이 배포 때 실행하는 파일)를 로컬 개발·미리보기 서버에서도 똑같이 실행해 줍니다.
// 그래서 로컬과 배포가 같은 코드로 동작합니다. (/api/event, /api/visitjeju, /api/chat)
// 비짓제주 키(VISITJEJU_API_KEY)와 Gemini 키(GEMINI_API_KEY)는 .env.local 에서 읽으며 브라우저 번들에는 들어가지 않습니다.
function localApi(env) {
  const mount = (server) => {
    for (const name of ['event', 'visitjeju', 'chat']) {
      server.middlewares.use(`/api/${name}`, async (req, res) => {
        // 값이 있을 때만 대입 (undefined 를 대입하면 문자열 "undefined" 가 들어가 버립니다)
        for (const k of ['VISITJEJU_API_KEY', 'GEMINI_API_KEY', 'GEMINI_MODEL']) {
          if (!process.env[k] && env[k]) process.env[k] = env[k]
        }
        const url = new URL(req.url, 'http://localhost')
        req.query = Object.fromEntries(url.searchParams)
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (body) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)) }
        try {
          const { default: handler } = await import(pathToFileURL(resolve(`api/${name}.js`)).href)
          await handler(req, res)
        } catch (e) {
          res.status(500).json({ error: e.message })
        }
      })
    }
  }
  return { name: 'local-vercel-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // VITE_ 가 없어도 읽기 (서버 쪽에서만 사용)
  return { plugins: [react(), localApi(env)] }
})
