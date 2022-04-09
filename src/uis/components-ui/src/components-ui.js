/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    jTormComponentsUI: {
        id: "jtorm-components-ui",
        alias: "@c",
        framework: "c",
        url: [
            // 'https://gitlab.com/jtorm/jtorm-framework/src/uis/components-ui/src'
        ],
        mapper: {
            init: {
                default: {
                    t: ['@c/init.tss']
                }
            },
            badge: {
                default: {
                    ui: {
                        c: '@e.span',
                        t: 0
                    },
                    t: ['@c/badge/badge-default.tss']
                }
            },
            loading: {
                default: {
                    ui: {
                        c: '@e.div',
                        t: 0
                    },
                    t: ['@c/loading/loading-default.tss']
                }
            },
            grid: {
                init: {
                    t: ['@c/grid/init.tss']
                },
                container: {
                    t: ['@c/grid/container.tss']
                },
                wrapper: {
                    t: ['@c/grid/wrapper.tss']
                },
                grid: {
                    t: ['@c/grid/grid.tss']
                },
                row: {
                    t: ['@c/grid/row.tss']
                },
                cell: {
                    t: ['@c/grid/cell.tss']
                },
                oneColumn: {
                    t: ['@c/grid/1-column.tss']
                },
                twoColumns: {
                    t: ['@c/grid/2-columns.tss']
                },
                threeColumns: {
                    t: ['@c/grid/3-columns.tss']
                },
                fourColumns: {
                    t: ['@c/grid/4-columns.tss']
                },
                twentyEightyColumns: {
                    t: ['@c/grid/20-80-columns.tss']
                }
            },
            search: {
                mini: {
                    t: ['@c/search/search-mini.tss']
                }
            },
            button: {
                primaryButton: {
                    ui: {
                        c: 'form.button'
                    },
                    t: ['@c/button/primary-button.tss']
                },
                secondaryButton: {
                    ui: {
                        c: 'form.button'
                    },
                    t: ['@c/button/secondary-button.tss']
                },
                primaryAnchor: {
                    ui: {
                        c: '@e.a'
                    },
                    t: ['@c/button/primary-anchor.tss']
                },
                secondaryAnchor: {
                    ui: {
                        c: '@e.a'
                    },
                    t: ['@c/button/secondary-anchor.tss']
                }
            },
            user: {
                register: {
                    t: ['@c/user/user-register.tss']
                },
                login: {
                    t: ['@c/user/user-login.tss']
                }
            }
        }
    }
};