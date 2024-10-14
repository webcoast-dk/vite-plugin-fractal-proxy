import { fractal, WebTheme } from 'frctl__fractal'

interface ComponentsOptions {
    path: string
    engine: string
    ext: string
}

interface DocsOptions {
    path: string
    ext: string
}

interface PluginOptions {
    title: string
    components: ComponentsOptions,
    docs: DocsOptions,
    theme: WebTheme,
    fractal: fractal.web.WebServerConfig
    exportDir: string,
    assetsBaseUrl: string
}
