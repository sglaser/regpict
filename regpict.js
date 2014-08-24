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
            var defaultUnused = String(pget(reg, "defaultUnused", "RsvdP"));
            var defaultAttr = String(pget(reg, "defaultAttr", "other"));
            var cellWidth = Number(pget(reg, "cellWidth", 16));
            var cellHeight = Number(pget(reg, "cellHeight", 32));
            var cellInternalHeight = Number(pget(reg, "cellInternalHeight", 8));
            var cellValueTop = Number(pget(reg, "cellValueTop", 16)); // top of text for regFieldValueInternal
            var cellBitValueTop = Number(pget(reg, "cellBitValueTop", 20)); // top of text for regFieldBitValue
            var cellNameTop = Number(pget(reg, "cellNameTop", 16)); // top of text for regFieldNameInternal
            var bracketHeight = Number(pget(reg, "bracketHeight", 4));
            var cellTop = Number(pget(reg, "cellTop", 40));
            var bitWidthPos = Number(pget(reg, "bitWidthPos", 20));
            var figName = String(pget(reg, "figName", "???"));
            var maxFigWidth = Number(pget(reg, "maxFigWidth", 720));   // 7.5 inches (assuming 96 px per inch)
            var figLeft = Number(pget(reg, "figLeft", 32));
            var visibleLSB = Number(pget(reg, "visibleLSB", 0));
            var visibleMSB = Number(pget(reg, "visibleMSB", width));
            var fields = pget(reg, "fields", { }); // default to empty register

            if (visibleMSB < 0) {
                visibleMSB = 0;
            }
            if (visibleMSB > width) {
                visibleMSB = width;
            }
            if (visibleLSB < 0) {
                visibleLSB = 0;
            }
            if (visibleLSB > width) {
                visibleLSB = width;
            }
            //console.log("draw_regpict: width=" + width + " defaultUnused ='" + defaultUnused + "' cellWidth=" + cellWidth + " cellHeight=" + cellHeight + " cellInternalHeight=" + cellInternalHeight + " cellTop=" + cellTop + " bracketHeight=" + bracketHeight);
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
                    if (!item.hasOwnProperty("isUnused")) {
                        item.isUnused = false;
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
                    //console.log("draw_regpict: field msb=" + item.msb + " lsb=" + item.lsb + " attr=" + item.attr + " isUnused=" + item.isUnused + " name='" + item.name + "'");

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
                        "msb":      (i - 1),
                        "lsb":      lsb,
                        "name":     ((i - lsb) * 2 - 1) >=
                                    defaultUnused.length ? defaultUnused : defaultUnused[0].toUpperCase(), // use full name if if fits, else use 1st char
                        "attr":     defaultUnused.toLowerCase(),   // attribute is name
                        "isUnused": true,
                        "value":    ""
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
                if (i > visibleMSB) {
                    return figLeft + 0;
                } else if (i >= visibleLSB) {
                    return figLeft + cellWidth * (width - i - 0.5 - (width - visibleMSB));
                } else if (i > 0) {
                    return figLeft + cellWidth * (width - visibleLSB - 1 - (width - visibleMSB));
                } else {
                    return figLeft + cellWidth * (width -  visibleLSB - i - 1 - (width - visibleMSB));
                }
            }

            // x position of right edge of bit i
            function rightOf(i) {
                if (i > visibleMSB) {
                    return figLeft + 0;
                } else if (i >= visibleLSB) {
                    return figLeft + cellWidth * (width - i + 0.5 - (width - visibleMSB));
                } else if (i > 0) {
                    return figLeft + cellWidth * (width - visibleLSB + 1 - (width - visibleMSB));
                } else {
                    return figLeft + cellWidth * (width - visibleLSB - i + 1 - (width - visibleMSB));
                }
            }

            // x position of middle of bit i
            function middleOf(i) {
                if (i > visibleMSB) {
                    return figLeft + 0;
                } else if (i >= visibleLSB) {
                    return figLeft + cellWidth * (width - i - (width - visibleMSB));
                } else if (i > 0) {
                    return figLeft + cellWidth * (width - visibleLSB - 0.5 - (width - visibleMSB));
                } else {
                    return figLeft + cellWidth * (width - visibleLSB - i - 0.5 - (width - visibleMSB));
                }
            }

            var g, p, f, text;
            var nextBitLine = cellTop + cellHeight + 20; //76;
            var bitLineCount = 0;
            var max_text_width = 0;

            for (var b = 0; b < width; b++) {
                for (i in fields) {
                    if (fields.hasOwnProperty(i)) {
                        f = fields[i];
                        var gAddClass = ["regFieldInternal", "regAttr_" + f.attr, "regLink"];
                        if (b === f.lsb) {
                            g = svg.group();
                            //var bitnum_width;
                            if (f.lsb === f.msb) {
                                text = svg.text(g, middleOf(f.lsb), cellTop - 4,
                                                svg.createText().string(f.lsb), {
                                        "class_": "regBitNumMiddle"
                                    });
                                /*console.log("bitnum-middle " + f.lsb + " at x=" + middleOf(f.lsb) + " y=" + (cellTop - 4));
                                bitnum_width = text.clientWidth;
                                if (bitnum_width === 0) {
                                    // bogus fix to guess width when clientWidth is 0 (e.g. IE10)
                                    bitnum_width = String(f.lsb).length * 4; // Assume 4px per character on average
                                }
                                if ((bitnum_width + 2) > cellWidth) {
                                    svg.change(text,
                                               {
                                                   x: middleOf(f.lsb),
                                                   y: cellTop,
                                                   transform: "rotate(270, " +
                                                              middleOf(f.lsb) + ", " +
                                                              (cellTop - 4) + ")",
                                                   "class_": "regBitNumStart"
                                               });
                                    console.log("bitnum-middle " + f.lsb + " at x=" + middleOf(f.lsb) + " y=" + (cellTop - 4) + " rotate=270");
                                }*/
                            } else {
                                if (f.lsb < visibleLSB) {
                                    gAddClass.push("regFieldOverflowLSB");
                                    text = svg.text(g, rightOf(f.lsb) + 2, cellTop - 4,
                                                    svg.createText().string("... " + f.lsb), {
                                            "class_": "regBitNumEnd"
                                        });
//                                    console.log("bitnum-right " + f.lsb + " at x=" + rightOf(f.lsb) + 2 + " y=" + (cellTop - 4));
                                } else {
                                    text = svg.text(g, rightOf(f.lsb) - 2, cellTop - 4,
                                                    svg.createText().string(f.lsb), {
                                            "class_": "regBitNumEnd"
                                        });
//                                    console.log("bitnum-right " + f.lsb + " at x=" + rightOf(f.lsb) - 2 + " y=" + (cellTop - 4));
                                }
                                /*bitnum_width = text.clientWidth;
                                if (bitnum_width === 0) {
                                    // bogus fix to guess width when clientWidth is 0 (e.g. IE10)
                                    bitnum_width = String(f.lsb).length * 4; // Assume 4px per character on average
                                }
                                if ((bitnum_width + 2) > ((leftOf(f.msb) - rightOf(f.lsb)) / 2)) {
                                     svg.change(text,
                                               {
                                                   x: middleOf(f.lsb),
                                                   y: cellTop,
                                                   transform: "rotate(270, " +
                                                              rightOf(f.lsb) + ", " +
                                                              (cellTop - 4) + ")",
                                                   "class_": "regBitNumStart"
                                               });
                                    console.log("bitnum-right " + f.lsb + " at x=" + rightOf(f.lsb) + " y=" + (cellTop - 4) + " rotate=270");
                                }*/
                                if (f.msb > visibleMSB) {
                                    gAddClass.push("regFieldOverflowMSB");
                                    text = svg.text(g, leftOf(f.msb) - 2, cellTop - 4,
                                                    svg.createText().string(f.msb + " ..."), {
                                            "class_": "regBitNumStart"
                                        });
//                                    console.log("bitnum-left " + f.lsb + " at x=" + leftOf(f.lsb) - 2 + " y=" + (cellTop - 4));
                                } else {
                                    text = svg.text(g, leftOf(f.msb) + 2, cellTop - 4,
                                             text = svg.createText().string(f.msb), {
                                            "class_": "regBitNumStart"
                                        });
//                                    console.log("bitnum-left " + f.lsb + " at x=" + leftOf(f.lsb) + 2 + " y=" + (cellTop - 4));
                                }
                                /*bitnum_width = text.clientWidth;
                                if (bitnum_width === 0) {
                                    // bogus fix to guess width when clientWidth is 0 (e.g. IE10)
                                    bitnum_width = String(f.msb).length * 4; // Assume 4px per character on average
                                }
                                if ((bitnum_width + 2) > ((leftOf(f.msb) - rightOf(f.lsb)) / 2)) {
                                    svg.change(text,
                                               {
                                                   x: middleOf(f.msb),
                                                   y: cellTop,
                                                   transform: "rotate(270, " +
                                                              leftOf(f.msb) + ", " +
                                                              (cellTop - 4) + ")",
                                                   "class_": "regBitNumStart"
                                               });
                                    console.log("bitnum-left " + f.lsb + " at x=" + leftOf(f.lsb) + " y=" + (cellTop - 4) + " rotate=270");
                                }*/
                            }
                            if (f.lsb >= visibleLSB) {
                                svg.line(g,
                                    rightOf(f.lsb), cellTop,
                                    rightOf(f.lsb), cellTop - (text.clientHeight * 0.75),
                                    { "class_": (f.lsb === visibleLSB) ? "regBitNumLine" : "regBitNumLine_Hide"});
                            }
                            if (f.msb <= visibleMSB) {
                                svg.line(g,
                                    leftOf(f.msb), cellTop,
                                    leftOf(f.msb), cellTop - (text.clientHeight * 0.75),
                                    { "class_": "regBitNumLine" });
                            }
                            if (f.hasOwnProperty("addClass") && typeof f.addClass === "string") {
                                gAddClass = gAddClass.concat(f.addClass.split(/\s+/));
                            }
                            if (f.isUnused) {
                                gAddClass.push("regFieldUnused");
                            }
                            svg.rect(g, leftOf(f.msb), cellTop, rightOf(f.lsb) - leftOf(f.msb), cellHeight,
                                     0, 0, {
                                    "class_": "regFieldBox"
                                });
                            for (j = f.lsb + 1; j <= f.msb; j++) {
                                if ((j >= visibleLSB) && (j <= visibleMSB)) {
                                    svg.line(g,
                                        rightOf(j), cellTop + cellHeight - cellInternalHeight,
                                        rightOf(j), cellTop + cellHeight,
                                        { "class_": "regFieldBox" });
                                }
                            }
                            text = svg.text(g, (leftOf(f.msb) + rightOf(f.lsb)) / 2, cellTop - bitWidthPos,
                                            svg.createText().string((f.msb === f.lsb)
                                                                        ? "1 bit"
                                                                        : (f.msb - f.lsb + 1) + " bits"),
                                            { "class_": "regBitWidth" });
                            text = svg.text(g, (leftOf(f.msb) + rightOf(f.lsb)) / 2, cellTop + cellNameTop,
                                            svg.createText().string(f.name),
                                            { "class_": "regFieldName" });
                            if ((!f.isUnused) && (f.lsb <= visibleMSB) && (f.msb >= visibleLSB)) {
                                var $temp_dom = $("<span></span>").prependTo(divsvg);
                                var unique_id = $temp_dom.makeID("regpict", (f.id ? f.id : (figName + "-" + f.name)));
                                $temp_dom.remove();
                                svg.change(g, { id: unique_id });
                            }
                            if (f.value !== "") {
                                if (Array.isArray(f.value) && f.value.length === (f.msb - f.lsb + 1)) {
                                    for (i = 0; i < f.value.length; ++i) {
                                        svg.text(g, (leftOf(f.lsb + i) + rightOf(f.lsb + i)) / 2,
                                                 cellTop + cellBitValueTop,
                                                 svg.createText().string(f.value[i]),
                                                 {
                                                     "class_": ("regFieldValue regFieldBitValue" +
                                                                " regFieldBitValue-" + i.toString() +
                                                                ((i === (f.value.length - 1)) ?
                                                                    " regFieldBitValue-msb" : ""))
                                                 });
                                    }
                                } else if ((typeof(f.value) === "string") || (f.value instanceof String)) {
                                    svg.text(g, (leftOf(f.msb) + rightOf(f.lsb)) / 2,
                                             cellTop + (f.msb === f.lsb ? cellBitValueTop : cellValueTop),
                                             svg.createText().string(f.value),
                                             { "class_": "regFieldValue" });
                                } else {
                                    svg.text(g, (leftOf(f.msb) + rightOf(f.lsb)) / 2, cellTop + cellValueTop,
                                             svg.createText().string("INVALID VALUE"),
                                             { "class_": "svg_error" });
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
                             " isUnused=" + f.isUnused +
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
                            if ((f.lsb > visibleMSB) || (f.msb < visibleLSB)) {
                                gAddClass[0] = "regFieldHidden";
                            } else {
                                if ((f.value !== "") ||
                                    ((text_width + 2) > (rightOf(f.lsb) - leftOf(f.msb))) ||
                                    ((text_height + 2) > (cellHeight - cellInternalHeight))) {
                                    svg.change(text,
                                        {
                                            x: rightOf(-0.5),
                                            y: nextBitLine,
                                            "class_": "regFieldName"
                                        });
                                    p = svg.createPath();
                                    p.move(leftOf(f.msb), cellTop + cellHeight);
                                    p.line(((rightOf(f.lsb) - leftOf(f.msb)) / 2), bracketHeight, true);
                                    p.line(rightOf(f.lsb), cellTop + cellHeight);
                                    svg.path(g, p,
                                        {
                                            "class_": "regBitBracket",
                                            fill: "none"
                                        });
                                    p = svg.createPath();
                                    p.move(middleOf(f.lsb + ((f.msb - f.lsb) / 2)), cellTop + cellHeight + bracketHeight);
                                    p.vert(nextBitLine - text_height / 4);
                                    p.horiz(rightOf(-0.4));
                                    svg.path(g, p,
                                        {
                                            "class_": "regBitLine",
                                            fill: "none"
                                        });
                                    gAddClass[0] = "regFieldExternal";
                                    gAddClass.push("regFieldExternal" + (bitLineCount < 2 ? "0" : "1"));
                                    nextBitLine += text_height + 2;
                                    bitLineCount = (bitLineCount + 1) % 4;
                                }
                            }
                            if ((f.msb > visibleLSB) && (f.lsb < visibleLSB)) {
                                svg.text(g, rightOf(0) + 2, cellTop + cellNameTop,
                                    svg.createText().string("..."),
                                    { "class_": "regFieldExtendsRight" });
                            }
                            if ((f.msb > visibleMSB) && (f.lsb < visibleMSB)) {
                                svg.text(g, leftOf(f.msb) - 2, cellTop + cellNameTop,
                                    svg.createText().string("..."),
                                    { "class_": "regFieldExtendsLeft" });
                            }
                            svg.change(g, { "class_": gAddClass.join(" ") });
                        }
                    }
                }
            }
            var scale = 1.0;
            max_text_width = max_text_width + rightOf(-1);
            if ((maxFigWidth > 0) && (max_text_width > maxFigWidth)) {
                scale = maxFigWidth / max_text_width;
            }
            svg.configure({
                              height:      (scale * nextBitLine) + "px",
                              width:       (scale * max_text_width) + "px",
                              viewBox:     "0 0 " + max_text_width + " " + nextBitLine,
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
                            json.figName = $fig.attr("id").replace(/^fig-/, "");
                        } else if ($fig.attr("title")) {
                            json.figName = $fig.attr("title");
                        } else if ($("figcaption", this)) {
                            json.figName = $("figcaption", this).text();
                        } else {
                            json.figName = "unnamed-" + figNum;
                            figNum++;
                        }
                        json.figName = json.figName
                            .replace(/^\s+/, "")
                            .replace(/\s+$/, "")
                            .replace(/[^\-.0-9a-z_]+/ig, "-")
                            .replace(/^-+/, "")
                            .replace(/-+$/, "")
                            .replace(/\.$/, ".x")
                            .replace(/^([^a-z])/i, "x$1")
                            .replace(/^$/, "generatedID");
                        if (!$fig.attr("id")) {
                            $fig.attr("id", "fig-" + json.figName);
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
                            json.defaultUnused = temp;
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
                                    var validAttr = /^(rw|rws|ro|ros|rw1c|rw1cs|rw1s|rw1ss|wo|wos|hardwired|fixed|hwinit|rsvd|rsvdp|rsvdz|reserved|ignored|ign|unused|other)$/i;
                                    if (!validAttr.test(attr)) {
                                        attr = "other";
                                    }
                                    var unusedAttr = /^(rsvd|rsvdp|rsvdz|reserved|ignored|ign|unused)$/i;
                                    var isUnused = !!unusedAttr.test(attr);
//                                    console.log("field: " + fieldName + " bits=\"" + bits + "\"  match=" + match + "\" lsb=" + lsb + " msb=" + msb + "  attr=" + attr + "  isUnused=" + isUnused);
                                    parsed.fields[fieldName] = {
                                        msb:      msb,
                                        lsb:      lsb,
                                        attr:     attr,
                                        isUnused: isUnused
                                    };
                                }
                            });
                            //console.log("parsed=" + JSON.stringify(parsed, null, 2));
                            $.extend(true, json, parsed);
//                            console.log("json=" + JSON.stringify(json, null, 2));
                        }

                        if ($fig.hasClass("nv_refman") && json.hasOwnProperty("href") &&
                            json.hasOwnProperty("register")) {
                            parsed = { fields: { } };
                            pattern = new RegExp("^#\\s*define\\s+(" + json.register +
                                                 ")(\\w*)\\s+(\\S*)\\s*/\\*\\s*(\\S\\S\\S\\S\\S)\\s*\\*/\\s*$");
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
                                                           if ((match[2] === "") &&
                                                               (match[4].substr(4, 1) === "R")) {
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
                                                       if ((match[2] !== "") &&
                                                           (match[4].substr(4, 1) === "F")) {
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
                                                   "regpict/nv_refman: Error including file data-href=" +
                                                   json.href +
                                                   " data-register=" + json.register + " : " +
                                                   status + " (" + error + ")");
                                       }
                                   });
                        }

                        // invent a div to hold the svg, if necessary
                        var $divsvg = $("div.svg", this).last();
                        if ($divsvg.length === 0) {
                            var $cap = $("figcaption", this);
                            if ($cap.length > 0) {
                                //console.log("inserting div.svg before <figcaption>");
                                $cap.before('<div class="svg"></div>');
                            } else {
                                //console.log("inserting div.svg at end of <figure>");
                                $(this).append('<div class="svg"></div>');
                            }
                            $divsvg = $("div.svg", this).last();
                        }

                        function merge_json(result, me) {
                            var $me = $(me);
                            var parents = $me.attr("data-parents");
                            if (parents !== null && parents !== undefined && parents !== "") {
                                // console.log("parents = \"" + parents + "\"");
                                parents = parents.split(/\s+/);
                                var i;
                                for (i = 0; i < parents.length; i++) {
                                    var $temp = $("#" + parents[i]);
                                    // console.log("merging: #" + parents[i]);
                                    if ($temp.length > 0) {
                                        // console.log("merge_json: adding \"" + $temp[0].textContent + "\"");
                                        merge_json(result, $temp[0]);
                                        //$.extend(true, result, $.parseJSON($temp[0].textContent));
                                        // console.log("result=" + JSON.stringify(result, null, 2));
                                        $temp.hide();
                                    }
                                }
                            }
                            // console.log("merge_json: adding \"" + me.textContent + "\"");
                            $.extend(true, result, $.parseJSON(me.textContent));
                            // console.log("result=" + JSON.stringify(result, null, 2));
                            $(me).hide();
                        }

                        var $render = $("pre.render,div.render,span.render", $fig);
                        if ($render.length > 0) {
                            $render.each(function(index) {
                                var temp_json = { };
                                $.extend(true, temp_json, json);
                                // console.log("temp_json=" + JSON.stringify(temp_json, null, 2));
                                merge_json(temp_json, this);
                                $(this).hide();
                                $divsvg.last().makeID("svg", "render-" + index);
                                $divsvg.last().svg(function(svg) {
                                    draw_regpict(this, svg, temp_json);
                                });
                                if (index < ($render.length - 1)) {
                                    $divsvg.after('<div class="svg"></div>');
                                    $divsvg = $("div.svg", $fig).last();
                                }
                            });
                        } else if (json !== null) {
                            $divsvg.last().svg(function(svg) {
                                draw_regpict(this, svg, json);
                            });
                        } else {
                            msg.pub("warn",
                                    "core/regpict: no register definition " + $fig.get(0).outerHTML);
                        }
                    });
                msg.pub("end", "core/regpict");
                cb();
            }
        };
    });