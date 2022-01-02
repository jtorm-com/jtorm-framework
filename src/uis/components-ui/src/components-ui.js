/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    jTormComponentsUI: {
        id: "jtorm-components-ui",
        alias: "@c",
        framework: "c",
        url: '',// CDN
        mapper: {
            init: {
                default: {
                    t: ['@c/init.tss']
                }
            },
//      breadcrumbs: {// =schema
//        default: {
//          ui: {
//            c: '@e.nav',
//            t: 0
//          },
//          t: ['@c/breadcrumbs/breadcrumbs-default.tss']
//        }
//      },
            badge: {
                default: {
                    ui: {
                        c: '@e.span',
                        t: 0
                    },
                    t: ['@c/badge/badge-default.tss']
                }
            },
//      list: {=schema itemList
//        ul: {
//          ui: {
//            c: '@t.ul',
//            t: 0
//          },
//          t: ['@c/list/ul.tss']
//        },
//        ol: {
//          t: ['@c/list/ol.tss']
//        }
//      },
//      menu: {
//        list: {
//          t: ['@c/menu/list.tss']
//        }
//      },
            WPHeader: {// is prototype
                default: {
                    ui: {
                        f: 'schema',
                        c: 'WPHeader'
                    },
                    t: ['@c/header/header-default.tss']
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
            // main: {
            //   default: {
            //     ui: {
            //       c: '@e.main',
            //       t: 0
            //     },
            //     t: ['@c/main/main-default.tss']
            //   }
            // },
            WPFooter: {
                default: {
                    ui: {
                        f: 'schema',
                        c: 'WPFooter'
                    },
                    t: ['@c/footer/footer-default.tss']
                }
            },
            grid: {
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
                "columns": {

                },
                twentyEightyColumns: {
                    t: ['@c/grid/20-80-columns.tss']
                }
            },

            /* dit moet via schema
            media: {
                figure: {
                    ui: {
                        c: '@m.figure'
                    },
                    t: ['@c/media/figure-default.tss']
                },

                picture: {
                    ui: {
                        c: '@m.picture'
                    },
                    t: ['@c/media/picture-default.tss']
                }
            },*/

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