# Vite Plugin Fractal Proxy

This plugin enables you to use [Fractal](https://fractal.build/) with Vite.

## Installation

```bash
npm install --save-dev vite-plugin-fractal-proxy
```

## Usage
Create a `vite.config.js` file in the root of your project and add the following:

```javascript
import { defineConfig } from 'vite';
import nunjucks from '@frctl/nunjucks'
import mandelbrot from '@frctl/mandelbrot'
import VitePluginFractalProxy from '@webcoast/vite-plugin-fractal-proxy'

export default defineConfig({
    plugins: [
        VitePluginFractalProxy({
            title: 'My Fractal Project', // Title of your Fractal project
            components: {
                // Components config
                path: path.resolve(__dirname, 'src', 'components'), // Path to your components
                engine: nunjucks({
                    // Nunjucks config
                }),
                ext: '.njk' // File extension of your components
            },
            docs: {
                path: path.resolve(__dirname, 'src', 'docs'), // Path to your docs
                ext: '.md' // File extension of your docs
            },
            theme: mandelbrot({
                // Mandelbrot theme config
            }),
            fractal: {
                // Fractal web server configuration
                syncOptions: {
                    // BrowserSync options
                    files: [
                        './src'
                    ],
                    watchOptions: {
                        ignored: [
                            // Ignore changed to scss, js, ts and svg files, so the browser does not reload on those changes
                            '**/*.scss',
                            '**/*.js',
                            '**/*.ts',
                            '**/*.svg'
                        ]
                    }
                }
            }
        })
    ]
});
