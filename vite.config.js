import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Tiny HTML partial include: <!-- @include partials/hero.html -->
function htmlIncludes() {
  const re = /<!--\s*@include\s+([\w./-]+)\s*-->/g;
  return {
    name: 'html-includes',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(re, (_, file) => {
          const p = path.resolve(process.cwd(), file);
          return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `<!-- missing ${file} -->`;
        });
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, '/').includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({ plugins: [htmlIncludes()] });
