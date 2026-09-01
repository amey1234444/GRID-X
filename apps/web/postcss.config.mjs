import { fileURLToPath } from 'node:url';

/*
 * `new URL(...).pathname` returns a URL path, not a filesystem path. On Windows
 * that is "/G:/repo/apps/web/tailwind.config.ts" — the leading slash makes it
 * unresolvable, Tailwind silently loads no config, and the build dies with
 * "Cannot read properties of undefined (reading 'blocklist')". It only worked
 * because CI runs on Linux, where the two forms happen to coincide.
 *
 * fileURLToPath does the conversion properly on every platform.
 */
const tailwindConfig = fileURLToPath(new URL('./tailwind.config.ts', import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: tailwindConfig },
    autoprefixer: {},
  },
};
