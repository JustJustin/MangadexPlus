// ==UserScript==
// @id             JustJustin.MangadexPlus
// @name           Mangadex Plus
// @version        1.2.8
// @namespace      JustJustin
// @author         JustJustin
// @description    Adds new features to Mangadex
// @include        http://mangadex.org/*
// @include        https://mangadex.org/*
// @downloadURL    https://github.com/JustJustin/MangadexPlus/raw/master/MangadexPlus.user.js
// @run-at         document-end

// ==/UserScript==

var $js = function(selector, root){
    if(root == null) {
        root = document.body;
    }
    return root.querySelector(selector);
};
var $$js = function(selector, root){
    if(root == null) {
        root = document.body;
    }
    return root.querySelectorAll(selector);
};
$js.extend = function(object, data){
    var key, val;
    for(key in data){
        val = data[key];
        object[key] = val;
    }
};
$js.extend($js, {
    engine: /WebKit|Presto|Gecko/.exec(navigator.userAgent)[0].toLowerCase(),
    addClass: function(el, klass){
        el.classList.add(klass);
    },
    rmClass: function(el, klass){
        el.classList.remove(klass);
    },
    hasClass: function(el, klass){
        var i;
        for(i = 0; i < el.classList.length; ++i){
            if(el.classList[i] == klass){
                return true;
            }
        }
        return false;
    },
    id: function(id) {
        return document.getElementById(id);
    },
    attr: function(el, val) {
        var attributes = el.attributes;
        return (attributes[val] === undefined) ? false: attributes[val].value;
    },
    after: function(root, el) {
        if(root.nextSibling){
            return root.parentNode.insertBefore(el, root.nextSibling);
        }
        return root.parentNode.appendChild(el);
    },
    before: function(root, el) {
        return root.parentNode.insertBefore(el, root);
    },
    space: function(el) {
        el.appendChild(document.createTextNode(' '));
    },
    css: function(el, css) {
        $js.extend(el.style, css);
    },
    el: function(tagname, attrs) {
        var el = document.createElement(tagname);
        if(attrs == undefined) {
            attrs = {};
        }
        $js.extend(el, attrs);
        if(attrs['class']) {
            el.className = attrs['class'];
        }
        return el;
    },
    indexIn: function(array, object) {
        var index = -1;
        for(var i = 0; i < array.length; ++i) {
            if(array[i] > object) {
                index = i;
                break;
            }
        }
        return index;
    },
    firstParent: function(root, tag, limit) {
        if(limit === 0) { return false; }
        if( root.parentNode.tagName.toLowerCase() == tag.toLowerCase() ) {
            return root.parentNode;
        }
        if(root.parentNode == document.body){
            return false;
        }
        return $js.firstParent(root.parentNode, tag, limit - 1);
    },
    remove: function(el) {
        return el.parentNode.removeChild(el);
    },
    log: function(obj, severe) {
        if(severe || config.debug) {
            console.log(obj);
        }
    },
    prepend: function(base, el) {
        if(base.firstChild) {
            $js.before(base.firstChild, el);
        } else {
            base.appendChild(el);
        }
    },
    cssToString: function(css) {
        let cssstring = "";
        for (let rule in css) {
            cssstring += rule + " { \n";
            for (let key in css[rule]) {
                cssstring += "\t" + key + ": " + css[rule][key] + "; \n";
            }
            cssstring += "}\n";
        }
        return cssstring;
    },
    addStyle: function(css) {
        if (typeof(css) === "object") {
            css = $js.cssToString(css);
        }
        let style = $js.el('style', {
            textContent: css
        });
        document.head.appendChild(style);
        return style;
    },
    keycode: {left: 37, up: 38, right: 39, down: 40,
              pgup: 33, pgdn: 34, end: 35, home: 36,
              "~": 192, bspc: 8, spc: 32, del: 47, },
    _keycode_init: function() {
        var charfill = function (ch, code, limit) {
            for (var i = 0; i < limit; ++i)
                $js.keycode[String.fromCharCode(ch.charCodeAt()+i)] = code+i;
        }
        charfill('a', 65, 26); charfill('0', 48, 10); this._keycode_init = function() {};
    },
}); $js._keycode_init();

var limiter = { // control ourselves...
    // TODO: control ajax requests for manga info so we don't get temporarily denied
};

var debug = {
    default: false,
    log: function() {
        if (this.default || config && config.settings.debug) {
            console.log.apply(console, arguments);
        } 
    }
};

var keyTimeout = null;
var scrollInterval = null;
var myKeyHandler = function(e){
    if(e.target.nodeName == 'INPUT') return;

    if (keyTimeout !== null) clearTimeout(keyTimeout);
    keyTimeout = setTimeout(function() {
        if (scrollInterval !== null) {
            clearInterval(scrollInterval); 
            scrollInterval = null
        } 
        keyTimout=null;
    }, 500);
    switch(e.keyCode){
        case $js.keycode.q:
            prev_chapter();
            break;
        case $js.keycode.e:
            next_chapter();
            break
        case $js.keycode.w:
        case $js.keycode.up:
            if (scrollInterval === null) {
                window.scrollBy(0, -57);
                scrollInterval = setInterval(function () {
                    window.scrollBy(0, -35);
                }, 30);
            }
            e.preventDefault();
            break;
        case $js.keycode.s:
        case $js.keycode.down:
            if (scrollInterval === null) {
                window.scrollBy(0, 57);
                scrollInterval = setInterval(function () {
                    window.scrollBy(0, 35);
                }, 30);
            }
            e.preventDefault();
            break;
        case 190: // .
            next_page();
            break;
        case 188: // ,
            prev_page();
            break;
    }
    return;
}
var myKeyUp = function(e) {
    switch (e.keyCode) {
        case $js.keycode.up:
        case $js.keycode.down:
        case $js.keycode.w:
        case $js.keycode.s:
            if (scrollInterval !== null) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
            break;
    }
}

var config = {
    settingsKey: "MDPconfig",
    settings: {ajaxfix: false, ajaxswitch: true, debug: false, exportlib: false, windowbasedpos: true},
    current: null,
    pages: {},
    init: function() {
        if ((this.settingsKey in window.localStorage)) {
            $js.extend(this.settings, JSON.parse(window.localStorage[this.settingsKey]));
        }
        // do configuration
        this.buildSettingsDialog();
        this.main();
        // apply exportlib
        if (this.settings.exportlib) {
            this.exportlib();
        }
    },
    buildSettingsDialog: function() {
        $js.addStyle(".MDPconfig {\
            position: fixed; \
            bottom: 10px; \
            right: 10px; \
            width: 300px; \
            height: 300px; \
            display: none; \
            border: solid 2px line grey; \
            background: #f0f0f0; \
        }\
        .MDPconfignub {\
            position: fixed; \
            right: 10px; \
            bottom: 10px; \
            opacity: 0.5; \
            color: white; \
        }\
        .MDPconfighead {\
            position: relative;\
            height: 20px;\
            overflow: auto;\
            border-bottom: 1px solid black;\
        }\
        .MDPconfigpage {\
            position: relative;\
            height: 279px;\
            width: 300px;\
            display: none;\
            padding-top: 5px; \
            font-size: .9em !important; \
        }\
        .MDPconfighead .MDPconfigclose { float: right; max-height: 20px; cursor: pointer; }\
        .MDPconfignub:hover { opacity: 1; cursor: pointer; }\
        .MDPconfigpage>span { display: inline-block; margin-left: 5px; margin-right: 5px; }\
        .MDPconfigpage label { margin-left: 5px; font-weight: normal !important;  }\
        .MDPconfigtab {font-weight: bold; cursor: pointer; margin-left: 5px; }\
        .MDPconfigtabsel {color: black;} ");
        var $nub = $js.el("div", {class: "MDPconfignub", innerHTML: "{+}"});
        var $box = $js.el("div", {class: "MDPconfig"});
        $nub.addEventListener("click", function () {
            if (getComputedStyle($box).display == "none") {$box.style['display'] = "block";}
            else {$box.style['display'] = "none";}
        });
        var $head = $js.el("div", {class: "MDPconfighead"});
        var $exit = $js.el("span", {class: "MDPconfigclose", innerHTML: "{x}"});
        $exit.addEventListener("click", function() {
            $box.style['display'] = "none";
        });
        $head.appendChild($exit);
        $box.appendChild($head);
        document.body.appendChild($nub);
        document.body.appendChild($box);
        this.$box = $box;
        this.$head = $head;
    },
    createPage: function(page) {
        var $conf = $js("MDPconfig");
        var $tab = $js.el("span", {class: "MDPconfigtab", innerHTML: page});
        var $page = $js.el("div", {class: "MDPconfigpage", tab: $tab});
        $tab.page = $page;

        if (Object.keys(this.pages).length == 0) {
            $page.style.display="block";
            $js.addClass($tab, "MDPconfigtabsel");
            this.current = $page;
        }
        $tab.addEventListener("click", function() {
            var $page = config.pages[this.innerHTML];
            var $curr = config.current;
            if ($page.style.display != "block") {
                $curr.style.display = "none";
                $page.style.display = "block";
                $curr.tab.classList.remove("MDPconfigtabsel");
                $page.tab.classList.add("MDPconfigtabsel");
                config.current = $page;
            }
        });
        this.pages[page] = $page;
        this.$box.appendChild($page);
        this.$head.appendChild($tab);
        return $page;
    },
    main: function() { // creates main settings pages
        var $main = this.createPage("Main");

        var $span = $js.el("span");
        var $box = $js.el("input", {id:"MDPajaxfix", type:"checkbox", checked: this.settings.ajaxfix});
        var $lbl = $js.el("label", {innerHTML: "Use AJAX fix for new firefox"});
        $lbl.setAttribute("for", "MDPajaxfix");
        $box.onclick = function () {config.settings.ajaxfix = this.checked; config.save();}
        $span.appendChild($box); $span.appendChild($lbl); $main.appendChild($span);

        var $span = $js.el("span");
        var $box = $js.el("input", {id:"MDPajaxswitch", type:"checkbox", checked: this.settings.ajaxswitch});
        var $lbl = $js.el("label", {innerHTML: "Switch ajax type if first attempt fails"});
        $lbl.setAttribute("for", "MDPajaxswitch");
        $box.onclick = function () {config.settings.ajaxswitch = this.checked; config.save();}
        $span.appendChild($box); $span.appendChild($lbl); $main.appendChild($span);

        var $span = $js.el("span");
        var $box = $js.el("input", {id:"MDPwindowpos", type:"checkbox", checked: this.settings.windowbasedpos});
        var $lbl = $js.el("label", {innerHTML: "Use Window based positioning for manga previews"});
        $lbl.setAttribute("for", "MDPwindowpos");
        $box.onclick = function () {config.settings.windowbasedpos = this.checked; config.save();}
        $span.appendChild($box); $span.appendChild($lbl); $main.appendChild($span);

        var $debug = this.createPage("Debug");

        var $span = $js.el("span");
        var $box = $js.el("input", {id:"MDPdebug", type:"checkbox", checked: this.settings.debug});
        var $lbl = $js.el("label", {innerHTML: "Enable additional debug output"});
        $lbl.setAttribute("for", "MDPdebug");
        $box.onclick = function () {config.settings.debug = this.checked; config.save();}
        $span.appendChild($box); $span.appendChild($lbl); $debug.appendChild($span);

        var $span = $js.el("span");
        var $box = $js.el("input", {id:"MDPexportlib", type:"checkbox", checked: this.settings.exportlib});
        var $lbl = $js.el("label", {innerHTML: "Export $js library to window for debugging"});
        $lbl.setAttribute("for", "MDPexportlib");
        $box.onclick = function () {
            config.settings.exportlib = this.checked; config.save();
            if (this.checked && !window.$js) { config.exportlib(); }
        }
        $span.appendChild($box); $span.appendChild($lbl); $debug.appendChild($span);
    },
    save: function() {
        window.localStorage[this.settingsKey] = JSON.stringify(this.settings);
    },
    exportlib: function() { // Exports $js to main window for debugging purposes
        window.$js = $js;
        window.$$js = $$js;
        //window.$js
    }
};
config.init();

var minfo = {
    cacheKey: "mangaInfo",
    init: function() {
        if (!(this.cacheKey in window.localStorage)) {
            window.localStorage[this.cacheKey] = JSON.stringify({});
        }
    },
    saveInfo: function(id, info) {
        if (info.id == "") {
            info.id = id;
        } else if(info.id != id) {
            console.log({msg:"Error: Manga IDs do not match in saveMangaInfo.", id: id, info: info});
            alert("Error: Trying to save manga id " + id + " with non-matching info.id " + info.id);
            return;
        }
        var cache = this.getCache();
        cache[id] = info;
        window.localStorage[this.cacheKey] = JSON.stringify(cache);
    },
    getCache: function() {
        return JSON.parse(window.localStorage[this.cacheKey]);
    },
    getInfo: function(id) {
        var cache = this.getCache();
        if (id in cache) {
            return cache[id];
        }
        return false;
    },
    parse: function(doc, url=undefined) {
        debug.log({msg:"Parsing manga", dom: doc, url: url});
        var getInfoColumn = function(infoLabel, init=undefined, clean = true) {
            $trs = $$js("div.card-body div.row div.row", doc);
            for (var i = 0 ; i < $trs.length; ++i) {
                var $tr = $trs[i];
                if (infoLabel.test($tr.children[0].innerHTML)) {
                    return clean ? $tr.children[1].innerText : $tr.children[1].innerHTML;
                }
            }
            // Couldn't Find
            return init;
        };
        var getInfoList = function(infoLabel, eltype, init=[]) {
            $trs = $$js("div.card-body div.row div.row", doc);
            for (var i = 0 ; i < $trs.length; ++i) {
                var $tr = $trs[i];
                if (infoLabel.test($tr.children[0].innerHTML)) {
                    var values = [];
                    var $els = $$js(eltype, $tr.children[1]);
                    for (var j = 0; j < $els.length; ++j) {
                        values.push($els[j].textContent.trim());
                    }
                    return values;
                }
            }
            // Couldn't Find
            return init;
        };
        var info = {}; 
        info.title = $js("h6.card-header", doc).innerText.trim();
        info.status = getInfoColumn(/status/i, "Unknown");
        info.description = getInfoColumn(/description/i, "Unknown", false);
        info.author = getInfoColumn(/author/i, "Unknown");
        info.artist = getInfoColumn(/artist/i, "Unknown");
        
        info.genres = getInfoList(/genres/i, "a");
        info.alt_names = getInfoList(/alt/i, "li");
        
        info.id = url ? getMangaID(url) : "";
        
        var $img = $js("div.card-body img", doc);
        info.img_src = $img ? $img.src : "";
        /*
        info.type = getInfoColumn("Type:", "Unknown");
        */
        return info;
    },
}; minfo.init();
var chinfo = {
    cacheKey: "chInfo",
    interval: 24 * 60 * 60, // interval in seconds (24 hours)
    init: function() {
        if (!(this.cacheKey in window.localStorage)) {
            window.localStorage[this.cacheKey] = JSON.stringify({});
        }
    },
    getCache: function() {
        return JSON.parse(window.localStorage[this.cacheKey]);
    },
    getFromCache: function(id, ignore_interval=false) {
        var cache = this.getCache();
        if ( (id in cache) && (ignore_interval || this.checkInterval(cache[id].lastupdate)) ) {
            return cache[id].chapters;
        }
        return false;
    },
    getChapters: function(id, cb) {
        var cached = this.getFromCache(id);
        if (cached) { console.log({msg:"Using saved chapters", id:id, chapters:cached}); return cb(cached); }
        this.fetch(id, cb);
    },
    getChID: function(href) {
        var chreg = /chapter\/([\d]+)/;
        var res = chreg.exec(href);
        return res ? res[1] : false;
    },
    saveChapters: function(id, chapters, update=true) {
        var cache = this.getCache();
        cache[id] = {chapters: chapters, lastupdate: update ? new Date().toJSON() : cache[id].lastupdate};
        window.localStorage[this.cacheKey] = JSON.stringify(cache);
    },
    checkInterval: function(lastupdate) {
        lastupdate = new Date(lastupdate);
        var elapsed = (new Date() - lastupdate) / 1000;
        return elapsed <= this.interval; // return true if we haven't expired this entry
    },
    fetch: function(id, cb) {
        var url = "/manga/" + id;
        var req = new XMLHttpRequest();
        req.open("GET", url);
        req.responseType = "document";
        req._this = this; req.id = id; req.cb = cb;
        req.send();
        req.onload = function() {
            var $dom = this.response;
            var chapters = this._this.parse($dom);
            this._this.saveChapters(this.id, chapters);
            this.cb(chapters);
        };
    },
    parse: function(dom) {
        debug.log({msg:"Parsing Chapters", page: dom});
        var $chapters = $$js("#content div.chapter-container div.chapter-row", dom);
        if (!$chapters) { return; }
        $chapters = Array.from($chapters).slice(1,4); // first 3 chapters
        for (var i = 0; i < $chapters.length; ++i) {
            debug.log({msg: " Parsing Chapter", chapter: $chapters[i]});
            var info = function($tr) {
                var $title = $tr.children[1].children[0];
                return {read: !!$js("span.chapter_mark_unread_button", $tr), 
                        title: $title.children.length ? $title.children[0].textContent.trim() + " " + $title.children[1].textContent.trim() : $title.textContent.trim(), 
                        href: $js("a", $tr.children[1]).href,
                        date: $tr.children[3].textContent.trim(), 
                        group: $js("div.chapter-list-group", $tr).textContent.trim()};
            } ($chapters[i]);
            $chapters[i] = info;
        }
        return $chapters;
    },
}; chinfo.init();

function mangaListing($el) {
    var _this = this;
    this.build = function(info, $el) {
        if ($js(".mangalistingmo", $el)) {
            // already exists, just updated img
            var $img = $js(".mangalistingmo img", $el);
            $img.src = info.img_src;
            return;
        }
        $el.info = info;
        var $div = $js.el("div", {class: "mangalistingmo"});
        var $des = $js.el("span", {innerHTML: info.description});
        var $img = $js.el("img", {src: info.img_src, alt:info.title});
        $img.style['float'] = "right";
        $img.style['max-width'] = "300px";
        $img.onerror = function() {
            var $el = this.parentNode.parentNode;
            debug.log({msg:"Chapter Image failed to load", img:this, title: this.alt});
            if ($el.requested) {return;}
            _this.fetch(_this.href($el), $el); // update
        };
        $div.appendChild($img);
        $div.appendChild($des);

        $el.appendChild($div);
        $el.addEventListener("mouseover", function(e) {
            var $el = this;
            var info = $el.info;
            if (e.ctrlKey) {
                document.body.classList.add("togglemo");
            } else {
                document.body.classList.remove("togglemo");
            }
            if (mangaListing.mo) {
                if (!$el.chapters) {
                    var chapters = chinfo.getFromCache(info.id);
                    if ((!chapters || chapters.length == 0) && !$el.requested) {
                        _this.fetch(_this.href($el), $el);
                    } else if(chapters) {
                        debug.log({msg: "Using Saved Chapters", title: info.title, chapters:chapters});
                        _this.buildChapters(chapters, $el);
                    } else {  // request already sent or no response, just stop checking
                        $el.chapters = true;
                    }
                }
                var $mo = $js(".mangalistingmo", this);
                $mo.style['display'] = "block";
                var pos = $mo.getBoundingClientRect();
                if (config.settings.windowbasedpos) {
                    if (pos.bottom > window.innerHeight) {
                        let newpos = 45 - ((pos.bottom - window.innerHeight) + 50);
                        $mo.style["margin-top"] = newpos + "px";
                    }
                    if (pos.left < 0) {
                        let newpos = $mo.parentNode.getBoundingClientRect().width;
                        $mo.style["left"] = newpos + "px";
                    }
                } else {
                    console.log({msg:"pos", pos:pos, footer:$js("footer").getBoundingClientRect()});
                    if (pos.bottom > $js("footer").getBoundingClientRect().top) {
                        console.log({msg:"bigger!", top: -(pos.height + 15)});
                        $mo.style["margin-top"] = -(pos.height + 15) + "px";
                    }
                }
            }
        });
        $el.addEventListener("mouseout", function(e) {$js(".mangalistingmo", this).removeAttribute("style");});
    };
    this.buildChapters = function(chapters, $el) {
        $el.chapters = true;
        var $div = $js("div.mangalistingmo", $el);
        if (chapters) {
            var $table = $js.el("table", {style: "clear: both;"});
            for (var i = 0; i < chapters.length; ++i) {
                var $tr = $js.el("tr");
                var $eye = $js.el("td");
                if (chapters[i].read) { 
                    $eye.appendChild($js.el("span", {class: "fas fa-eye", 'aria-hidden': true, innerHTML: " "}) );
                } else { $eye.innerHTML = " "; }

                $tr.appendChild($eye);
                $tr.appendChild($js.el("td", {innerHTML: chapters[i].title}));
                $tr.appendChild($js.el("td", {innerHTML: chapters[i].group}));
                $tr.appendChild($js.el("td", {innerHTML: chapters[i].date}));
                $table.appendChild($tr);
            }
            $div.appendChild($table);
        }
    };

    this.delay_fetch_handler = function() {
        console.log({msg:"delayed_fetch triggered", el:this});
        this.removeEventListener("mouseover", _this.delay_fetch_handler);
        let $el = this;
        let id = getMangaID(_this.href($el));
        if (mangaListing.fetched[id]) { // use cached info
            let info = mangaListing.fetched[id];
            _this.build(info.info, $el);
            _this.buildChapters(info.chapters, $el);
        } else { // fetch
            _this.fetch(_this.href($el), $el);
        }
    }

    // should only be called if no info is had, or error handler is called on the image, 
    // or if we're updating chapters.
    // delay_on_error, if set to true this will install a onhover handler for a delayed fetch.
    // useful on initial load for letting entries we have no info on that error due to too many 
    // requests be requested later.
    this.fetch = function(href, $el, delay_on_error=false) {
        $el.requested = true; // mark as having been fetch()ed 
        var req = new XMLHttpRequest();
        req.open("GET", href);
        req.el = $el;
        req.delay_on_err = delay_on_error;
        req.responseType = "document";
        req.onload = function(dom) {
            debug.log({msg:"request loaded", url: this.responseURL, status: this.status, el:this.el});
            if (this.status != 200) {return this.onerror();}
            var $dom = this.response;
            var info = minfo.parse($dom, this.responseURL);
            minfo.saveInfo(info.id, info);
            var chapters = chinfo.parse($dom);
            chinfo.saveChapters(info.id, chapters);
            mangaListing.fetched[info.id] = {info: info, chapters: chapters};
            _this.build(info, this.el);
            _this.buildChapters(chapters, this.el);
        }
        req.onerror = function() {
            if (this.status == 503) {
                debug.log({msg:"503, todo:consider reattempting", req:this});
            } else {
                debug.log({msg: "Failed to request manga page", id: this.responseURL, req: this});
            }
            if (this.delay_on_err) {
                debug.log({msg:"adding delayed handler", el: this.el});
                this.el.addEventListener("mouseover", _this.delay_fetch_handler);
            }
        }
        req.send(href, $el);
    }
    this.href = function($el) {
        var $a = $js("a", $el.children[0]);
        if (!$a) {return false;}
        return $a.href;
    }

    // Get necessary info
    var href = this.href($el);
    if (!href) {return;}
    var id = getMangaID(href);

    // Add a mouseover display for manga listings
    var info = minfo.getInfo(id);
    if (info) {
        console.log({msg:"Using saved info", id:info.id, info:info});
        this.build(info, $el);
        return;
    } else {
        this.fetch(href, $el, true);
    }
}
mangaListing.init = function(frontpage=false) {
    if (mangaListing.fetched !== undefined) {return;}
    mangaListing.fetched = {};
    window.addEventListener("keydown", function (e) {
        if (e.shiftKey) {
            document.body.classList.add("hidemo");
        }
        if (e.keyCode == 17 && e.shiftKey || e.ctrlKey && e.keyCode == 16) {
            document.body.classList.add("togglemo");
            $js("#MP_manga_mo").click();
        }
    }, {passive:true});
    window.addEventListener("keyup", function (e) {
        if (!e.shiftKey) {
            document.body.classList.remove("hidemo");
        }
    }, {passive:true});

    let style = {
        ".mangalistingmo": {
            display: "none",
            position: "absolute",
            "max-width": "600px",
            background: "#272b30",
            border: "1px solid grey",
            padding: "5px",
            overflow: "auto",
            "margin-top": "45px",
            "margin-right": "100px",
            "z-index": "5",
            right: "200px",
        },
        ".mangalistingmo td": {
            "padding-left": "5px",
            "padding-right": "5px",
        },
        ".hidemo .mangalistingmo, .togglemo .mangalistingmo": {
            visibility: "hidden",
        }
    };
    if (frontpage) {
        delete style[".mangalistingmo"]["max-width"];
        style[".mangalistingmo"]["width"] = "600px";
        //delete style[".mangalistingmo td"]
    }
    $js.addStyle(style);
};
mangaListing.mo = true;

function re_results(re, str) {
    // returns an array containing every match object for the regex in str
    var results = []; var result;
    while ((result = re.exec(str)) !== null) {
        results.push(result);
    }
    return (!results.length) ? null : results;
}
function getch(name) {
    // Try's to get the most likely number to be the chapter in the chapter select
    // See if there is a chapter string
    var re_ch = /ch?(apter)?\.?( )?([\d]+(\.[\d]+(\.[\d]+)?)?)/gi;
    var res = re_ch.exec(name);
    if (res) {
        return res[3];
    }
    if (/oneshot/i.test(name)) {
        return "1";
    }
    // fall back, just find a number
    var re = /[\d]+(\.[\d]+(\.[\d]+)?)?/gi;
    var res = re_results(re, name);
    console.log(res);
    if (res) {return res[res.length-1][0];}
    else {return null;}
}

function get_title() {
    var $el = $js("a.manga_title");
    if ($el) {
        return $el.innerHTML;
    }
    return null;
}

function getSuggestedDownload($div, $img, title) {
    // Create holder to preserve order
    var $span = $js.el("span");
    $div.appendChild($span);
    
    // Create a data blob of these images
    var req = new XMLHttpRequest();
    var imgsrc = (config.settings.ajaxfix ? $img.src : "//cors-anywhere.herokuapp.com/" + $img.src);
    req.open("GET", imgsrc);
    $js.extend(req, {title: title, span: $span, img: $img,
                     type: $img.src.split(".").pop()});
    req.responseType = "arraybuffer";
    req.onload = function(event) {
        console.log({msg: "Got download resource", req: req, event: event});
        var data = new Blob([this.response], 
                            {type:"image/" + (this.type == "jpg" ? "jpeg" : this.type)});
        var $a = $js.el("a", {href: window.URL.createObjectURL(data), 
                              download: this.title + "." + this.type,
                              innerHTML: this.title});
        this.span.appendChild($a);
        this.span.appendChild($js.el("br"));
    };
    req.onerror = function(event) {
        console.log({msg: "Error getting download resource", req: req, event: event});
        if (!config.settings.ajaxswitch) {return;}

        var req2 = new XMLHttpRequest();
        var imgsrc = (!config.settings.ajaxfix ? this.img.src : "//cors-anywhere.herokuapp.com/" + this.img.src);
        req2.open("GET", imgsrc);
        $js.extend(req2, {title: this.title, span: this.span, img: this.img,
                          type: this.type});
        req2.responseType = "arraybuffer";
        req2.onload = function(event) {
            console.log({msg: "Got download resource", req: req2, event: event});
            var data = new Blob([this.response], 
                                {type:"image/" + (this.type == "jpg" ? "jpeg" : this.type)});
            var $a = $js.el("a", {href: window.URL.createObjectURL(data), 
                                  download: this.title + "." + this.type,
                                  innerHTML: this.title});
            this.span.appendChild($a);
            this.span.appendChild($js.el("br"));
        };
        req2.onerror = function(event) {
            console.log({msg: "Error getting download resource from error handler", req: req2, event: event});
        };
        req2.send();
    };
    req.send();
}
function follows_page() {
    console.log({msg:"Follows page"});
    mangaListing.init();
    var $lis = $$js("#chapters div.chapter-container>div.row");
    if (!$lis.length) {
        $lis = $$js("#chapters div.manga-entry");
    }
    for (var i = 1; i < $lis.length; ++i) { // skip header
        mangaListing($lis[i]);
    }
    $js.addStyle("span.visible-lg-inline {display: none !important;}");
    var $header = $js("ul.nav-tabs");
    var $li = $js.el("li", {class: "pull-right", role: "presentation"});
    var $checkbox = $js.el("input", {id: "MP_manga_mo", type: "checkbox", checked: mangaListing.mo});
    var $label = $js.el("label", {innerHTML: "Mouseover Preview", style: "margin-left: 5px;"});
    $label.setAttribute("for", "MP_manga_mo");
    $checkbox.onclick = function() {mangaListing.mo = this.checked;};
    $li.appendChild($checkbox);
    $li.appendChild($label);
    $header.appendChild($li);   
}
function search_page() {
    console.log({msg:"Search page"});
    mangaListing.init();
    var $lis = $$js("#content>div.row");
    for (var i = 1; i < $lis.length; ++i) {
        mangaListing($lis[i]);
    }
}

function getMangaID(url) {
    debug.log({msg:"getMangaID", url:url});
    return /\/((manga)|(title))\/([\d]+)\//.exec(url).slice(-1);
}
/* As in actual manga info page */
function manga_page() {
    var id = getMangaID(window.location.pathname);
    var info = minfo.parse(document);
    minfo.saveInfo(id, info);
    console.log({msg:"Parsed Manga Page", id:id, info:info});

    var chapters = chinfo.parse(document);
    chinfo.saveChapters(id, chapters);
    console.log({msg: "cont.", chapters:chapters});
}
function front_page() {
    console.log({msg: "Front Page"});
    mangaListing.init(true);
    var $top_chapters = $$js("#six_hours li.list-group-item, #day li.list-group-item, #week li.list-group-item");
    var $top_manga = $$js("#top_follows li.list-group-item, #top_rating li.list-group-item");
    var $latest_updates = $$js("#latest_update div.col-md-6, #follows_update div.col-md-6");
    var $all = [...$top_chapters, ...$top_manga, ...$latest_updates];
    for (var i = 0; i < $all.length; ++i) {
        mangaListing($all[i]);
    }

}   

function comic_page() {
    console.log({msg: "Comic Page"});
    if (!window.key_handlers) {
        window.key_handlers = true;
        window.next_chapter = function() {
            var $next = $js("#next_chapter_alt");
            $next && $next.click();
        }
        window.prev_chapter = function() {
            var $prev = $js("#prev_chapter_alt");
            $prev && $prev.click();
        }
        window.next_page = function() {
            var $next = $js(".next_page_alt");
            $next && $next.click();
        }
        window.prev_page = function() {
            var $prev = $js(".prev_page_alt");
            $prev && $prev.click();
        }
        document.body.addEventListener("keydown", myKeyHandler);
        document.body.addEventListener("keyup", myKeyUp);
    }
    $js.addStyle("#mdp_recommended { margin-left: auto; margin-right: auto; margin-top:10px; "+
        "text-align: center; display: block; }");
    var _this = this;
    this.update = function() {
        // Functionality that is triggered when page content is updated.
        var title = get_title();
        console.log({msg:"Chapter Update Handler", title:title});
        if (title) {
            // sanitize title for fs
            title = title.replace(/ /g, "-").replace(/[\':]/g, "");
            
            var ch = $js("#jump_chapter option[selected]").innerHTML.trim();
            if (ch == "") {ch = "0";} // handle empty string
            ch = getch(ch);
            if (ch.length < 2) ch = "0"+ch;
            
            var pg = $js("#jump_page").value.trim();
            pg = /[\d]+/.exec(pg)[0];
            if (pg.length < 2) pg = "0"+pg;
            var pgtitle = title + "_c" + ch + "p" + pg;
            if (window.lastpage && window.lastpage == pg) {
                setTimeout(_this.update, 250);
                return;
            }
            window.lastpage = pg;
            console.log("Recommended title is " + pgtitle);
            
            var $div = $js("#mdp_recommended");
            if ($div) { $div.remove(); }
            $div = $js.el("div", {id: "mdp_recommended"/*, innerHTML: pgtitle*/});
            getSuggestedDownload($div, $js("img#current_page"), pgtitle);
            $js("#content").appendChild($div);
        }
    };
    // install mutation observer
    var observer = new MutationObserver(this.update);
    //observer.observe($js("#jump_page"), {attributes: true, childList: true, subtree: true});
    observer.observe($js("div.images"), {attributes: true, childList: true, subtree: true});
    this.update();

    // update chapter info
    var chid = chinfo.getChID(window.location.pathname);
    if (chid) {
        var id = getMangaID($js("a.manga_title").href);
        var chapters = chinfo.getFromCache(id, true);
        for (var i = 0; i < chapters.length; ++i) {
            console.log(chid + " == " + chinfo.getChID(chapters[i].href));
            if (chapters[i].href && (chinfo.getChID(chapters[i].href) == chid)) {
                chapters[i].read = true;
                console.log({msg:"Updating Ch read status", ch: chapters[i]});
                chinfo.saveChapters(id, chapters, false);
                break;
            }
        }
    }
}

function generic_mangalisting_page() {
    // Try to autodetect different styles for mangaListings
    var $rows = $$js("div.chapter-container>div.row");
    if ($rows && $rows.length) {
        console.log({msg:"generic_mangalisting detected chapter-container rows", rows:$rows});
        mangaListing.init();
        var i = 0;
        // check to see if first row is manga or a heading
        if (!$$js("a", $rows[0])) {
            i = 1;
        }
        for (; i < $rows.length; ++i) {
            mangaListing($rows[i]);
        }
        return;
    }
    var $rows = $$js("div.manga-entry");
    if ($rows && $rows.length) {
        console.log({msg:"generic_mangalisting detected manga-entry rows", rows:$rows});
        mangaListing.init();
        for (var i = 0; i < $rows.length; ++i) {
            mangaListing($rows[i]);
        }
        return;
    }
}

if ("/" == window.location.pathname && window.location.search == "" && window.location.hash == "") {
    front_page();
} else if (/\/chapter\//.test(window.location.pathname)) {
    comic_page();
} else if (/^\/manga\//.test(window.location.pathname) || 
    /\/title\//.test(window.location.pathname) ) {
    manga_page();
} else if (/\/follows/.test(window.location.pathname)) {
    follows_page();
} else if ("/" == window.location.pathname && /page\=search/.test(window.location.href)) {
    search_page();
} else {
    // Try to work on all pages generically. 
    generic_mangalisting_page();
}
