const path = require('path')
/**
 * @param options {PluginOptions}
 * @returns {{config(*, {command: *}): (*|undefined)}|any}
 * @constructor
 */
const ViteFractalProxyPlugin = (options) => {
    let fractal
    let resolvedConfig
    let bundles = []

    /**
     * @param options {PluginOptions}
     */
    const createFractalInstance = (options) => {
        const packageJson = require(process.cwd() + '/package.json')
        fractal = require('@frctl/fractal').create();
        fractal.set('project.title', options.title || packageJson.name)
        fractal.components.set('path', options.components.path)
        if (fractal.components.engine || null) {
            fractal.components.engine(options.components.engine)
            fractal.components.set('ext', options.components.ext)
        }
        if (options.docs?.path || null) {
            fractal.docs.set('path', options.docs.path)
            if (fractal.docs.engine || null) {
                fractal.docs.engine(options.components.engine)
                fractal.docs.set('ext', options.components.ext)
            }
        }
    }
    return {
        config(config, { command, mode }) {
            if (command === 'serve') {
                createFractalInstance(options)
                const server = fractal.web.server({
                    sync: true
                })
                server.on('error', err => {
                    fractal.cli.console.error(err)
                })
                return server.start().then(() => {
                    return {
                        server: {
                            proxy: {
                                '^/($|index.html$|components/|docs/|themes/|browser-sync/)': {
                                    target: server.url
                                }
                            }

                        }
                    }
                })
            } else if (command === 'build' && mode === 'preview') {
                createFractalInstance(options)
            }
        },

        configResolved(config) {
            resolvedConfig = config
            if (config.command === 'serve') {
                const root = config.root
                const jsFiles = [
                    {
                        url: '/@vite/client',
                        type: 'module'
                    }
                ]
                if (typeof config.build.rollupOptions.input === 'string') {
                    jsFiles.push({
                        url: config.build.rollupOptions.input.replace(root, ''),
                        type: 'module'
                    })
                } else {
                    for (const file of config.build.rollupOptions.input) {
                        jsFiles.push({
                            url: file.replace(root, ''),
                            type: 'module'
                        })
                    }
                }
                fractal.components.set('jsFiles', jsFiles)
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

        writeBundle() {
            if (resolvedConfig.command === 'build' && resolvedConfig.mode === 'preview') {
                const jsFiles = []
                const cssFiles = []
                const packageJson = require(process.cwd() + '/package.json')
                const packageType = packageJson.type || 'commonjs'
                const mjsExt = packageType === 'module' ? 'js' : 'mjs'
                const cjsExt = packageType === 'commonjs' ? 'js' : 'cjs'
                const hasModule = resolvedConfig.build.lib.formats.includes('es')
                const mjsRegex = new RegExp(`\\.${mjsExt}$`)
                const cjsRegex = new RegExp(`\\.${cjsExt}$`)

                for (const bundle of bundles) {
                    if (mjsRegex.test(bundle.fileName)) {
                        jsFiles.push({
                            url: '/' + bundle.fileName,
                            type: 'module'
                        })
                    } else if (cjsRegex.test(bundle.fileName)) {
                        if (hasModule) {
                            jsFiles.push({
                                url: '/' + bundle.fileName,
                                nomodule: true
                            })
                        } else {
                            jsFiles.push({
                                url: '/' + bundle.fileName
                            })
                        }
                    } else if (bundle.fileName.match(/\.css$/)) {
                        cssFiles.push({
                            url: '/' + bundle.fileName
                        })
                    }
                }

                fractal.components.set('jsFiles', jsFiles)
                fractal.components.set('cssFiles', cssFiles)

                fractal.web.set('builder.dest', options.exportDir || path.resolve(resolvedConfig.root, 'static'));

                return fractal.web.builder().build().then(() => {
                    console.info('Fractal has been exported as static HTML')
                })
            }
        }
    }
}

module.exports = ViteFractalProxyPlugin
