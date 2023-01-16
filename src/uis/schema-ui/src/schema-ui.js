/*! (c) jTorm and other contributors | www.jtorm.com/license */

const jTormSchemaUi = {
    id: "jtorm/schema-ui-0.0.4/src",
    alias: "@s",
    framework: "schema",
    url: "https://cdn.jtorm.com/",
    mapper: {
        Text: {
            default: {
                t: ['@s/text/text-default.tss']
            },
            multi: {
                t: ['@s/text/text-multi.tss']
            }
        },
        URL: {
            default: {
                t: ['@s/url/url-default.tss']
            },
            multi: {
                t: ['@s/url/url-multi.tss']
            }
        },
        Comment: {
            default: {
                t: [
                    '@s/comment/comment-item.tss',
                    '@s/comment/comment-list-item.tss',
                    '@s/comment/comment-default.tss'
                ]
            },
            listItem: {
                ui: {
                    c: 'CreativeWork.listItem'
                },
                t: [
                    '@s/comment/comment-item.tss',
                    '@s/comment/comment-list-item.tss'
                ]
            },
            gridItem: {
                ui: {
                    c: 'CreativeWork.gridItem'
                },
                t: [
                    '@s/comment/comment-item.tss',
                    '@s/comment/comment-grid-item.tss'
                ]
            },
            item: {
                ui: {
                    c: 'CreativeWork.item'
                },
                t: ['@s/comment/comment-item.tss']
            },
            link: {
                ui: {
                    c: 'CreativeWork.link'
                },
                t: ['@s/comment/comment-link.tss']
            },
            linkMulti: {
                t: ['@s/comment/comment-link-multi.tss']
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
        WebPage: {
            default: {
                t: [
                    '@s/web-page/web-page-default.tss'
                ]
            },
            boxed: {
                ui: {
                    c: 'WebPage.default',
                    m: '1'
                },
                t: [
                    '@s/web-page/web-page-boxed.tss'
                ]
            },
            contentsDefault: {
                ui: {
                    c: '@e.main'
                },
                t: [
                    '@s/web-page/contents-default.tss'
                ]
            },
            contentsBoxed: {
                ui: {
                    c: 'WebPage.contentsDefault'
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
                t: ['@s/web-page-element/web-page-element-default.tss']
            }
        },
        WPSideBar: {
            default: {
                ui: {
                    c: 'WebPageElement'
                },
                t: ['@s/w-p-side-bar/w-p-side-bar-default.tss']
            }
        },
        WPHeader: {
            default: {
                ui: {
                    c: 'WebPageElement'
                },
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
                ui: {
                    c: 'WebPageElement'
                },
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
                    '@s/article/article-item.tss',
                    '@s/article/article-list-item.tss',
                    '@s/article/article-default.tss'
                ]
            },
            listItem: {
                ui: {
                    c: 'CreativeWork.listItem'
                },
                t: [
                    // '@s/article/article-item.tss',
                    '@s/article/article-list-item.tss'
                ]
            },
            gridItem: {
                ui: {
                    c: 'CreativeWork.gridItem'
                },
                t: [
                    // '@s/article/article-item.tss',
                    '@s/article/article-grid-item.tss'
                ]
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
            },
            linkMulti: {
                t: ['@s/article/article-link-multi.tss']
            }
        },
        Thing: {
            default: {
                ui: {
                    c: '@e.section',
                    t: 0
                },
                t: ['@s/thing/thing-default.tss']
            },
            listItem: {
                ui: {
                    c: 'Thing.default'
                },
                t: ['@s/thing/thing-list-item.tss']
            },
            gridItem: {
                ui: {
                    c: 'Thing.default'
                },
                t: ['@s/thing/thing-grid-item.tss']
            },
            header: {
                t: ['@s/thing/header.tss']
            },
            body: {
                t: ['@s/thing/body.tss']
            },
            footer: {
                t: ['@s/thing/footer.tss']
            },
            link: {
                t: ['@s/thing/thing-link.tss']
            },
            linkMulti: {
                t: ['@s/thing/thing-link-multi.tss']
            }
        },
        ImageObject: {
            default: {
                t: ['@s/image-object/image-object-default.tss']
            },
            picture: {
                t: ['@s/image-object/picture-default.tss']
            },
            image: {
                t: ['@s/image-object/image-default.tss']
            },
            figure: {
                t: ['@s/image-object/figure-default.tss']
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
                    '@s/creative-work/creative-work-item.tss',
                    '@s/creative-work/creative-work-list-item.tss',
                    '@s/creative-work/creative-work-default.tss'
                ]
            },
            listItem: {
                ui: {
                    c: 'Thing.listItem'
                },
                t: [
                    '@s/creative-work/creative-work-item.tss',
                    '@s/creative-work/creative-work-list-item.tss'
                ]
            },
            gridItem: {
                ui: {
                    c: 'Thing.gridItem',
                    t: [
                        '@s/creative-work/creative-work-item.tss',
                        '@s/creative-work/creative-work-grid-item.tss'
                    ]
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
            },
            linkMulti: {
                t: ['@s/creative-work/creative-work-link-multi.tss']
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
            },
            linkMulti: {
                t: ['@s/event/event-link-multi.tss']
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
            link: {// is deze nodig??, ws linkmulti altijd goed
                ui: {
                    c: 'Thing.link'
                },
                t: ['@s/person/person-link.tss']
            },
            linkMulti: {
                t: ['@s/person/person-link-multi.tss']
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
            },
            linkMulti: {
                t: ['@s/action/action-link-multi.tss']
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
        ItemList: {
            default: {
                t: ['@s/item-list/item-list-default.tss']
            }
        }
    }
};

module.exports = {
    jTormSchemaUi
};