import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {buildMetaContentSecurityPolicy} from './shared/security/csp.ts';

/**
 * Inject a CSP meta tag into the HTML document itself. The Electron main
 * process also sends the same policy as a response header; the meta tag keeps
 * the policy in force for packaged `file://` loads even if a platform does not
 * surface file requests through webRequest.
 */
function cspMetaPlugin(): Plugin {
  return {
    name: 'refx-csp-meta',
    transformIndexHtml(html, context) {
      const policy = buildMetaContentSecurityPolicy({isDev: Boolean(context.server)});
      const attribute = policy.replace(/"/g, '&quot;');
      const meta = `    <meta http-equiv="Content-Security-Policy" content="${attribute}" />\n`;
      // CSP must appear before scripts, but preferably after the charset so the
      // byte-order mark/encoding declaration wins its usual first-in-document spot.
      if (/<meta\s+charset=/i.test(html)) {
        return html.replace(/(<meta\s+charset[^>]*>)/i, `$1\n${meta}`);
      }
      return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n${meta}`);
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [cspMetaPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        'shared': path.resolve(import.meta.dirname, 'shared'),
        '@shared': path.resolve(import.meta.dirname, 'shared'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
