/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    jTormSchemaUi: {
        id: "jtorm-schema-ui",
        alias: "@s",
        framework: "schema",
        url: [
            // 'https://gitlab.com/jtorm/jtorm-framework/src/uis/schema-ui/src'
        ],
        mapper: {
            Text: {
                default: {
                    t: ['@s/html/text/text-default.tss']
                },
                multi: {
                    t: ['@s/html/text/text-multi.tss']
                }
            },
            URL: {
                default: {
                    t: ['@s/html/url/url-default.tss']
                },
                multi: {
                    t: ['@s/html/url/url-multi.tss']
                }
            },
            Comment: {
                default: {
                    t: [
                        '@s/html/comment/comment-item.tss',
                        '@s/html/comment/comment-list-item.tss',
                        '@s/html/comment/comment-default.tss'
                    ]
                },
                listItem: {
                    ui: {
                        c: 'CreativeWork.listItem'
                    },
                    t: [
                        '@s/html/comment/comment-item.tss',
                        '@s/html/comment/comment-list-item.tss'
                    ]
                },
                gridItem: {
                    ui: {
                        c: 'CreativeWork.gridItem'
                    },
                    t: [
                        '@s/html/comment/comment-item.tss',
                        '@s/html/comment/comment-grid-item.tss'
                    ]
                },
                item: {
                    ui: {
                        c: 'CreativeWork.item'
                    },
                    t: ['@s/html/comment/comment-item.tss']
                },
                link: {
                    ui: {
                        c: 'CreativeWork.link'
                    },
                    t: ['@s/html/comment/comment-link.tss']
                },
                linkMulti: {
                    t: ['@s/html/comment/comment-link-multi.tss']
                }
            },
            SiteNavigationElement: {
                default: {
                    t: [
                        '@s/html/site-navigation-element/site-navigation-element-default.tss'
                    ]
                },
                boxed: {
                    ui: {
                        c: 'SiteNavigationElement.default',
                        m: '1'
                    },
                    t: ['@s/html/site-navigation-element/site-navigation-element-boxed.tss']
                }
            },
            WebPage: {
                default: {
                    t: [
                        '@s/html/web-page/web-page-default.tss'
                    ]
                },
                boxed: {
                    ui: {
                        c: 'WebPage.default',
                        m: '1'
                    },
                    t: [
                        '@s/html/web-page/web-page-boxed.tss'
                    ]
                },
                contentsDefault: {
                    ui: {
                        c: '@e.main'
                    },
                    t: [
                        '@s/html/web-page/contents-default.tss'
                    ]
                },
                contentsBoxed: {
                    ui: {
                        c: 'WebPage.contentsDefault'
                    },
                    t: [
                        '@s/html/web-page/contents-boxed.tss'
                    ]
                },
                defaultDesktop: {
                    t: [
                        '@s/html/web-page/web-page-default-desktop.tss'
                    ]
                },
                defaultDesktopS: {
                    t: [
                        '@s/html/web-page/web-page-default-desktop-s.tss'
                    ]
                },
                defaultDesktopM: {
                    t: [
                        '@s/html/web-page/web-page-default-desktop-m.tss'
                    ]
                },
                defaultDesktopL: {
                    t: [
                        '@s/html/web-page/web-page-default-desktop-l.tss'
                    ]
                },
                defaultTablet: {
                    t: [
                        '@s/html/web-page/web-page-default-tablet.tss'
                    ]
                },
                defaultTabletS: {
                    t: [
                        '@s/html/web-page/web-page-default-tablet-s.tss'
                    ]
                },
                defaultTabletM: {
                    t: [
                        '@s/html/web-page/web-page-default-tablet-m.tss'
                    ]
                },
                defaultTabletL: {
                    t: [
                        '@s/html/web-page/web-page-default-tablet-l.tss'
                    ]
                },
                defaultMobile: {
                    t: [
                        '@s/html/web-page/web-page-default-mobile.tss'
                    ]
                },
                defaultMobileS: {
                    t: [
                        '@s/html/web-page/web-page-default-mobile-s.tss'
                    ]
                },
                defaultMobileM: {
                    t: [
                        '@s/html/web-page/web-page-default-mobile-m.tss'
                    ]
                },
                defaultMobileL: {
                    t: [
                        '@s/html/web-page/web-page-default-mobile-l.tss'
                    ]
                }
            },
            /*
      AboutPage
      CheckoutPage
      CollectionPage
      ContactPage
      FAQPage
      ItemPage
      MedicalWebPage
      ProfilePage
      QAPage
      RealEstateListing
      SearchResultsPage
             */
            WebPageElement: {
                default: {
                    ui: {
                        c: 'CreativeWork'
                    },
                    t: ['@s/html/web-page-element/web-page-element-default.tss']
                }
            },
            WPSideBar: {
                default: {
                    ui: {
                        c: 'WebPageElement'
                    },
                    t: ['@s/html/w-p-side-bar/w-p-side-bar-default.tss']
                }
            },
            WPHeader: {
                default: {
                    ui: {
                        c: 'WebPageElement'
                    },
                    t: ['@s/html/w-p-header/w-p-header-default.tss']
                },
                boxed: {
                    ui: {
                        c: 'WPHeader.default',
                        m: '1'
                    },
                    t: ['@s/html/w-p-header/w-p-header-boxed.tss']
                },
                defaultTablet: {
                    t: ['@s/html/w-p-header/w-p-header-default-tablet.tss']
                }
            },
            WPFooter: {
                default: {
                    ui: {
                        c: 'WebPageElement'
                    },
                    t: ['@s/html/w-p-footer/w-p-footer-default.tss']
                },
                boxed: {
                    ui: {
                        c: 'WPFooter.default',
                        m: '1'
                    },
                    t: ['@s/html/w-p-footer/w-p-footer-boxed.tss']
                }
            },
            Article: {
                default: {
                    ui: {
                        c: 'CreativeWork.default'
                    },
                    t: [
                        '@s/html/article/article-item.tss',
                        '@s/html/article/article-list-item.tss',
                        '@s/html/article/article-default.tss'
                    ]
                },
                listItem: {
                    ui: {
                        c: 'CreativeWork.listItem'
                    },
                    t: [
                        // '@s/html/article/article-item.tss',
                        '@s/html/article/article-list-item.tss'
                    ]
                },
                gridItem: {
                    ui: {
                        c: 'CreativeWork.gridItem'
                    },
                    t: [
                        // '@s/html/article/article-item.tss',
                        '@s/html/article/article-grid-item.tss'
                    ]
                },
                item: {
                    ui: {
                        c: 'CreativeWork.item'
                    },
                    t: [
                        // '@s/html/article/article-item.tss'
                    ]
                },
                link: {
                    ui: {
                        c: 'CreativeWork.link'
                    },
                    t: ['@s/html/article/article-link.tss']
                },
                linkMulti: {
                    t: ['@s/html/article/article-link-multi.tss']
                }
            },
            Thing: {
                default: {
                    ui: {
                        c: '@e.section',
                        t: 0
                    },
                    t: ['@s/html/thing/thing-default.tss']
                },
                /* dit was eerst omdat dan een description wordt toegevoegd, maar dit moet expliciet in ui worden gezet naar list vind ik
                default: {
                  ui: {
                    c: 'Thing.listItem'
                  },
                  t: ['@s/html/thing/thing-item.tss']
                },*/
                listItem: {
                    ui: {
                        c: 'Thing.item'
                    },
                    /*t: ['@s/html/thing/thing-list-item.tss']*/
                },
                gridItem: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: ['@s/html/thing/thing-grid-item.tss']
                },
                header: {
                    t: ['@s/html/thing/header.tss']
                },
                body: {
                    t: ['@s/html/thing/body.tss']
                },
                footer: {
                    t: ['@s/html/thing/footer.tss']
                },
                link: {
                    t: ['@s/html/thing/thing-link.tss']
                },
                linkMulti: {
                    t: ['@s/html/thing/thing-link-multi.tss']
                }
            },
            ImageObject: {
                default: {
                    t: ['@s/html/image-object/image-object-default.tss']
                },
                picture: {
                    t: ['@s/html/image-object/picture-default.tss']
                },
                image: {
                    t: ['@s/html/image-object/image-default.tss']
                },
                figure: {
                    t: ['@s/html/image-object/figure-default.tss']
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
                    ui: {
                        c: 'Thing.default'
                    },
                    t: [
                        '@s/html/creative-work/creative-work-item.tss',
                        '@s/html/creative-work/creative-work-list-item.tss',
                        '@s/html/creative-work/creative-work-default.tss'
                    ]
                },
                listItem: {
                    ui: {
                        c: 'Thing.listItem'
                    },
                    t: [
                        '@s/html/creative-work/creative-work-item.tss',
                        '@s/html/creative-work/creative-work-list-item.tss'
                    ]
                },
                gridItem: {
                    ui: {
                        c: 'Thing.gridItem',
                        t: [
                            '@s/html/creative-work/creative-work-item.tss',
                            '@s/html/creative-work/creative-work-grid-item.tss'
                        ]
                    }
                },
                item: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: ['@s/html/creative-work/creative-work-item.tss']
                },
                link: {
                    ui: {
                        c: 'Thing.link'
                    },
                    t: ['@s/html/creative-work/creative-work-link.tss']
                },
                linkMulti: {
                    t: ['@s/html/creative-work/creative-work-link-multi.tss']
                }
            },
            Event: {
                default: {
                    ui: {
                        c: '@e.article',
                        t: '0'
                    },
                    t: ['@s/html/creative-work/creative-work-default.tss']
                },
                link: {
                    ui: {
                        c: 'Thing.link'
                    },
                    t: ['@s/html/event/event-link.tss']
                },
                linkMulti: {
                    t: ['@s/html/event/event-link-multi.tss']
                }
            },
            Person: {
                default: {
                    ui: {
                        c: 'Thing'
                    },
                    t: [
                        '@s/html/person/person-item.tss',
                        '@s/html/person/person-list-item.tss',
                        '@s/html/person/person-default.tss'
                    ]
                },
                link: {// is deze nodig??, ws linkmulti altijd goed
                    ui: {
                        c: 'Thing.link'
                    },
                    t: ['@s/html/person/person-link.tss']
                },
                linkMulti: {
                    t: ['@s/html/person/person-link-multi.tss']
                },
                listItem: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: [
                        '@s/html/person/person-item.tss',
                        '@s/html/person/person-list-item.tss'
                    ]
                },
                gridItem: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: [
                        '@s/html/person/person-item.tss',
                        '@s/html/person/person-grid-item.tss'
                    ]
                },
                item: {
                    ui: {
                        c: 'Thing.item'
                    },
                    t: ['@s/html/person/person-item.tss']
                }
            },
            Action: {
                default: {
                    t: ['@s/html/action/action-default.tss']
                },
                link: {
                    t: ['@s/html/action/action-link.tss']
                },
                linkMulti: {
                    t: ['@s/html/action/action-link-multi.tss']
                }
            },
            ConsumeAction: {
                default: {
                    ui: {
                        c: 'Action.default'
                    },
                    t: [// todo
                        '@s/html/consume-action/consume-action-default.tss'
                    ]
                },
                link: {
                    ui: {
                        c: 'Action.link'
                    },
                    t: [// todo
                        '@s/html/consume-action/consume-action-default.tss'
                    ]
                },
            },
            ViewAction: {
                default: {
                    ui: {
                        c: 'ConsumeAction.default'
                    },
                    t: [
                        '@s/html/view-action/view-action-default.tss'
                    ]
                },
                link: {
                    ui: {
                        c: 'ConsumeAction.link'
                    },
                    t: [
                        '@s/html/view-action/view-action-default.tss'
                    ]
                },
            },
            EntryPoint: {
                default: {
                    t: ['@s/html/entry-point/entry-point-default.tss']
                },
                action: {
                    t: ['@s/html/entry-point/entry-point.tss']
                }
            },
            AggregateRating: {},
            PropertyValue: {},
            BreadcrumbList: {
                default: {
                    t: ['@s/html/breadcrumb-list/breadcrumb-list-default.tss']
                },
                boxed: {
                    ui: {
                        c: 'BreadcrumbList.default',
                        m: '1'
                    },
                    t: ['@s/html/breadcrumb-list/breadcrumb-list-boxed.tss']
                }
            },
            ItemList: {
                default: {
                    t: ['@s/html/item-list/item-list-default.tss']
                }
            }
        }
    }
};