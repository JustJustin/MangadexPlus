// ==UserScript==
// @id             JustJustin.MangadexPlus
// @name           Mangadex Plus
// @version        1.0
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
    addStyle: function(css) {
        var style;
        style = $js.el('style', {
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
    settings: {ajaxfix: false},
    current: null,
    pages: {},
    init: function() {
        if ((this.settingsKey in window.localStorage)) {
            $js.extend(this.settings, JSON.parse(window.localStorage[this.settingsKey]));
        }
        // do configuration
        this.buildSettingsDialog();
        this.main();
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
        .MDPconfigpage>span { margin-left: 5px; margin-right: 5px; }\
        .MDPconfigpage label { margin-left: 5px; font-weight: normal !important;  }\
        .MDPconfigtab {font-weight: bold; }");
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
        var $page = $js.el("div", {class: "MDPconfigpage"});
        
        if (Object.keys(this.pages).length == 0) {
            $page.style.display="block";
            $js.addClass($tab, "MDPconfigtabsel");
            this.current = $page;
        }
        this.pages[page] = $page;
        this.$box.appendChild($page);
        this.$head.appendChild($tab);
        return $page;
    },
    main: function() { // creates main settings page
        var $main = this.createPage("Main");

        var $span = $js.el("span");
        var $box = $js.el("input", {id:"MDPajaxfix", type:"checkbox", checked: this.settings.ajaxfix});
        var $lbl = $js.el("label", {innerHTML: "Use AJAX fix for new firefox"});
        $lbl.setAttribute("for", "MDPajaxfix");
        $box.onclick = function () {config.settings.ajaxfix = this.checked; config.save();}
        $span.appendChild($box); $span.appendChild($lbl); $main.appendChild($span);
    },
    save: function() {
        window.localStorage[this.settingsKey] = JSON.stringify(this.settings);
    }
};
config.init();

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
    // fall back, just find a number
    var re = /[\d]+(\.[\d]+(\.[\d]+)?)?/gi;
    var res = re_results(re, name);
    console.log(res);
    if (res) {return res[res.length-1][0];}
    else {return null;}
}

function get_title() {
    var $el = $js("#content h3.panel-title a");
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
    $js.extend(req, {title: title, span: $span, 
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
    };
    req.send();
}
function follows_page() {
    
}

function comic_page() {
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
        document.body.addEventListener("keydown", myKeyHandler);
        document.body.addEventListener("keyup", myKeyUp);
    }
    $js.addStyle("#mdp_recommended { margin-left: auto; margin-right: auto; margin-top:10px; "+
        "text-align: center; display: block; }");
    this.update = function() {
        // Functionality that is triggered when page content is updated.
        var title = get_title();
        console.log({msg:"Chapter Update Handler", title:title});
        if (title) {
            // sanitize title for fs
            title = title.replace(/ /g, "-").replace(/[\':]/g, "");
            
            var ch = $js("#jump_chapter option[selected]").innerHTML.trim();
            ch = getch(ch);
            if (ch.length < 2) ch = "0"+ch;
            
            var pg = $js("button", $js("#jump_page").parentNode);
            pg = /[\d]+/.exec(pg.title)[0];
            if (pg.length < 2) pg = "0"+pg;
            var pgtitle = title + "_c" + ch + "p" + pg;
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
    observer.observe($js("#jump_page"), {attributes: true, childList: true});
}
if (/\/chapter\//.test(window.location.pathname)) {
    comic_page();
}
