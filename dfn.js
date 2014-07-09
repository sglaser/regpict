/* jshint browser: true */
/* jshint jquery: true */
/* global define */
// Module core/dfn
// Handles the processing and linking of <dfn> and <a> elements.
define(
    [],
    function() {
        "use strict";
        var dfnClass = ["dfn", "pin", "signal", "op", "opcode", "operation", "request", "reply", "message", "msg",
                        "command", "term", "field", "register", "regpict", "state", "value", "parameter", "argument"];
        return {
            run: function(conf, doc, cb, msg) {
                msg.pub("start", "core/dfn");
                doc.normalize();
                if (!conf.definitionMap) {
                    conf.definitionMap = {};
                }
                if (!conf.definitionHTML) {
                    conf.definitionHTML = {};
                }

                //console.log("\n\n\n\n");

                $("table[id] dfn.field", doc).each(function() {
                    var $dfn = $(this);
                    var base_id = "field-" + $dfn.parents("table[id]")[0].id.replace(/^tbl-/, "") + "-";
                    var title = $dfn.dfnTitle();
                    //console.log("table[id] dfn.field  base_id=\"" + base_id + "\"");
                    //console.log("title.length = " + title.length + "  title=\"" + title.join("|||") + "\"");

                    if (conf.definitionMap[base_id + title[0]]) {
                        msg.pub("error", "Duplicate definition '" + base_id + title[0] + "'");
                        $dfn.append("<span class=\"respec-error\"> Definition '" + base_id + title[0] + "' is defined more than once </span>");
                    }
                    var id = $dfn.makeID(null, base_id + title[0]);
                    //console.log("<dfn class=\"field\" id=\"" + id + "\">" + $dfn.html() + "</dfn>");
                    conf.definitionMap[id] = id;
                    conf.definitionHTML[id] = $dfn.html();
                    for (i = 0; i < title.length; i++) {
                        //console.log("<dfn" + i + " class=\"field\" title=\"" + base_id + title[i] + "\">" + $dfn.html() + "</dfn>");
                        conf.definitionMap[base_id + title[i]] = conf.definitionMap[id];
                        conf.definitionHTML[base_id + title[i]] = conf.definitionHTML[id];
                    }

                });

                //console.log("\n\n\n\n");

                $("dfn", doc).each(function() {
                    var $dfn = $(this);
                    if ($dfn.hasClass("field") && ($dfn.parents("table[id]").length > 0)) {
                        return;
                    }
                    var tag = dfnClass[0];  // default "dfn"
                    for (var i = 1; i < dfnClass.length; i++) {
                        if ($dfn.hasClass(dfnClass[i])) {
                            tag = dfnClass[i];
                        }
                    }
                    var title = $dfn.dfnTitle();
                    //console.log("title.length = " + title.length + "  title=\"" + title.join("|||") + "\"");
                    if (conf.definitionMap[tag + "-" + title[0]]) {
                        msg.pub("error", "Duplicate definition '" + tag + "-" + title[0] + "'");
                        $dfn.append("<span class=\"respec-error\"> Definition '" + tag + "-" + title[0] + "' is defined more than once </span>");
                    }
                    var id = $dfn.makeID(tag, title[0]);
                    //console.log("<dfn class=\"" + tag + "\" id=\"" + id + "\">" + $dfn.html() + "</dfn>");
                    conf.definitionMap[id] = id;
                    conf.definitionHTML[id] = $dfn.html();
                    for (i = 0; i < title.length; i++) {
                        //console.log("<dfn" + i + " class=\"" + tag + "\" title=\"" + tag + "-" + title[i] + "\">" + $dfn.html() + "</dfn>");
                        conf.definitionMap[tag + "-" + title[i]] = conf.definitionMap[id];
                        conf.definitionHTML[tag + "-" + title[i]] = conf.definitionHTML[id];
                    }
                });

                //console.log("\n\n\n\n");

                $("div.hasSVG g[id]", doc).each(function() {
                    var $text = $("text.regFieldName", this).first();
                    if ($text) {
                        var title = $text.dfnTitle();
                        var id = $(this).attr("id");
                        //console.log("<dfn class=\"regpict\" id=\"" + id + "\">" + $(this).text() + "</dfn>");
                        conf.definitionMap[id] = id;
                        conf.definitionHTML[id] = $text.text();
                        var found = null;
                        for (i = 0; i < title.length; i++) {
                            //console.log("<dfn" + i + " class=\"regpict\" title=\"regpict-" + title[i] + "\">" + $(this).text() + "</dfn>");
                            conf.definitionMap["regpict-" + title[i]] = id;
                            conf.definitionHTML["regpict-" + title[i]] = conf.definitionHTML[id];
                            if (conf.definitionMap["field-" + title[i]]) {
                                found = conf.definitionMap["field-" + title[i]];
                            }
                        }
                        id = id.replace(/^regpict-/, "field-");
                        if (conf.definitionMap[id]) {
                            found = conf.definitionMap[id];
                        }
                        if (found) {
                            var $rect = $("rect.regFieldBox", this).first();
                            //console.log("Map[field-" + title + "]=" + conf.definitionMap["field-" + title]);
                            //console.log(" $rect.length= " + $rect.length);
                            //console.log(" $rect[0] is " + $rect[0]);
                            //console.log(" wrapping field-" + title);
                            var a = doc.createElementNS("http://www.w3.org/2000/svg", "a");
                            a.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + found);
//                            a.setAttribute("class", "regLink");
//                            a.setAttribute("target", "_parent");
                            $rect.wrap(a);
//                            $rect[0].setAttribute("class", $rect[0].getAttribute("class") + " regLink");
//                            $rect[0].setAttributeNS("http://www.w3.org/2000/svg", "class",
//                                                    $rect[0].getAttributeNS("http://www.w3.org/2000/svg", "class") + " regLink");
                            var b = doc.createElementNS("http://www.w3.org/2000/svg", "a");
                            b.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + found);
//                            b.setAttribute("class", "regLink");
//                            b.setAttribute("target", "_parent");
//                            b.setAttributeNS("http://www.w3.org/1999/xhtml", "class", "field internalDFN");
//                            b.setAttributeNS("http://www.w3.org/2000/svg", "class", "field internalDFN");
                            $text.wrap(b);
//                            $text[0].setAttribute("class", $text[0].getAttribute("class") + " regLink");
                        }
                    }
                });

                //console.log("\n\n\n\n");

                $("dfn.field", doc).each(function() {
                    var id = this.id.replace(/^field-/,"#regpict-");
                    if (id !== this.id) {
                        //console.log("field-->regpict: looking for " + this.id + " --> " + id);
                        var $regpict = $(id, doc);
                        if ($regpict.length > 0) {
                            $(this).wrapInner("<a href=\"" + id + "\"></a>");
                            //console.log("field-->regpict: <dfn class=\"" + this["class"] +
                            //                 "\" id=\"" + this.id + "\">" + $(this).html() + "</dfn>");
                            //console.log("");
                        }
                    }
                });

                //console.log("\n\n\n\n");

                $("a:not([href])", doc)
                    .filter(
                    function() {
                        return (this.getAttributeNodeNS("http://www.w3.org/1999/xlink", "href") === null);
                    })
                    .each(
                    function() {
                        //console.log("a:not([href]): " + this.tagName + "  " + this.namespaceURI + "  " + this.outerHTML);
                        var $ant = $(this);
                        if ($ant.hasClass("externalDFN")) {
                            return;
                        }
                        /*var hrefNode = this.getAttributeNodeNS("http://www.w3.org/1999/xlink", "href");
                         if (hrefNode) {
                         console.log("  getAttributeNS() localName=" + hrefNode.localName +
                         " nodeName=" + hrefNode.nodeName +
                         " nodeType=" + hrefNode.nodeType +
                         " namespaceURI=" + hrefNode.namespaceURI);
                         return;
                         }*/
                        var title = $ant.dfnTitle()[0];
                        var tag = null;
                        var temp = $ant.attr("class");
                        var i;
                        if (temp) {
                            //console.log("class=" + temp);
                            temp = temp.split(/\s+/);
                            for (i = 0; i < temp.length; i++) {
                                //console.log("checking " + temp[i] + "-" + title);
                                if (conf.definitionMap[temp[i] + "-" + title]) {
                                    tag = temp[i];
                                    //console.log("found " + temp[i] + "-" + title);
                                }
                            }
                        }
                        if (tag === null) {
                            for (i = 0; i < dfnClass.length; i++) {
                                if (conf.definitionMap[dfnClass[i] + "-" + title]) {
                                    if (tag === null) {
                                        tag = dfnClass[i];
                                    } else {
                                        tag = tag + "-" + dfnClass[i];
                                    }
                                }
                            }
                        }
                        if (tag !== null) {
                            //console.log("tag= " + tag);
                            if (tag === "regpict-field" || tag === "field-regpict") {
                                tag = "field";
                            }
                            //console.log("tag= " + tag);
                            var warn = null;
                            if (tag.match(/-/)) {
                                warn = "Ambiguous reference to '(" + tag + ")-" + title + "'";
                                tag = tag.split("-")[0];
                                warn = warn + ", resolved as '" + tag + "'";
                                msg.pub("warn", warn);
                            }
                            $ant.attr("href", "#" + conf.definitionMap[tag + "-" + title])
                                .addClass("internalDFN")
                                .addClass(tag);
                            if (conf.definitionHTML[tag + "-" + title] && !$ant.attr("title")) {
                                $ant.html(conf.definitionHTML[tag + "-" + title]);
                            }
                            if (warn !== null) {
                                $ant.append("<span class=\"respec-error\"> " + warn + " </span>");
                            }
                            //console.log("result: " + $ant[0].outerHTML);
                        }
                        else {
                            // ignore WebIDL
                            if (!$ant.parents(".idl, dl.methods, dl.attributes, dl.constants, dl.constructors, dl.fields, dl.dictionary-members, span.idlMemberType, span.idlTypedefType, div.idlImplementsDesc").length) {
                                msg.pub("warn",
                                        "Found linkless <a> element with text '" + title + "' but no matching <dfn>.");
                            }
                            $ant.replaceWith($ant.contents());
                        }
                    }
                )
                ;
                if (conf.addDefinitionMap) {
                    msg.pub("start", "core/dfn/addDefinitionMap");
                    var $mapsec = $("<section id='definition-map' class='introductory appendix'><h2>Definition Map</h2></section>").appendTo($("body"));
                    var $tbody = $("<table><thead><tr><th>Kind</th><th>Name</th><th>ID</th><th>HTML</th></tr></thead><tbody/></table>").appendTo($mapsec).children("tbody");
                    var keys = Object.keys(conf.definitionMap).sort();
                    for (var i = 0; i < keys.length; i++) {
                        var d = keys[i];
                        var item = d.split(/-/);
                        var kind = item.shift();
                        var id = conf.definitionMap[d];
                        $("<tr><td>" + kind + "</td><td>" + item.join("-") + "</td><td><a href=\"" + "#" + id + "\">" + id + "</a></td><td>" + conf.definitionHTML[d] + "</td></tr>").appendTo($tbody);
                    }
                    msg.pub("end", "core/dfn/addDefinitionMap");
                }
                msg.pub("end", "core/dfn");
                cb();
            }
        }
            ;
    }
)
;
