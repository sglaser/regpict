/*globals define */
/*jslint plusplus:true, white:true, vars:true, regexp:true, nomen:true */
/*jshint jquery:true, browser:true, funcscope:true, laxbreak:true, laxcomma:true */

// Module core/regpict
// Handles register pictures in the document. This encompasses two primary operations. One is
// extracting register information from a variety of table styles. The other is inventing an
// svg diagram that represents the fields in the table.
define(
    ["text!regpict.css",
     "jquery",
//     "core/utils",
     "jquery-svg"],
    function(css) {
        "use strict";

        function pget(obj, prop, def) {
            if ((obj !== null) && obj.hasOwnProperty(prop)) {
                return obj[prop];
            }
            return def;
        }

        function draw_regpict(divsvg, svg, reg) {
            var width = Number(pget(reg, "width", 32));
            var unused = String(pget(reg, "unused", "RsvdP"));
            var defaultAttr = String(pget(reg, "defaultAttr", "other"));
            var cellWidth = Number(pget(reg, "cellWidth", 16));
            var cellHeight = Number(pget(reg, "cellHeight", 32));
            var cellInternalHeight = Number(pget(reg, "cellInternalHeight", 8));
            var cellValueTop = Number(pget(reg, "cellValueTop", 32)); // top of text for regFieldValueInternal
            var cellBitValueTop = Number(pget(reg, "cellBitValueTop", 36)); // top of text for regFieldBitValue
            var cellNameTop = Number(pget(reg, "cellNameTop", 32)); // top of text for regFieldNameInternal
            var bracketHeight = Number(pget(reg, "bracketHeight", 4));
            var cellTop = Number(pget(reg, "cellTop", 16));
            var figName = String(pget(reg, "name", "???"));
            var fields = pget(reg, "fields", { }); // default to empty register

            //console.log("draw_regpict: width=" + width + " unused ='" + unused + "' cellWidth=" + cellWidth + " cellHeight=" + cellHeight + " cellInternalHeight=" + cellInternalHeight + " cellTop=" + cellTop + " bracketHeight=" + bracketHeight);
            //console.log("draw_regpict: fields=" + fields.toString());

            // sanitize field array to avoid subsequent problems
            for (var index in fields) {
                if (fields.hasOwnProperty(index)) {
                    var item = fields[index];
                    if (item.hasOwnProperty("msb") && !item.hasOwnProperty("lsb")) {
                        item.lsb = item.msb;
                    }
                    if (item.hasOwnProperty("lsb") && !item.hasOwnProperty("msb")) {
                        item.msb = item.lsb;
                    }
                    if (!item.hasOwnProperty("unused")) {
                        item.unused = false;
                    }
                    if (!item.hasOwnProperty("attr")) {
                        item.attr = defaultAttr;
                    }
                    if (!item.hasOwnProperty("name")) {
                        item.name = index;
                    }
                    if (!item.hasOwnProperty("value")) {
                        item.value = "";
                    }
                    if (!item.hasOwnProperty("class")) {
                        item.class = "";
                    }
                    //console.log("draw_regpict: field msb=" + item.msb + " lsb=" + item.lsb + " attr=" + item.attr + " unused=" + item.unused + " name='" + item.name + "'");

                }
            }

            var bitarray = [];  // Array indexed by bit # in register range 0:width
            // field[bitarray[N]] contains bit N
            // bitarray[N] == -1 for unused bits
            // bitarray[N] == 1000 for first bit outside register width

            var i, j;
            bitarray[width] = 1000; //???
            for (i = 0; i < width; i++) {
                bitarray[i] = null;
            }

            for (index in fields) {
                if (fields.hasOwnProperty(index)) {
                    for (i = fields[index].lsb; i <= fields[index].msb; i++) {
                        bitarray[i] = index;
                    }
                }
            }

            var lsb = -1;   // if >= 0, contains bit# of lsb of a string of unused bits 
            for (i = 0; i <= width; ++i) {
                if (lsb >= 0 && bitarray[i] !== null) {
                    // first "used" bit after stretch of unused bits, invent an "unused" field
                    index = "_unused_" + (i - 1); // _unused_msb
                    if (lsb !== (i - 1)) {
                        index = index + "_" + lsb;  // _unused_msb_lsb
                    }
                    fields[index] = {
                        "msb":    i - 1,
                        "lsb":    lsb,
                        "name": ((i - lsb) * 2 - 1) >= unused.length ? unused : unused[0].toUpperCase(), // use full name if if fits, else use 1st char
                        "attr":   unused.toLowerCase(),   // attribute is name
                        "unused": true,
                        "value":  ""
                    };
                    for (j = lsb; j < i; j++) {
                        bitarray[j] = index;
                    }
                    lsb = -1;
                }
                if (lsb < 0 && bitarray[i] === null) {
                    // starting a string of unused bits
                    lsb = i;
                }
            }

            // x position of left edge of bit i
            function leftOf(i) {
                return cellWidth * (width - i - 0.5);
            }

            // x position of right edge of bit i
            function rightOf(i) {
                return cellWidth * (width - i + 0.5);
            }

            // x position of middle of bit i
            function middleOf(i) {
                return cellWidth * (width - i);
            }

            var g, p, f, text;
            var nextBitLine = cellTop + cellHeight + 20; //76;
            var bitLineCount = 0;
            var max_text_width = 0;

            for (var b = 0; b < width; b++) {
                for (i in fields) {
                    if (fields.hasOwnProperty(i)) {
                        f = fields[i];
                        var gclass = ["regFieldInternal", "regAttr_" + f.attr, "regLink"];
                        if (b === f.lsb) {
                            g = svg.group();
                            text = svg.text(g, middleOf(f.lsb), cellTop - 4,
                                            svg.createText().string(f.lsb), {
                                    class_: "regBitNum"
                                });
                            if (f.lsb !== f.msb) {
                                svg.text(g, middleOf(f.msb), cellTop - 4,
                                         svg.createText().string(f.msb), {
                                        class_: "regBitNum"
                                    });
                            }
                            svg.line(g,
                                     rightOf(f.lsb), cellTop,
                                     rightOf(f.lsb), cellTop - text.clientHeight,
                                     { class_: (f.lsb === 0)? "regBitNumLine" : "regBitNumLine_Hide"});
                            svg.line(g,
                                     leftOf(f.msb), cellTop,
                                     leftOf(f.msb), cellTop - text.clientHeight,
                                     { class_: "regBitNumLine" });
                            if ("class" in f && typeof f.class === "string") {
                                gclass = gclass.concat(f.class.split(/\s+/));
                            }
                            if (f.unused) {
                                gclass.push("regFieldUnused");
                            }
                            svg.rect(g, leftOf(f.msb), cellTop, rightOf(f.lsb) - leftOf(f.msb), cellHeight,
                                     0, 0, {
                                    class_: "regFieldBox"
                                });
                            for (j = f.lsb + 1; j <= f.msb; j++) {
                                svg.line(g,
                                         rightOf(j), cellTop + cellHeight - cellInternalHeight,
                                         rightOf(j), cellTop + cellHeight,
                                         { class_: "regFieldBox" });
                            }
                            text = svg.text(g, (leftOf(f.msb) + rightOf(f.lsb)) / 2, cellNameTop,
                                            svg.createText().string(f.name),
                                            { class_: "regFieldName" });
                            if (!f.unused) {
                                var $temp_dom = $("<span></span>").prependTo(divsvg);
                                var unique_id = $temp_dom.makeID("regpict", (f.id ? f.id : (figName + "-" + f.name)));
                                $temp_dom.remove();
                                svg.change(g, { id: unique_id });
                            }
                            if (f.value !== "") {
                                if (Array.isArray(f.value) && f.value.length === (f.msb - f.lsb + 1)) {
                                    for (i = 0; i < f.value.length; ++i) {
                                        svg.text(g, (leftOf(f.lsb + i) + rightOf(f.lsb + i)) / 2,
                                                 cellBitValueTop,
                                                 svg.createText().string(f.value[i]),
                                                 {
                                                     class_: ("regFieldValue regFieldBitValue" +
                                                         " regFieldBitValue-" + i.toString() +
                                                         ((i === (f.value.length - 1)) ?
                                                          " regFieldBitValue-msb" : ""))
                                                 });
                                    }
                                } else if ((typeof(f.value) === "string") || (f.value instanceof String)) {
                                    svg.text(g, (leftOf(f.msb) + rightOf(f.lsb)) / 2,
                                             (f.msb === f.lsb ? cellBitValueTop : cellValueTop),
                                             svg.createText().string(f.value),
                                             { class_: "regFieldValue" });
                                } else {
                                    svg.text(g, (leftOf(f.msb) + rightOf(f.lsb)) / 2, cellValueTop,
                                             svg.createText().string("INVALID VALUE"),
                                             { class_: "svg_error" });
                                }
                            }
                            var text_width = text.clientWidth;
                            if (text_width === 0) {
                                // bogus fix to guess width when clientWidth is 0 (e.g. IE10)
                                text_width = f.name.length * 6; // Assume 6px per character on average for 15px height chars
                            }
                            if (text_width > max_text_width) {
                                max_text_width = text_width;
                            }
                            var text_height = text.clientHeight;
                            if (text_height === 0) {
                                // bogus fix to guess width when clientHeight is 0 (e.g. IE10)
                                text_height = 18;             // Assume 18px: 1 row of text, 15px high
                            }
                            /*console.log("field " + f.name +
                             " msb=" + f.msb +
                             " lsb=" + f.lsb +
                             " attr=" + f.attr +
                             " unused=" + f.unused +
                             (("id" in f) ? f.id : ""));
                             console.log(" text.clientWidth=" + text.clientWidth +
                             " text_width=" + text_width +
                             " text.clientHeight=" + text.clientHeight +
                             " text_height=" + text_height +
                             " rightOf(msb)=" + rightOf(f.lsb) +
                             " leftOf(lsb)=" + leftOf(f.msb) +
                             " boxWidth=" + (rightOf(f.lsb) - leftOf(f.msb)));*/
                            /* if field has a specified value,
                             the field name is too wide for the box,
                             or the field name is too tall for the box */
                            if ((f.value !== "") ||
                                ((text_width + 2) > (rightOf(f.lsb) - leftOf(f.msb))) ||
                                ((text_height + 2) > (cellHeight - cellInternalHeight))) {
                                svg.change(text,
                                           {
                                               x:      rightOf(-0.5),
                                               y:      nextBitLine,
                                               class_: "regFieldName"
                                           });
                                p = svg.createPath();
                                p.move(leftOf(f.msb), cellTop + cellHeight);
                                p.line((f.msb - f.lsb + 1) * cellWidth / 2, bracketHeight, true);
                                p.line(rightOf(f.lsb), cellTop + cellHeight);
                                svg.path(g, p,
                                         {
                                             class_: "regBitBracket",
                                             fill:   "none"
                                         });
                                p = svg.createPath();
                                p.move(middleOf(f.lsb + ((f.msb - f.lsb) / 2)), cellTop + cellHeight + bracketHeight);
                                p.vert(nextBitLine - text_height / 4);
                                p.horiz(rightOf(-0.4));
                                svg.path(g, p,
                                         {
                                             class_: "regBitLine",
                                             fill:   "none"
                                         });
                                gclass[0] = "regFieldExternal";
                                gclass.push("regFieldExternal" + (bitLineCount < 2 ? "0" : "1"));
                                nextBitLine += text_height + 2;
                                bitLineCount = (bitLineCount + 1) % 4;
                            }
                            svg.change(g, { class_: gclass.join(" ") });
                        }
                    }
                }
            }
            svg.configure({
                              height:        nextBitLine + "px",
                              width:         (max_text_width + rightOf(-1)) + "px",
//                              viewBox:       "0 0 " + (max_text_width + rightOf(-1)) + " " + nextBitLine,
                              "xmlns:xlink": "http://www.w3.org/1999/xlink"
                          });
        }

        return {
            run: function(conf, doc, cb, msg) {
                msg.pub("start", "core/regpict");
                if (!(conf.noReSpecCSS)) {
                    $(doc).find("head link").first().before($("<style></style>").text(css));
                }
                var figNum = 1;
                $("figure.register", doc).each(
                    function() {
                        var parsed, $tbody, pattern, bitpattern;
                        var $fig = $(this);
                        var json = { };
                        if ($fig.attr("id")) {
                            json.name = $fig.attr("id").replace(/^fig-/, "");
                        } else if ($fig.attr("title")) {
                            json.name = $fig.attr("title");
                        } else if ($("figcaption", this)) {
                            json.name = $("figcaption", this).text();
                        } else {
                            json.name = "unnamed-" + figNum;
                            figNum++;
                        }
                        json.name = json.name
                            .replace(/^\s+/, "")
                            .replace(/\s+$/, "")
                            .replace(/[^\-.0-9a-z_]+/ig, "-")
                            .replace(/^-+/, "")
                            .replace(/-+$/, "")
                            .replace(/\.$/, ".x")
                            .replace(/^([^a-z])/i, "x$1")
                            .replace(/^$/, "generatedID");
                        if (!$fig.attr("id")) {
                            $fig.attr("id", "fig-" + json.name);
                        }
                        msg.pub("start", "core/regpict figure id='" + $fig.attr("id") + "'");

                        var temp = $fig.attr("data-json");
                        if (temp !== null && temp !== undefined && temp !== "") {
                            $.extend(true, json, $.parseJSON(temp));
                        }

                        temp = $fig.attr("data-width");
                        if (temp !== null && temp !== undefined && temp !== "") {
                            json.width = temp;
                        }

                        temp = $fig.attr("data-unused");
                        if (temp !== null && temp !== undefined && temp !== "") {
                            json.unused = temp;
                        }

                        temp = $fig.attr("data-href");
                        if (temp !== null && temp !== undefined && temp !== "") {
                            json.href = temp;
                        }

                        temp = $fig.attr("data-table");
                        if (temp !== null && temp !== undefined && temp !== "") {
                            json.table = temp;
                        }

                        temp = $fig.attr("data-register");
                        if (temp !== null && temp !== undefined && temp !== "") {
                            json.register = temp;
                        }

                        $("pre.json,div.json,span.json", $fig).each(function() {
                            $.extend(true, json, $.parseJSON(this.textContent));
                            $(this).hide();
                        });

                        if ($fig.hasClass("pcisig_reg") && json.hasOwnProperty("table")) {
                            parsed = { fields: { } };
                            $tbody = $(json.table + " tbody", doc).first();
                            //console.log("pcisig_reg: tbody='" + $tbody.get(0).outerHTML);
                            $tbody.children().each(function() {
                                var $td = $(this).children();
                                if ($td.length >= 3) {
                                    var bits = $td[0].textContent;
                                    var desc = $td[1];
                                    var attr = $td[2].textContent.toLowerCase();
                                    var lsb, msb, match;
                                    lsb = msb = -1;
                                    match = /^\s*(\d+)\s*(:\s*(\d+))?\s*$/.exec(bits);
                                    if (match) {
                                        msb = lsb = Number(match[1]);
                                        if ((typeof(match[3]) === "string") && (match[3] !== "")) {
                                            lsb = Number(match[3]);
                                        }
                                        if (lsb > msb) {
                                            msb = lsb;
                                            lsb = Number(match[1]);
                                        }
                                    }
                                    var fieldName;
                                    var $dfn = $("code:first, dfn:first", desc);
                                    if ($dfn.length === 0) {
                                        fieldName = /^\s*(\w+)/.exec(desc.textContent)[1];
                                    } else {
                                        fieldName = $dfn.first().text().trim();
                                    }
                                    var validAttr = /^(rw|rws|ro|ros|rw1c|rw1cs|rw1s|rw1ss|wo|wos|hardwired|fixed|hwinit|rsvd|rsvdp|rsvdz|reserved|unused|other)$/i;
                                    if (!validAttr.test(attr)) {
                                        attr = "other";
                                    }
                                    var unusedAttr = /^(rsvd|rsvdp|rsvdz|reserved|unused)$/i;
                                    var unused = !!unusedAttr.test(attr);
//                                    console.log("field: " + fieldName + " bits=\"" + bits + "\"  match=" + match + "\" lsb=" + lsb + " msb=" + msb + "  attr=" + attr + "  unused=" + unused);
                                    parsed.fields[fieldName] = {
                                        msb:    msb,
                                        lsb:    lsb,
                                        attr:   attr,
                                        unused: unused
                                    };
                                }
                            });
                            //console.log("parsed=" + JSON.stringify(parsed, null, 2));
                            $.extend(true, json, parsed);
//                            console.log("json=" + JSON.stringify(json, null, 2));
                        }

                        if ($fig.hasClass("nv_refman") && json.hasOwnProperty("href") && json.hasOwnProperty("register")) {
                            parsed = { fields: { } };
                            pattern =
                                new RegExp("^#\\s*define\\s+(" + json.register + ")(\\w*)\\s+(\\S*)\\s*/\\*\\s*(\\S\\S\\S\\S\\S)\\s*\\*/\\s*$");
                            bitpattern = /(\d+):(\d+)/;
                            if (!!conf.ajaxIsLocal) {
                                $.ajaxSetup({ isLocal: true});
                            }
                            conf.ajaxIsLocal = false;
                            $.ajax({
                                       dataType: "text",
                                       url:      json.href,
                                       async:    false,
                                       success:  function(data) {
                                           if (data) {
                                               var lines = data.split(/\n/);
                                               for (var i = 0; i < lines.length; i++) {
                                                   var match = pattern.exec(lines[i]);
                                                   if (match) {
                                                       if (!json.hasOwnProperty("width")) {
                                                           if ((match[2] === "") && (match[4].substr(4, 1) === "R")) {
                                                               var w = match[4].substr(3, 1);
                                                               if (w === "2") {
                                                                   parsed.width = 16;
                                                               } else if (w === "4") {
                                                                   parsed.width = 32;
                                                               } else if (w === "8") {
                                                                   parsed.width = 64;
                                                               } else {
                                                                   parsed.width = 32;
                                                               }
                                                           }
                                                       }
                                                       if ((match[2] !== "") && (match[4].substr(4, 1) === "F")) {
                                                           var bits = bitpattern.exec(match[3]);
                                                           if (bits) {
                                                               parsed.fields[match[1] + match[2]] = {
                                                                   msb:  Number(bits[1]),
                                                                   lsb:  Number(bits[2]),
                                                                   attr: match[4].substr(0, 2)
                                                                             .replace(/[^-r][^-w]/i, "other")
                                                                             .replace(/rw/i, "rw")
                                                                             .replace(/r-/i, "ro")
                                                                             .replace(/-w/i, "wo")};
                                                           } else {
                                                               msg.pub("error",
                                                                       "Unknown field width " + match[0]);
                                                           }
                                                       }
                                                   }
                                               }
                                               //console.log("parsed=" + JSON.stringify(parsed, null, 2));
                                               $.extend(true, json, parsed);
                                               //console.log("json=" + JSON.stringify(json, null, 2));
                                           }
                                       },
                                       error:    function(xhr, status, error) {
                                           msg.pub("error",
                                                   "regpict/nv_refman: Error including file data-href=" + json.href +
                                                       " data-register=" + json.register + " : " +
                                                       status + " (" + error + ")");
                                       }
                                   });
                        }

                        if (json === null) {
                            msg.pub("warn",
                                    "core/regpict: no register definition " + $fig.get(0).outerHTML);
                        }

                        // invent a div to hold the svg, if necessary
                        var $divsvg = $("div.svg", this);
                        if ($divsvg.length === 0) {
                            var $cap = $("figcaption", this);
                            if ($cap.length > 0) {
                                //console.log("inserting div.svg before <figcaption>");
                                $cap.before('<div class="svg"></div>');
                            } else {
                                //console.log("inserting div.svg at end of <figure>");
                                $(this).append('<div class="svg"></div>');
                            }
                            $divsvg = $("div.svg", this);
                        }
                        if (json !== null) {
                            $divsvg.first().svg(function(svg) {
                                draw_regpict(this, svg, json);
                            });
                        }
                    });
                msg.pub("end", "core/regpict");
                cb();
            }
        };
    });