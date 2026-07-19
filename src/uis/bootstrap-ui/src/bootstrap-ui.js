/*! (c) jTorm and other contributors | www.jtorm.com/license */

module.exports = {
    jTormBootstrapUI: {
        id: "jtorm/bootstrap-ui-0.1.0/src",
        alias: "@b",
        framework: "bootstrap",
        url: "http://localhost:4001/",
        mapper: {
            button: {
                default: {
                    t: ['@c/button/button-default.tss', '@b/button/button.tss']
                },
                primary: {
                    t: ['@c/button/button-primary.tss', '@b/button/button.tss']
                },
                secondary: {
                    t: ['@c/button/button-secondary.tss', '@b/button/button.tss']
                },
                destructive: {
                    t: ['@c/button/button-destructive.tss', '@b/button/button.tss']
                }
            },
            badge: {
                default: {
                    t: ['@c/badge/badge-default.tss', '@b/badge/badge.tss']
                }
            },
            alert: {
                default: {
                    t: ['@c/alert/alert-default.tss', '@b/alert/alert.tss']
                },
                info: {
                    t: ['@c/alert/alert-info.tss', '@b/alert/alert.tss']
                },
                success: {
                    t: ['@c/alert/alert-success.tss', '@b/alert/alert.tss']
                },
                warning: {
                    t: ['@c/alert/alert-warning.tss', '@b/alert/alert.tss']
                },
                error: {
                    t: ['@c/alert/alert-error.tss', '@b/alert/alert.tss']
                }
            },
            card: {
                default: {
                    t: ['@c/card/card-default.tss', '@b/card/card.tss']
                }
            },
            accordion: {
                default: {
                    t: ['@c/accordion/accordion-default.tss', '@b/accordion/accordion.tss']
                },
                item: {
                    t: ['@c/accordion/accordion-item.tss', '@b/accordion/accordion-item.tss']
                }
            },
            loading: {
                default: {
                    t: ['@c/loading/loading-default.tss', '@b/loading/loading.tss']
                }
            }
        }
    }
};
