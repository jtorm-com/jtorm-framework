/*! (c) jTorm and other contributors | www.jtorm.com/license */

module.exports = {
    jTormComponentsUI: {
        id: "jtorm/components-ui-0.0.4/src",
        alias: "@c",
        framework: "components",
        url: "http://localhost:4001/",
        mapper: {
            hero: {
                default: {
                    t: ['@c/hero/hero-default.tss']
                }
            },
            contents: {
                default: {
                    t: ['@c/contents/contents-default.tss']
                }
            },
            head: {
                default: {
                    t: ['@c/head/head-default.tss']
                },
                id: {
                    t: ['@c/head/head-id.tss']
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
                    t: ['@c/button/primary-button.tss']
                },
                secondaryButton: {
                    t: ['@c/button/secondary-button.tss']
                },
                primaryAnchor: {
                    t: ['@c/button/primary-anchor.tss']
                },
                secondaryAnchor: {
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