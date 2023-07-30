/*! (c) jTorm and other contributors | www.jtorm.com/license */

module.exports = {
    jTormHtmlUi: {
        id: "jtorm/html-ui-0.0.4/src",
        alias: "@h",
        framework: "h",
        mapperAlias: {
            d: 'doc',
            e: 'element',
            f: 'form',
            t: 'typography',
            tb: 'table',
            m: 'media'
        },
        url: "https://cdn.jtorm.com/",
        mapper: {
            doc: {
                base: {
                    t: ['@h/@d/base.tss'],
                    h: '@h/@d/base.html'
                },
                body: {
                    t: ['@h/@d/body.tss'],
                    h: '@h/@d/body.html'
                },
                head: {
                    t: ['@h/@d/head.tss'],
                    h: '@h/@d/head.html'
                },
                html: {
                    t: ['@h/@d/html.tss'],
                    h: '@h/@d/html.html'
                },
                link: {
                    t: ['@h/@d/link.tss'],
                    h: '@h/@d/link.html'
                },
                linkIcon: {
                    t: ['@h/@d/link-icon.tss'],
                    h: '@h/@d/link.html'
                },
                meta: {
                    t: ['@h/@d/meta.tss'],
                    h: '@h/@d/meta.html'
                },
                noscript: {
                    t: ['@h/@d/noscript.tss'],
                    h: '@h/@d/noscript.html'
                },
                script: {
                    t: ['@h/@d/script.tss'],
                    h: '@h/@d/script.html'
                },
                style: {
                    t: ['@h/@d/style.tss'],
                    h: '@h/@d/style.html'
                },
                title: {
                    t: ['@h/@d/title.tss'],
                    h: '@h/@d/title.html'
                }
            },
            element: {
                a: {
                    t: ['@h/@e/a.tss'],
                    h: '@h/@e/a.html'
                },
                article: {
                    t: ['@h/@e/article.tss'],
                    h: '@h/@e/article.html'
                },
                aside: {
                    t: ['@h/@e/aside.tss'],
                    h: '@h/@e/aside.html'
                },
                br: {
                    t: ['@h/@e/br.tss'],
                    h: '@h/@e/br.html'
                },
                data: {
                    t: ['@h/@e/data.tss'],
                    h: '@h/@e/data.html'
                },
                details: {
                    t: ['@h/@e/details.tss'],
                    h: '@h/@e/details.html'
                },
                dialog: {
                    t: ['@h/@e/dialog.tss'],
                    h: '@h/@e/dialog.html'
                },
                div: {
                    t: ['@h/@e/div.tss'],
                    h: '@h/@e/div.html'
                },
                footer: {
                    t: ['@h/@e/footer.tss'],
                    h: '@h/@e/footer.html'
                },
                header: {
                    t: ['@h/@e/header.tss'],
                    h: '@h/@e/header.html'
                },
                hr: {
                    t: ['@h/@e/hr.tss'],
                    h: '@h/@e/hr.html'
                },
                iframe: {
                    t: ['@h/@e/iframe.tss'],
                    h: '@h/@e/iframe.html'
                },
                main: {
                    t: ['@h/@e/main.tss'],
                    h: '@h/@e/main.html'
                },
                meter: {
                    t: ['@h/@e/meter.tss'],
                    h: '@h/@e/meter.html'
                },
                nav: {
                    t: ['@h/@e/nav.tss'],
                    h: '@h/@e/nav.html'
                },
                section: {
                    t: ['@h/@e/section.tss'],
                    h: '@h/@e/section.html'
                },
                span: {
                    t: ['@h/@e/span.tss'],
                    h: '@h/@e/span.html'
                },
                summary: {
                    t: ['@h/@e/summary.tss'],
                    h: '@h/@e/summary.html'
                },
                template: {
                    t: ['@h/@e/template.tss'],
                    h: '@h/@e/template.html'
                },
                time: {
                    t: ['@h/@e/time.tss'],
                    h: '@h/@e/time.html'
                },
                wbr: {
                    t: ['@h/@e/wbr.tss'],
                    h: '@h/@e/wbr.html'
                }
            },
            form: {
                button: {
                    t: ['@h/@f/button.tss'],
                    h: '@h/@f/button.html'
                },
                buttonSubmit: {
                    t: ['@h/@f/button-submit.tss'],
                    h: '@h/@f/button.html'
                },
                buttonReset: {
                    t: ['@h/@f/button-reset.tss'],
                    h: '@h/@f/button.html'
                },
                buttonButton: {
                    t: ['@h/@f/button-button.tss'],
                    h: '@h/@f/button.html'
                },
                datalist: {
                    t: ['@h/@f/datalist.tss'],
                    h: '@h/@f/datalist.html'
                },
                fieldset: {
                    t: ['@h/@f/fieldset.tss'],
                    h: '@h/@f/fieldset.html'
                },
                form: {
                    t: ['@h/@f/form.tss'],
                    h: '@h/@f/form.html'
                },
                input: {
                    t: ['@h/@f/input.tss'],
                    h: '@h/@f/input.html'
                },
                inputButton: {
                    t: ['@h/@f/input-button.tss'],
                    h: '@h/@f/input.html'
                },
                inputCheckbox: {
                    t: ['@h/@f/input-checkbox.tss'],
                    h: '@h/@f/input.html'
                },
                inputColor: {
                    t: ['@h/@f/input-color.tss'],
                    h: '@h/@f/input.html'
                },
                inputDate: {
                    t: ['@h/@f/input-date.tss'],
                    h: '@h/@f/input.html'
                },
                inputDatetime: {
                    t: ['@h/@f/input-datetime.tss'],
                    h: '@h/@f/input.html'
                },
                inputDatetimeLocal: {
                    t: ['@h/@f/input-datetime-local.tss'],
                    h: '@h/@f/input.html'
                },
                inputEmail: {
                    t: ['@h/@f/input-email.tss'],
                    h: '@h/@f/input.html'
                },
                inputFile: {
                    t: ['@h/@f/input-file.tss'],
                    h: '@h/@f/input.html'
                },
                inputHidden: {
                    t: ['@h/@f/input-hidden.tss'],
                    h: '@h/@f/input.html'
                },
                inputImage: {
                    t: ['@h/@f/input-image.tss'],
                    h: '@h/@f/input.html'
                },
                inputMonth: {
                    t: ['@h/@f/input-month.tss'],
                    h: '@h/@f/input.html'
                },
                inputNumber: {
                    t: ['@h/@f/input-number.tss'],
                    h: '@h/@f/input.html'
                },
                inputPassword: {
                    t: ['@h/@f/input-password.tss'],
                    h: '@h/@f/input.html'
                },
                inputRadio: {
                    t: ['@h/@f/input-radio.tss'],
                    h: '@h/@f/input.html'
                },
                inputRange: {
                    t: ['@h/@f/input-range.tss'],
                    h: '@h/@f/input.html'
                },
                inputReset: {
                    t: ['@h/@f/input-reset.tss'],
                    h: '@h/@f/input.html'
                },
                inputSearch: {
                    t: ['@h/@f/input-search.tss'],
                    h: '@h/@f/input.html'
                },
                inputSubmit: {
                    t: ['@h/@f/input-submit.tss'],
                    h: '@h/@f/input.html'
                },
                inputTel: {
                    t: ['@h/@f/input-tel.tss'],
                    h: '@h/@f/input.html'
                },
                inputText: {
                    t: ['@h/@f/input-text.tss'],
                    h: '@h/@f/input.html'
                },
                inputTime: {
                    t: ['@h/@f/input-time.tss'],
                    h: '@h/@f/input.html'
                },
                inputUrl: {
                    t: ['@h/@f/input-url.tss'],
                    h: '@h/@f/input.html'
                },
                inputWeek: {
                    t: ['@h/@f/input-week.tss'],
                    h: '@h/@f/input.html'
                },
                label: {
                    t: ['@h/@f/label.tss'],
                    h: '@h/@f/label.html'
                },
                legend: {
                    t: ['@h/@f/legend.tss'],
                    h: '@h/@f/legend.html'
                },
                optgroup: {
                    t: ['@h/@f/optgroup.tss'],
                    h: '@h/@f/optgroup.html'
                },
                option: {
                    t: ['@h/@f/option.tss'],
                    h: '@h/@f/option.html'
                },
                output: {
                    t: ['@h/@f/output.tss'],
                    h: '@h/@f/output.html'
                },
                progress: {
                    t: ['@h/@f/progress.tss'],
                    h: '@h/@f/progress.html'
                },
                select: {
                    t: ['@h/@f/select.tss'],
                    h: '@h/@f/select.html'
                },
                textarea: {
                    t: ['@h/@f/textarea.tss'],
                    h: '@h/@f/textarea.html'
                }
            },
            typography: {
                abbr: {
                    t: ['@h/@t/abbr.tss'],
                    h: '@h/@t/abbr.html'
                },
                address: {
                    t: ['@h/@t/address.tss'],
                    h: '@h/@t/address.html'
                },
                bdi: {
                    t: ['@h/@t/bdi.tss'],
                    h: '@h/@t/bdi.html'
                },
                bdo: {
                    t: ['@h/@t/bdo.tss'],
                    h: '@h/@t/bdo.html'
                },
                blockquote: {
                    t: ['@h/@t/blockquote.tss'],
                    h: '@h/@t/blockquote.html'
                },
                dd: {
                    t: ['@h/@t/dd.tss'],
                    h: '@h/@t/dd.html'
                },
                dfn: {
                    t: ['@h/@t/dfn.tss'],
                    h: '@h/@t/dfn.html'
                },
                dl: {
                    t: ['@h/@t/dl.tss'],
                    h: '@h/@t/dl.html'
                },
                dlRow: {
                    t: ['@h/@t/dl-row.tss']
                },
                dt: {
                    t: ['@h/@t/dt.tss'],
                    h: '@h/@t/dt.html'
                },
                h1: {
                    t: ['@h/@t/h1.tss'],
                    h: '@h/@t/h1.html'
                },
                h2: {
                    t: ['@h/@t/h2.tss'],
                    h: '@h/@t/h2.html'
                },
                h3: {
                    t: ['@h/@t/h3.tss'],
                    h: '@h/@t/h3.html'
                },
                h4: {
                    t: ['@h/@t/h4.tss'],
                    h: '@h/@t/h4.html'
                },
                h5: {
                    t: ['@h/@t/h5.tss'],
                    h: '@h/@t/h5.html'
                },
                h6: {
                    t: ['@h/@t/h6.tss'],
                    h: '@h/@t/h6.html'
                },
                p: {
                    t: ['@h/@t/p.tss'],
                    h: '@h/@t/p.html'
                },
                small: {
                    t: ['@h/@t/small.tss'],
                    h: '@h/@t/small.html'
                },
                b: {
                    t: ['@h/@t/b.tss'],
                    h: '@h/@t/b.html'
                },
                em: {
                    t: ['@h/@t/em.tss'],
                    h: '@h/@t/em.html'
                },
                i: {
                    t: ['@h/@t/i.tss'],
                    h: '@h/@t/i.html'
                },
                u: {
                    t: ['@h/@t/u.tss'],
                    h: '@h/@t/u.html'
                },
                ins: {
                    t: ['@h/@t/ins.tss'],
                    h: '@h/@t/ins.html'
                },
                del: {
                    t: ['@h/@t/del.tss'],
                    h: '@h/@t/del.html'
                },
                cite: {
                    t: ['@h/@t/cite.tss'],
                    h: '@h/@t/cite.html'
                },
                code: {
                    t: ['@h/@t/code.tss'],
                    h: '@h/@t/code.html'
                },
                pre: {
                    t: ['@h/@t/pre.tss'],
                    h: '@h/@t/pre.html'
                },
                kbd: {
                    t: ['@h/@t/kbd.tss'],
                    h: '@h/@t/kbd.html'
                },
                s: {
                    t: ['@h/@t/s.tss'],
                    h: '@h/@t/s.html'
                },
                samp: {
                    t: ['@h/@t/samp.tss'],
                    h: '@h/@t/samp.html'
                },
                mark: {
                    t: ['@h/@t/mark.tss'],
                    h: '@h/@t/mark.html'
                },
                ul: {
                    t: ['@h/@t/ul.tss'],
                    h: '@h/@t/ul.html'
                },
                ol: {
                    t: ['@h/@t/ol.tss'],
                    h: '@h/@t/ol.html'
                },
                li: {
                    t: ['@h/@t/li.tss'],
                    h: '@h/@t/li.html'
                },
                q: {
                    t: ['@h/@t/q.tss'],
                    h: '@h/@t/q.html'
                },
                rp: {
                    t: ['@h/@t/rp.tss'],
                    h: '@h/@t/rp.html'
                },
                rt: {
                    t: ['@h/@t/rt.tss'],
                    h: '@h/@t/rt.html'
                },
                ruby: {
                    t: ['@h/@t/ruby.tss'],
                    h: '@h/@t/ruby.html'
                },
                strong: {
                    t: ['@h/@t/strong.tss'],
                    h: '@h/@t/strong.html'
                },
                sub: {
                    t: ['@h/@t/sub.tss'],
                    h: '@h/@t/sub.html'
                },
                sup: {
                    t: ['@h/@t/sup.tss'],
                    h: '@h/@t/sup.html'
                },
                var: {
                    t: ['@h/@t/var.tss'],
                    h: '@h/@t/var.html'
                }
            },
            table: {
                caption: {
                    t: ['@h/@tb/caption.tss'],
                    h: '@h/@tb/caption.html'
                },
                col: {
                    t: ['@h/@tb/col.tss'],
                    h: '@h/@tb/col.html'
                },
                colgroup: {
                    t: ['@h/@tb/colgroup.tss'],
                    h: '@h/@tb/colgroup.html'
                },
                table: {
                    t: ['@h/@tb/table.tss'],
                    h: '@h/@tb/table.html'
                },
                tbody: {
                    t: ['@h/@tb/tbody.tss'],
                    h: '@h/@tb/tbody.html'
                },
                td: {
                    t: ['@h/@tb/td.tss'],
                    h: '@h/@tb/td.html'
                },
                tfoot: {
                    t: ['@h/@tb/tfoot.tss'],
                    h: '@h/@tb/tfoot.html'
                },
                th: {
                    t: ['@h/@tb/th.tss'],
                    h: '@h/@tb/th.html'
                },
                thead: {
                    t: ['@h/@tb/thead.tss'],
                    h: '@h/@tb/thead.html'
                },
                tr: {
                    t: ['@h/@tb/tr.tss'],
                    h: '@h/@tb/tr.html'
                }
            },
            media: {
                area: {
                    t: ['@h/@m/area.tss'],
                    h: '@h/@m/area.html'
                },
                audio: {
                    t: ['@h/@m/audio.tss'],
                    h: '@h/@m/audio.html'
                },
                canvas: {
                    t: ['@h/@m/canvas.tss'],
                    h: '@h/@m/canvas.html'
                },
                embed: {
                    t: ['@h/@m/embed.tss'],
                    h: '@h/@m/embed.html'
                },
                figcaption: {
                    t: ['@h/@m/figcaption.tss'],
                    h: '@h/@m/figcaption.html'
                },
                figure: {
                    t: ['@h/@m/figure.tss'],
                    h: '@h/@m/figure.html'
                },
                img: {
                    t: ['@h/@m/img.tss'],
                    h: '@h/@m/img.html'
                },
                map: {
                    t: ['@h/@m/map.tss'],
                    h: '@h/@m/map.html'
                },
                object: {
                    t: ['@h/@m/object.tss'],
                    h: '@h/@m/object.html'
                },
                path: {
                    t: ['@h/@m/path.tss'],
                    h: '@h/@m/path.html'
                },
                param: {
                    t: ['@h/@m/param.tss'],
                    h: '@h/@m/param.html'
                },
                picture: {
                    t: ['@h/@m/picture.tss'],
                    h: '@h/@m/picture.html'
                },
                source: {
                    t: ['@h/@m/source.tss'],
                    h: '@h/@m/source.html'
                },
                svg: {
                    t: ['@h/@m/svg.tss'],
                    h: '@h/@m/svg.html'
                },
                track: {
                    t: ['@h/@m/track.tss'],
                    h: '@h/@m/track.html'
                },
                video: {
                    t: ['@h/@m/video.tss'],
                    h: '@h/@m/video.html'
                }
            }
        }
    }
};