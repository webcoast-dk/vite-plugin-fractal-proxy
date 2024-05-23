import path from 'path'
import fractal from '@frctl/fractal'
import copy from 'recursive-copy'
import fs from 'fs/promises'

let fractalInstance
let fractalServer

/**
 * @param options {PluginOptions}
 * @returns {{config(*, {command: *}): (*|undefined)}|any}
 * @constructor
 */
const ViteFractalProxyPlugin = (options) => {
    let resolvedConfig
    let bundles = []

    /**
     * @param options {PluginOptions}
     */
    const createFractalInstance = async (options) => {
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
            if (fractalInstance.docs.engine || null) {
                fractalInstance.docs.engine(options.components.engine)
                fractalInstance.docs.set('ext', options.components.ext)
            }
        }
    }
    return {
        async config(config, { command, mode }) {
            if (command === 'serve') {
                if (!fractalInstance) {
                    await createFractalInstance(options)
                }

                return (new Promise(resolve => {
                    if (!fractalServer || !fractalServer.isListening) {
                        fractalServer = fractalInstance.web.server({
                            sync: true
                        })
                        fractalServer.on('error', err => {
                            fractalInstance.cli.console.error(err)
                        })
                        return fractalServer.start().then(resolve)
                    }

                    resolve()
                })).then(() => {
                    return {
                        server: {
                            proxy: {
                                '^/($|index.html$|components/|docs/|themes/|browser-sync/)': {
                                    target: fractalServer.url
                                }
                            }

                        }
                    }
                })
            } else if (command === 'build' && mode === 'preview') {
                await createFractalInstance(options)
            }
        },

        configResolved(config) {
            resolvedConfig = config
            if (config.command === 'serve') {
                const root = config.root
                const jsFiles = ['/@vite/client']
                if (typeof config.build.rollupOptions.input === 'string') {
                    jsFiles.push(config.build.rollupOptions.input.replace(root, ''))
                } else {
                    for (const file of config.build.rollupOptions.input) {
                        jsFiles.push(file.replace(root, ''))
                    }
                }
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

                fractalInstance.components.set('jsFiles', jsFiles)
                fractalInstance.components.set('cssFiles', cssFiles)

                fractalInstance.web.set('builder.dest', options.exportDir || path.resolve(resolvedConfig.root, 'static'));

                return fractalInstance.web.builder().build().then(() => {
                    console.info('\x1b[32m\u2713 created static export of Fractal\x1b[0m')

                    return copy(path.resolve(resolvedConfig.root, resolvedConfig.build.outDir), options.exportDir || path.resolve(resolvedConfig.root, 'static'), {
                        dot: true,
                        expand: true
                    }).then(() => {
                        return fs.rm(path.resolve(resolvedConfig.root, resolvedConfig.build.outDir), {recursive: true})
                    })
                })
            }
        },

        fractal() {
            return fractalInstance
        }
    }
}

export default ViteFractalProxyPlugin
