/*! (c) jTorm and other contributors | www.jtorm.com/license */

module.exports = {
    jTormSchemaUi: {
        id: "jtorm/schema-ui-0.0.4/src",
        alias: "@s",
        framework: "schema",
        url: "https://cdn.jtorm.com/",
        mapperAlias: {
        },
        mapper: {
            Text: {
                default: {
                    t: ['@s/text/text-default.tss']
                }
            },
            URL: {
                default: {
                    t: ['@s/url/url-default.tss']
                }
            },
            Comment: {
                default: {
                    t: ['@s/comment/comment-default.tss']
                },
                link: {
                    t: ['@s/comment/comment-link.tss']
                }
            },
            SiteNavigationElement: {
                default: {
                    t: [
                        '@s/site-navigation-element/site-navigation-element-default.tss'
                    ]
                },
                boxed: {
                    ui: {
                        c: 'SiteNavigationElement.default',
                        m: '1'
                    },
                    t: ['@s/site-navigation-element/site-navigation-element-boxed.tss']
                }
            },
            AboutPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/about-page/about-page-default.tss'
                    ]
                }
            },
            CheckoutPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/checkout-page/checkout-page-default.tss'
                    ]
                }
            },
            ContactPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/contact-page/contact-page-default.tss'
                    ]
                }
            },
            FAQPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/faq-page/faq-page-default.tss'
                    ]
                },
                accordion: {
                    t: [
                        '@s/faq-page/faq-page-accordion.tss'
                    ]
                }
            },
            ItemPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/item-page/item-page-default.tss'
                    ]
                }
            },
            ProfilePage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/profile-page/profile-page-default.tss'
                    ]
                }
            },
            QAPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/qa-page/qa-page-default.tss'
                    ]
                }
            },
            SearchResultsPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/search-results-page/search-results-page-default.tss'
                    ]
                }
            },
            CollectionPage: {
                link: {
                    ui: {
                        c: 'WebPage.link'
                    }
                },
                default: {
                    t: [
                        '@s/collection-page/collection-page-default.tss'
                    ]
                }
            },
            WebPage: {
                link: {
                    ui: {
                        c: 'Thing.link'
                    }
                },
                default: {
                    t: [
                        '@s/web-page/web-page-default.tss'
                    ]
                },
                // todo
                boxed: {
                    ui: {
                        c: 'WebPage.default',
                        m: '1'
                    },
                    t: [
                        '@s/web-page/web-page-boxed.tss'
                    ]
                },
                contents: {
                    t: [
                        '@s/web-page/contents-default.tss'
                    ]
                },
                // todo
                contentsBoxed: {
                    ui: {
                        c: 'WebPage.contents'
                    },
                    t: [
                        '@s/web-page/contents-boxed.tss'
                    ]
                },
                defaultDesktop: {
                    t: [
                        '@s/web-page/web-page-default-desktop.tss'
                    ]
                },
                defaultDesktopS: {
                    t: [
                        '@s/web-page/web-page-default-desktop-s.tss'
                    ]
                },
                defaultDesktopM: {
                    t: [
                        '@s/web-page/web-page-default-desktop-m.tss'
                    ]
                },
                defaultDesktopL: {
                    t: [
                        '@s/web-page/web-page-default-desktop-l.tss'
                    ]
                },
                defaultTablet: {
                    t: [
                        '@s/web-page/web-page-default-tablet.tss'
                    ]
                },
                defaultTabletS: {
                    t: [
                        '@s/web-page/web-page-default-tablet-s.tss'
                    ]
                },
                defaultTabletM: {
                    t: [
                        '@s/web-page/web-page-default-tablet-m.tss'
                    ]
                },
                defaultTabletL: {
                    t: [
                        '@s/web-page/web-page-default-tablet-l.tss'
                    ]
                },
                defaultMobile: {
                    t: [
                        '@s/web-page/web-page-default-mobile.tss'
                    ]
                },
                defaultMobileS: {
                    t: [
                        '@s/web-page/web-page-default-mobile-s.tss'
                    ]
                },
                defaultMobileM: {
                    t: [
                        '@s/web-page/web-page-default-mobile-m.tss'
                    ]
                },
                defaultMobileL: {
                    t: [
                        '@s/web-page/web-page-default-mobile-l.tss'
                    ]
                }
            },
            WebSite: {
                link: {
                    ui: {
                        c: 'Thing.link'
                    }
                },
                default: {
                    t: [
                        '@s/web-site/web-site-default.tss'
                    ]
                }
            },
            WebPageElement: {
                default: {
                    t: ['@s/web-page-element/web-page-element-default.tss']
                },
                contents: {
                    t: ['@s/web-page-element/web-page-element-contents.tss']
                }
            },
            WPSideBar: {
                default: {
                    t: ['@s/w-p-side-bar/w-p-side-bar-default.tss']
                }
            },
            WPHeader: {
                default: {
                    t: ['@s/w-p-header/w-p-header-default.tss']
                },
                boxed: {
                    ui: {
                        c: 'WPHeader.default',
                        m: '1'
                    },
                    t: ['@s/w-p-header/w-p-header-boxed.tss']
                },
                defaultTablet: {
                    t: ['@s/w-p-header/w-p-header-default-tablet.tss']
                }
            },
            WPFooter: {
                default: {
                    t: ['@s/w-p-footer/w-p-footer-default.tss']
                },
                boxed: {
                    ui: {
                        c: 'WPFooter.default',
                        m: '1'
                    },
                    t: ['@s/w-p-footer/w-p-footer-boxed.tss']
                }
            },
            Article: {
                default: {
                    ui: {
                        c: 'CreativeWork.default'
                    },
                    t: [
                        // '@s/article/article-item.tss',
                        // '@s/article/article-list-item.tss',
                        // '@s/article/article-default.tss'
                    ]
                },
                home: {
                    ui: {
                        c: 'CreativeWork.default'
                    }
                },
                item: {
                    ui: {
                        c: 'CreativeWork.item'
                    },
                    t: [
                        // '@s/article/article-item.tss'
                    ]
                },
                link: {
                    ui: {
                        c: 'CreativeWork.link'
                    },
                    t: ['@s/article/article-link.tss']
                }
            },

            // schema-ui.js
            Thing: {
                default: {
                    t: [
                        '@s/thing/thing-default.tss'
                    ]
                },
                item: {
                    t: ['@s/thing/thing-default.tss']
                },
                contents: {
                    t: ['@s/thing/thing-contents.tss']
                },
                link: {
                    t: ['@s/thing/thing-link.tss']
                }
            },

            Product: {
                default: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: ['@s/product/product-default.tss']
                },
                item: {
                    ui: {
                        c: 'Product.default'
                    },
                    t: ['@s/product/product-item.tss']
                }
            },
            Offer: {
                default: {
                    t: ['@s/offer/offer-default.tss']
                }
            },

            ImageObject: {
                default: {
                    t: ['@s/image-object/image-object-default.tss']
                }
            },
            MediaObject: {
                default: {
                    ui: {
                        c: 'ImageObject.default'
                    }
                }
            },
            CreativeWork: {
                default: {
                    t: [
                        // '@s/creative-work/creative-work-item.tss',
                        '@s/creative-work/creative-work-default.tss'
                    ]
                },
                contents: {
                    t: ['@s/creative-work/creative-work-contents.tss']
                },
                listItem: {
                    ui: {
                        c: 'CreativeWork.item'
                    }
                },
                item: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: ['@s/creative-work/creative-work-item.tss']
                },
                link: {
                    ui: {
                        c: 'Thing.link'
                    },
                    t: ['@s/creative-work/creative-work-link.tss']
                }
            },
            Event: {
                default: {
                    ui: {
                        c: '@e.article',
                        t: '0'
                    },
                    t: ['@s/creative-work/creative-work-default.tss']
                },
                link: {
                    ui: {
                        c: 'Thing.link'
                    },
                    t: ['@s/event/event-link.tss']
                }
            },
            Person: {
                default: {
                    ui: {
                        c: 'Thing'
                    },
                    t: [
                        '@s/person/person-item.tss',
                        '@s/person/person-list-item.tss',
                        '@s/person/person-default.tss'
                    ]
                },
                link: {
                    ui: {
                        c: 'Thing.link'
                    },
                    t: ['@s/person/person-link.tss']
                },
                listItem: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: [
                        '@s/person/person-item.tss',
                        '@s/person/person-list-item.tss'
                    ]
                },
                gridItem: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: [
                        '@s/person/person-item.tss',
                        '@s/person/person-grid-item.tss'
                    ]
                },
                item: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: ['@s/person/person-item.tss']
                }
            },
            Action: {
                default: {
                    t: ['@s/action/action-default.tss']
                },
                link: {
                    t: ['@s/action/action-link.tss']
                }
            },
            SearchAction: {
                default: {
                    t: ['@s/search-action/search-action-default.tss']
                }
            },
            ConsumeAction: {
                default: {
                    ui: {
                        c: 'Action.default'
                    },
                    t: [// todo
                        '@s/consume-action/consume-action-default.tss'
                    ]
                },
                link: {
                    ui: {
                        c: 'Action.link'
                    },
                    t: [// todo
                        '@s/consume-action/consume-action-default.tss'
                    ]
                },
            },
            ViewAction: {
                default: {
                    ui: {
                        c: 'ConsumeAction.default'
                    },
                    t: [
                        '@s/view-action/view-action-default.tss'
                    ]
                },
                link: {
                    ui: {
                        c: 'ConsumeAction.link'
                    },
                    t: [
                        '@s/view-action/view-action-default.tss'
                    ]
                },
            },
            EntryPoint: {
                default: {
                    t: ['@s/entry-point/entry-point-default.tss']
                },
                action: {
                    t: ['@s/entry-point/entry-point.tss']
                }
            },
            AggregateRating: {},
            PropertyValue: {},
            BreadcrumbList: {
                default: {
                    t: ['@s/breadcrumb-list/breadcrumb-list-default.tss']
                },
                boxed: {
                    ui: {
                        c: 'BreadcrumbList.default',
                        m: '1'
                    },
                    t: ['@s/breadcrumb-list/breadcrumb-list-boxed.tss']
                }
            },
            ListItem: {
                default: {
                    t: ['@s/list-item/list-item-default.tss']
                }
            },
            ItemList: {
                default: {
                    t: ['@s/item-list/item-list-default.tss']
                }
            }
        }
    }
};
