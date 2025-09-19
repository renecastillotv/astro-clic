// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind()],
   output: 'server', // o 'static' si prefieres generación estática

 //output: 'static',
    site: 'https://clicinmobiliaria.com',
});




