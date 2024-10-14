import path from 'path'
import fractal, {Fractal, fractal as fractalNamespace} from '@frctl/fractal'
import copy from 'recursive-copy'
import fs from 'fs/promises'
import getPort, { portNumbers } from 'get-port'
import mergeWith from 'lodash.mergewith'
import type { Plugin, ResolvedConfig } from 'vite'
import type { PluginOptions } from './PluginOptions.d.ts'

const VitePluginFractalProxy = (options: PluginOptions): Plugin => {
    let resolvedConfig: ResolvedConfig
    let bundles = []
    let fractalInstance: Fractal
    let fractalServer: fractalNamespace.web.Server

    const createFractalInstance = async (options: PluginOptions) => {
        const packageJson = await import(process.cwd() + '/package.json', {assert: {type: 'json'}})
        fractalInstance = fractal.create();
        fractalInstance.set('project.title', options.title || packageJson.name)
        fractalInstance.components.set('path', options.components.path)
        if (fractalInstance.components.engine || null) {
            fractalInstance.components.engine(options.components.engine)
            fractalInstance.components.set('ext', options.components.ext)
        }
        if (options.docs?.path || null) {
            fractalInstance.docs.set('path', options.docs.path)
            if (options.docs.ext) {
                fractalInstance.docs.set('ext', options.components.ext)
            }
        }
        if (options.theme || null) {
            fractalInstance.web.theme('default', options.theme)
        }
    }
    return {
        async config(config, { command, mode }) {
            if (command === 'serve') {
                await createFractalInstance(options)
                const syncPort = await getPort({port: portNumbers(3000, 3010)})
                const port = await getPort({port: portNumbers(syncPort + 1, syncPort + 11)})
                const fractalConfig: fractalNamespace.web.WebServerConfig = mergeWith({
                    sync: true,
                    syncOptions: {
                        ui: false
                    }
                }, options.fractal, {
                    port: port,
                    syncOptions: {
                        port: syncPort
                    }
                })
                fractalServer = fractalInstance.web.server(fractalConfig)
                await fractalServer.start()

                return {
                    server: {
                        proxy: {
                            '^/($|index.html$|components/|docs/|themes/|browser-sync/)': {
                                target: fractalServer.url
                            }
                        }
                    }
                }
            } else if (command === 'build' && mode === 'preview') {
                await createFractalInstance(options)
            }
        },

        configResolved(config: ResolvedConfig) {
            resolvedConfig = config
            if (config.command === 'serve') {
                const root = config.root
                const jsFiles = ['/@vite/client']
                if (typeof config.build.rollupOptions.input === 'string') {
                    jsFiles.push(config.build.rollupOptions.input.replace(root, ''))
                } else if (Array.isArray(config.build.rollupOptions.input)) {
                    for (const file of config.build.rollupOptions.input) {
                        jsFiles.push(file.replace(root, ''))
                    }
                }
                // @ts-ignore
                fractalInstance.components.set('jsFiles', jsFiles)
            }
        },

        generateBundle(options, bundle) {
            if (resolvedConfig.command === 'build' && resolvedConfig.mode === 'preview') {
                for (const bundleId in bundle) {
                    if (Object.hasOwnProperty.call(bundle, bundleId)) {
                        bundles.push(bundle[bundleId])
                    }
                }
            }
        },

        async writeBundle() {
            if (resolvedConfig.command === 'build' && resolvedConfig.mode === 'preview') {
                const jsFiles = []
                const cssFiles = []

                for (const bundle of bundles) {
                    if (bundle.fileName.match(/\.js$/)) {
                        jsFiles.push(resolvedConfig.base + bundle.fileName)
                    } else if (bundle.fileName.match(/\.css$/)) {
                        cssFiles.push(resolvedConfig.base + bundle.fileName)
                    }
                }

                // @ts-ignore
                fractalInstance.components.set('jsFiles', jsFiles)
                // @ts-ignore
                fractalInstance.components.set('cssFiles', cssFiles)

                fractalInstance.web.set('builder.dest', options.exportDir || path.resolve(resolvedConfig.root, 'static'));

                return fractalInstance.web.builder().start().then(() => {
                    console.info('\x1b[32m\u2713 created static export of Fractal\x1b[0m')

                    // @ts-ignore
                    return copy(path.resolve(resolvedConfig.root, resolvedConfig.build.outDir), options.exportDir || path.resolve(resolvedConfig.root, 'static'), {
                        dot: true,
                        expand: true
                    }).then(() => {
                        return fs.rm(path.resolve(resolvedConfig.root, resolvedConfig.build.outDir), {recursive: true})
                    })
                })
            }
        },

        async buildEnd() {
            if (resolvedConfig.command === 'serve' && fractalServer) {
                return new Promise(resolve => {
                    fractalServer.once('stopped', resolve)
                    fractalServer.stop()
                })
            }
        },

        // @ts-ignore
        fractal(): Fractal {
            return fractalInstance
        }
    }
}

export { VitePluginFractalProxy as default, VitePluginFractalProxy }
