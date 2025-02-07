import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Минимальная конфигурация Vite для React и TypeScript
export default defineConfig({
    plugins: [react()]
})