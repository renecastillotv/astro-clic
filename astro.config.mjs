// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless'; // 👈 ESTE ES CLAVE

export default defineConfig({
    integrations: [tailwind()],
    output: 'server',
    adapter: vercel(), // 👈 AGREGA EL ADAPTER
    site: 'https://clicinmobiliaria.com',
});
