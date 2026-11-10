import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Emits dist/sw.js from src/pwa/sw.js after the build is written, injecting
// a content-derived version and the list of files to precache. The version is
// a hash of the precache list plus the contents of the non-hashed shell files
// and the SW template, so an unchanged build yields an identical sw.js (no
// spurious "New version available" prompt) and any real change bumps it.
function pwaServiceWorker() {
  let outDir = 'dist'
  return {
    name: 'solarflow-pwa-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    writeBundle() {
      const template = readFileSync(resolve('src/pwa/sw.js'), 'utf8')
      const shell = ['index.html', 'offline.html', 'manifest.webmanifest'].filter((f) => existsSync(join(outDir, f)))
      const listDir = (dir) =>
        existsSync(join(outDir, dir))
          ? readdirSync(join(outDir, dir), { recursive: true })
              .map((f) => `${dir}/${String(f).split('\\').join('/')}`)
              .filter((f) => statSync(join(outDir, f)).isFile() && !f.endsWith('.map'))
              .sort()
          : []
      const icons = listDir('icons')
      // Only the chunks index.html loads up front (entry JS/CSS + modulepreloads).
      // Lazy chunks (PDF, scanner, charts...) are cached the first time they are
      // used, so a deploy doesn't make every phone re-download ~4 MB.
      const indexHtml = existsSync(join(outDir, 'index.html')) ? readFileSync(join(outDir, 'index.html'), 'utf8') : ''
      const entry = new Set([...indexHtml.matchAll(/(?:\.\/|\/)?(assets\/[^"'?#\s]+)/g)].map((m) => m[1]))
      const assets = listDir('assets').filter((f) => entry.has(f))
      const files = [...shell, ...icons, ...(existsSync(join(outDir, 'apple-touch-icon.png')) ? ['apple-touch-icon.png'] : []), ...assets]

      const hash = createHash('sha256').update(template)
      for (const f of files) {
        hash.update(f)
        // Hashed assets already carry their content hash in the name.
        if (!f.startsWith('assets/')) hash.update(readFileSync(join(outDir, f)))
      }
      const version = hash.digest('hex').slice(0, 12)
      const precache = ['./', ...files.map((f) => `./${f}`)]

      const sw = template
        .replace("'__SW_VERSION__'", JSON.stringify(version))
        .replace('/* __PRECACHE_LIST__ */ []', JSON.stringify(precache, null, 2))
      if (sw.includes('__SW_VERSION__') || sw.includes('__PRECACHE_LIST__')) {
        throw new Error('pwaServiceWorker: placeholders not replaced in src/pwa/sw.js')
      }
      writeFileSync(join(outDir, 'sw.js'), sw)
      const kb = files.reduce((n, f) => n + statSync(join(outDir, f)).size, 0) / 1024
      console.log(`[pwa] dist/sw.js version ${version}: ${precache.length} precache entries, ${kb.toFixed(0)} KB`)
    },
  }
}

// A dedicated origin keeps original-project browser sessions and caches separate.
export default defineConfig({
  plugins: [react(), pwaServiceWorker()],
  server: { host: '127.0.0.1', port: 5186, strictPort: true },
  preview: { host: '127.0.0.1', port: 4186, strictPort: true },
  base: './',
  define: { __BUILD_ID__: JSON.stringify('dev') },
})
