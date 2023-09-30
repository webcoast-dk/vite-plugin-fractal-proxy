interface ComponentsOptions {
    path: string
    engine: string
    ext: string
}

interface DocsOptions {
    path: string
    engine: string
    ext: string
}

interface PluginOptions {
    title: string
    components: ComponentsOptions,
    docs: DocsOptions,
    exportDir: string,
    assetsBaseUrl: string
}
