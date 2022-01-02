/*! (c) jTorm and other contributors | www.jtorm.com/license */
(function (r, f) {
    if (typeof define === "function" && define.amd)
        define(["exports"], f);
    else if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string')
        f(exports);
    else
        f(r);
}(typeof self !== 'undefined' ? self : this, function (e) {
    e.jTormHtmlPrototype = {
        tssConfig: {},
        id: "jtorm-html-prototype",
        alias: "@hp",
        framework: "hp",
        mapper: {
            breadcrumbs: {
                default: {
                    ui: {
                        c: '@e.nav',
                        t: 0
                    },
                    t: ['@hp/breadcrumbs/breadcrumbs.tss']
                }
            },
            init: {
                default: {
                    t: ['@hp/init.tss']
                }
            },
            badge: {
                default: {
                    ui: {
                        c: '@e.span',
                        t: 0
                    },
                    t: ['@hp/badge/badge-default.tss']
                }
            },
            list: {
                ul: {
                    ui: {
                        c: '@t.ul',
                        t: 0
                    },
                    t: ['@hp/list/ul.tss']
                },
                ol: {
                    t: ['@hp/list/ol.tss']
                }
            },
            menu: {
                list: {
                    t: ['@hp/menu/list.tss']
                }
            },
            WPHeader: {
                default: {
                    ui: {
                        f: 'schema',
                        c: 'WPHeader'
                    },
                    t: ['@hp/header/header-default.tss']
                }
            },
            loading: {
                default: {
                    ui: {
                        c: '@e.div',
                        t: 0
                    },
                    t: ['@hp/loading/loading-default.tss']
                }
            },
            main: {
                default: {
                    ui: {
                        c: '@e.main',
                        t: 0
                    },
                    t: ['@hp/main/main-default.tss']
                }
            },
            WPFooter: {
                default: {
                    ui: {
                        f: 'schema',
                        c: 'WPFooter'
                    },
                    t: ['@hp/footer/footer-default.tss']
                }
            },
            grid: {
                container: {
                    t: ['@hp/grid/container.tss']
                },
                wrapper: {
                    t: ['@hp/grid/wrapper.tss']
                },
                grid: {
                    t: ['@hp/grid/grid.tss']
                },
                row: {
                    t: ['@hp/grid/row.tss']
                },
                oneColumn: {
                    t: ['@hp/grid/1-column.tss']
                },
                twoColumns: {
                    t: ['@hp/grid/2-columns.tss']
                },
                threeColumns: {
                    t: ['@hp/grid/3-columns.tss']
                },
                fourColumns: {
                    t: ['@hp/grid/4-columns.tss']
                },
                twentyEightyColumns: {
                    t: ['@hp/grid/20-80-columns.tss']
                }
            },
            search: {
                mini: {
                    t: ['@hp/search/search-mini.tss']
                }
            },
            button: {
                primaryButton: {
                    ui: {
                        c: 'form.button'
                    },
                    t: ['@hp/button/primary-button.tss']
                },
                secondaryButton: {
                    ui: {
                        c: 'form.button'
                    },
                    t: ['@hp/button/secondary-button.tss']
                },
                primaryAnchor: {
                    ui: {
                        c: '@e.a'
                    },
                    t: ['@hp/button/primary-anchor.tss']
                },
                secondaryAnchor: {
                    ui: {
                        c: '@e.a'
                    },
                    t: ['@hp/button/secondary-anchor.tss']
                }
            },
            user: {
                register: {
                    t: ['@hp/user/user-register.tss']
                },
                login: {
                    t: ['@hp/user/user-login.tss']
                }
            }
        },
        handlers: [],
        handle: function (t, r) {
            var s = this;
            return new Promise(async function (resolve, reject) {
                try {
                    for (var h of s.handlers)
                        r = await h.handle(t, r);
                    return resolve(r);
                } catch (err) {
                    return reject(false);
                }
            });
        }
    };
    return e.jTormHtmlPrototype;
})); 