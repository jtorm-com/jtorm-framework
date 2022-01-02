/*! (c) jTorm and other contributors | www.jtorm.com/license */
(function (r, f) {
    if (typeof define === "function" && define.amd)
        define(["exports"], f);
    else if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string')
        f(exports);
    else
        f(r);
}(typeof self !== 'undefined' ? self : this, function (e) {
    e.jTormHtmlUi = {
        tssConfig: {},
        id: "jtorm-html-ui",
        alias: "@h",
        framework: "h",
        mapper: {
            init: {
                default: {
                    t: ['@h/init.tss']
                }
            },
            doc: {
                base: {
                    t: ['@h/doc/base.tss'],
                    h: '@h/doc/base.html'
                },
                body: {
                    t: ['@h/doc/body.tss']
//          h: '@h/doc/body.html'
                },
                head: {
                    t: ['@h/doc/head.tss']
//          h: '@h/doc/head.html'
                },
                html: {
                    t: ['@h/doc/html.tss']
//          h: '@h/doc/html.html'
                },
                link: {
                    t: ['@h/doc/link.tss'],
                    h: '@h/doc/link.html'
                },
                linkIcon: {
                    t: ['@h/doc/link-icon.tss'],
                    h: '@h/doc/link.html'
                },
                meta: {
                    t: ['@h/doc/meta.tss'],
                    h: '@h/doc/meta.html'
                },
                noscript: {
                    t: ['@h/doc/noscript.tss'],
                    h: '@h/doc/noscript.html'
                },
                script: {
                    t: ['@h/doc/script.tss'],
                    h: '@h/doc/script.html'
                },
                style: {
                    t: ['@h/doc/style.tss'],
                    h: '@h/doc/style.html'
                },
                title: {
                    t: ['@h/doc/title.tss'],
                    h: '@h/doc/title.html'
                }
            },
            el: {
                a: {
                    t: ['@h/el/a.tss'],
                    h: '@h/el/a.html'
                },
                article: {
                    t: ['@h/el/article.tss'],
                    h: '@h/el/article.html'
                },
                aside: {
                    t: ['@h/el/aside.tss'],
                    h: '@h/el/aside.html'
                },
                br: {
                    t: ['@h/el/br.tss'],
                    h: '@h/el/br.html'
                },
                data: {
                    t: ['@h/el/data.tss'],
                    h: '@h/el/data.html'
                },
                details: {
                    t: ['@h/el/details.tss'],
                    h: '@h/el/details.html'
                },
                dialog: {
                    t: ['@h/el/dialog.tss'],
                    h: '@h/el/dialog.html'
                },
                div: {
                    t: ['@h/el/div.tss'],
                    h: '@h/el/div.html'
                },
                footer: {
                    t: ['@h/el/footer.tss'],
                    h: '@h/el/footer.html'
                },
                header: {
                    t: ['@h/el/header.tss'],
                    h: '@h/el/header.html'
                },
                hr: {
                    t: ['@h/el/hr.tss'],
                    h: '@h/el/hr.html'
                },
                iframe: {
                    t: ['@h/el/iframe.tss'],
                    h: '@h/el/iframe.html'
                },
                main: {
                    t: ['@h/el/main.tss'],
                    h: '@h/el/main.html'
                },
                meter: {
                    t: ['@h/el/meter.tss'],
                    h: '@h/el/meter.html'
                },
                nav: {
                    t: ['@h/el/nav.tss'],
                    h: '@h/el/nav.html'
                },
                section: {
                    t: ['@h/el/section.tss'],
                    h: '@h/el/section.html'
                },
                span: {
                    t: ['@h/el/span.tss'],
                    h: '@h/el/span.html'
                },
                summary: {
                    t: ['@h/el/summary.tss'],
                    h: '@h/el/summary.html'
                },
                template: {
                    t: ['@h/el/template.tss'],
                    h: '@h/el/template.html'
                },
                time: {
                    t: ['@h/el/time.tss'],
                    h: '@h/el/time.html'
                },
                wbr: {
                    t: ['@h/el/wbr.tss'],
                    h: '@h/el/wbr.html'
                }
            },
            form: {
                button: {
                    t: ['@h/form/button.tss'],
                    h: '@h/form/button.html'
                },
                buttonSubmit: {
                    t: ['@h/form/button-submit.tss'],
                    h: '@h/form/button.html'
                },
                buttonReset: {
                    t: ['@h/form/button-reset.tss'],
                    h: '@h/form/button.html'
                },
                buttonButton: {
                    t: ['@h/form/button-button.tss'],
                    h: '@h/form/button.html'
                },
                datalist: {
                    t: ['@h/form/datalist.tss'],
                    h: '@h/form/datalist.html'
                },
                fieldset: {
                    t: ['@h/form/fieldset.tss'],
                    h: '@h/form/fieldset.html'
                },
                form: {
                    t: ['@h/form/form.tss'],
                    h: '@h/form/form.html'
                },
                input: {
                    t: ['@h/form/input.tss'],
                    h: '@h/form/input.html'
                },
                inputButton: {
                    t: ['@h/form/input-button.tss'],
                    h: '@h/form/input.html'
                },
                inputCheckbox: {
                    t: ['@h/form/input-checkbox.tss'],
                    h: '@h/form/input.html'
                },
                inputColor: {
                    t: ['@h/form/input-color.tss'],
                    h: '@h/form/input.html'
                },
                inputDate: {
                    t: ['@h/form/input-date.tss'],
                    h: '@h/form/input.html'
                },
                inputDatetime: {
                    t: ['@h/form/input-datetime.tss'],
                    h: '@h/form/input.html'
                },
                inputDatetimeLocal: {
                    t: ['@h/form/input-datetime-local.tss'],
                    h: '@h/form/input.html'
                },
                inputEmail: {
                    t: ['@h/form/input-email.tss'],
                    h: '@h/form/input.html'
                },
                inputFile: {
                    t: ['@h/form/input-file.tss'],
                    h: '@h/form/input.html'
                },
                inputHidden: {
                    t: ['@h/form/input-hidden.tss'],
                    h: '@h/form/input.html'
                },
                inputImage: {
                    t: ['@h/form/input-image.tss'],
                    h: '@h/form/input.html'
                },
                inputMonth: {
                    t: ['@h/form/input-month.tss'],
                    h: '@h/form/input.html'
                },
                inputNumber: {
                    t: ['@h/form/input-number.tss'],
                    h: '@h/form/input.html'
                },
                inputPassword: {
                    t: ['@h/form/input-password.tss'],
                    h: '@h/form/input.html'
                },
                inputRadio: {
                    t: ['@h/form/input-radio.tss'],
                    h: '@h/form/input.html'
                },
                inputRange: {
                    t: ['@h/form/input-range.tss'],
                    h: '@h/form/input.html'
                },
                inputReset: {
                    t: ['@h/form/input-reset.tss'],
                    h: '@h/form/input.html'
                },
                inputSearch: {
                    t: ['@h/form/input-search.tss'],
                    h: '@h/form/input.html'
                },
                inputSubmit: {
                    t: ['@h/form/input-submit.tss'],
                    h: '@h/form/input.html'
                },
                inputTel: {
                    t: ['@h/form/input-tel.tss'],
                    h: '@h/form/input.html'
                },
                inputText: {
                    t: ['@h/form/input-text.tss'],
                    h: '@h/form/input.html'
                },
                inputTime: {
                    t: ['@h/form/input-time.tss'],
                    h: '@h/form/input.html'
                },
                inputUrl: {
                    t: ['@h/form/input-url.tss'],
                    h: '@h/form/input.html'
                },
                inputWeek: {
                    t: ['@h/form/input-week.tss'],
                    h: '@h/form/input-week.html'
                },
                label: {
                    t: ['@h/form/label.tss'],
                    h: '@h/form/label.html'
                },
                legend: {
                    t: ['@h/form/legend.tss'],
                    h: '@h/form/legend.html'
                },
                optgroup: {
                    t: ['@h/form/optgroup.tss'],
                    h: '@h/form/optgroup.html'
                },
                option: {
                    t: ['@h/form/option.tss'],
                    h: '@h/form/option.html'
                },
                output: {
                    t: ['@h/form/output.tss'],
                    h: '@h/form/output.html'
                },
                progress: {
                    t: ['@h/form/progress.tss'],
                    h: '@h/form/progress.html'
                },
                select: {
                    t: ['@h/form/select.tss'],
                    h: '@h/form/select.html'
                },
                textarea: {
                    t: ['@h/form/textarea.tss'],
                    h: '@h/form/textarea.html'
                }
            },
            typo: {
                abbr: {
                    t: ['@h/typo/abbr.tss'],
                    h: '@h/typo/abbr.html'
                },
                address: {
                    t: ['@h/typo/address.tss'],
                    h: '@h/typo/address.html'
                },
                bdi: {
                    t: ['@h/typo/bdi.tss'],
                    h: '@h/typo/bdi.html'
                },
                bdo: {
                    t: ['@h/typo/bdo.tss'],
                    h: '@h/typo/bdo.html'
                },
                blockquote: {
                    t: ['@h/typo/blockquote.tss'],
                    h: '@h/typo/blockquote.html'
                },
                dd: {
                    t: ['@h/typo/dd.tss'],
                    h: '@h/typo/dd.html'
                },
                dfn: {
                    t: ['@h/typo/dfn.tss'],
                    h: '@h/typo/dfn.html'
                },
                dl: {
                    t: ['@h/typo/dl.tss'],
                    h: '@h/typo/dl.html'
                },
                dlRow: {
                    t: ['@h/typo/dl-row.tss']
                },
                dt: {
                    t: ['@h/typo/dt.tss'],
                    h: '@h/typo/dt.html'
                },
                h1: {
                    t: ['@h/typo/h1.tss'],
                    h: '@h/typo/h1.html'
                },
                h2: {
                    t: ['@h/typo/h2.tss'],
                    h: '@h/typo/h2.html'
                },
                h3: {
                    t: ['@h/typo/h3.tss'],
                    h: '@h/typo/h3.html'
                },
                h4: {
                    t: ['@h/typo/h4.tss'],
                    h: '@h/typo/h4.html'
                },
                h5: {
                    t: ['@h/typo/h5.tss'],
                    h: '@h/typo/h5.html'
                },
                h6: {
                    t: ['@h/typo/h6.tss'],
                    h: '@h/typo/h6.html'
                },
                p: {
                    t: ['@h/typo/p.tss'],
                    h: '@h/typo/p.html'
                },
                small: {
                    t: ['@h/typo/small.tss'],
                    h: '@h/typo/small.html'
                },
                b: {
                    t: ['@h/typo/b.tss'],
                    h: '@h/typo/b.html'
                },
                em: {
                    t: ['@h/typo/em.tss'],
                    h: '@h/typo/em.html'
                },
                i: {
                    t: ['@h/typo/i.tss'],
                    h: '@h/typo/i.html'
                },
                u: {
                    t: ['@h/typo/u.tss'],
                    h: '@h/typo/u.html'
                },
                ins: {
                    t: ['@h/typo/ins.tss'],
                    h: '@h/typo/ins.html'
                },
                del: {
                    t: ['@h/typo/del.tss'],
                    h: '@h/typo/del.html'
                },
                cite: {
                    t: ['@h/typo/cite.tss'],
                    h: '@h/typo/cite.html'
                },
                code: {
                    t: ['@h/typo/code.tss'],
                    h: '@h/typo/code.html'
                },
                pre: {
                    t: ['@h/typo/pre.tss'],
                    h: '@h/typo/pre.html'
                },
                kbd: {
                    t: ['@h/typo/kbd.tss'],
                    h: '@h/typo/kbd.html'
                },
                s: {
                    t: ['@h/typo/s.tss'],
                    h: '@h/typo/s.html'
                },
                samp: {
                    t: ['@h/typo/samp.tss'],
                    h: '@h/typo/samp.html'
                },
                mark: {
                    t: ['@h/typo/mark.tss'],
                    h: '@h/typo/mark.html'
                },
                ul: {
                    t: ['@h/typo/ul.tss'],
                    h: '@h/typo/ul.html'
                },
                ol: {
                    t: ['@h/typo/ol.tss'],
                    h: '@h/typo/ol.html'
                },
                li: {
                    t: ['@h/typo/li.tss'],
                    h: '@h/typo/li.html'
                },
                q: {
                    t: ['@h/typo/q.tss'],
                    h: '@h/typo/q.html'
                },
                rp: {
                    t: ['@h/typo/rp.tss'],
                    h: '@h/typo/rp.html'
                },
                rt: {
                    t: ['@h/typo/rt.tss'],
                    h: '@h/typo/rt.html'
                },
                ruby: {
                    t: ['@h/typo/ruby.tss'],
                    h: '@h/typo/ruby.html'
                },
                strong: {
                    t: ['@h/typo/strong.tss'],
                    h: '@h/typo/strong.html'
                },
                sub: {
                    t: ['@h/typo/sub.tss'],
                    h: '@h/typo/sub.html'
                },
                sup: {
                    t: ['@h/typo/sup.tss'],
                    h: '@h/typo/sup.html'
                },
                var: {
                    t: ['@h/typo/var.tss'],
                    h: '@h/typo/var.html'
                }
            },
            table: {
                caption: {
                    t: ['@h/table/caption.tss'],
                    h: '@h/table/caption.html'
                },
                col: {
                    t: ['@h/table/col.tss'],
                    h: '@h/table/col.html'
                },
                colgroup: {
                    t: ['@h/table/colgroup.tss'],
                    h: '@h/table/colgroup.html'
                },
                table: {
                    t: ['@h/table/table.tss'],
                    h: '@h/table/table.html'
                },
                tbody: {
                    t: ['@h/table/tbody.tss'],
                    h: '@h/table/tbody.html'
                },
                td: {
                    t: ['@h/table/td.tss'],
                    h: '@h/table/td.html'
                },
                tfoot: {
                    t: ['@h/table/tfoot.tss'],
                    h: '@h/table/tfoot.html'
                },
                th: {
                    t: ['@h/table/th.tss'],
                    h: '@h/table/th.html'
                },
                thead: {
                    t: ['@h/table/thead.tss'],
                    h: '@h/table/thead.html'
                },
                tr: {
                    t: ['@h/table/tr.tss'],
                    h: '@h/table/tr.html'
                }
            },
            media: {
                area: {
                    t: ['@h/media/area.tss'],
                    h: '@h/media/area.html'
                },
                audio: {
                    t: ['@h/media/audio.tss'],
                    h: '@h/media/audio.html'
                },
                canvas: {
                    t: ['@h/media/canvas.tss'],
                    h: '@h/media/canvas.html'
                },
                embed: {
                    t: ['@h/media/embed.tss'],
                    h: '@h/media/embed.html'
                },
                figcaption: {
                    t: ['@h/media/figcaption.tss'],
                    h: '@h/media/figcaption.html'
                },
                figure: {
                    t: ['@h/media/figure.tss'],
                    h: '@h/media/figure.html'
                },
                img: {
                    t: ['@h/media/img.tss'],
                    h: '@h/media/img.html'
                },
                map: {
                    t: ['@h/media/map.tss'],
                    h: '@h/media/map.html'
                },
                object: {
                    t: ['@h/media/object.tss'],
                    h: '@h/media/object.html'
                },
                path: {
                    t: ['@h/media/path.tss'],
                    h: '@h/media/path.html'
                },
                param: {
                    t: ['@h/media/param.tss'],
                    h: '@h/media/param.html'
                },
                picture: {
                    t: ['@h/media/picture.tss'],
                    h: '@h/media/picture.html'
                },
                source: {
                    t: ['@h/media/source.tss'],
                    h: '@h/media/source.html'
                },
                svg: {
                    t: ['@h/media/svg.tss'],
                    h: '@h/media/svg.html'
                },
                track: {
                    t: ['@h/media/track.tss'],
                    h: '@h/media/track.html'
                },
                video: {
                    t: ['@h/media/video.tss'],
                    h: '@h/media/video.html'
                }
            }
        }
    };
    return e.jTormHtmlUi;
})); 