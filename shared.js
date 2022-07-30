if (this.document) {
    addMenu();
    addHead();
    highlightMenu();
}

function addHead() {
    var titleText = "peheje";
    var meta = document.createElement("meta");
    meta.name = "description";
    meta.content = titleText;
    document.head.appendChild(meta);

    var metaViewport = document.createElement("meta");
    metaViewport.name = "viewport";
    metaViewport.content = "width=device-width, initial-scale=1.0"
    document.head.appendChild(metaViewport);

    var title = document.createElement("title");
    title.innerHTML = titleText;
    document.head.appendChild(title);

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/style.css";
    document.head.appendChild(link);

    var shortcutIconLink = document.createElement("link");
    shortcutIconLink.rel = "shortcut icon";
    shortcutIconLink.href = "/hamster.png";
    shortcutIconLink.type = "image/png";
    document.head.appendChild(shortcutIconLink);
}

function addMenu() {
    var nav = document.createElement("nav");

    var compareAnchor = createAnchor("Compare", "/compare/compare.html");
    nav.appendChild(compareAnchor);

    appendSeparator(nav);

    var uniqueAnchor = createAnchor("Unique", "/unique/unique.html");
    nav.appendChild(uniqueAnchor);

    appendSeparator(nav);

    var alcoholAnchor = createAnchor("Alcohol", "/alcohol/alcohol.html");
    nav.appendChild(alcoholAnchor);

    appendSeparator(nav);

    var heartbeatAnchor = createAnchor("Heartbeat", "/heartbeat/heartbeat.html");
    nav.appendChild(heartbeatAnchor);

    appendSeparator(nav);

    var memoryAnchor = createAnchor("Memory", "/memory/memory.html");
    nav.appendChild(memoryAnchor);

    appendSeparator(nav);

    var contactAnchor = createAnchor("Contact", "https://twitter.com/peheje");
    contactAnchor.target = "_blank";
    nav.appendChild(contactAnchor);

    // prepend nav to body
    document.body.insertBefore(nav, document.body.firstChild);
}

function highlightMenu() {
    var path = window.location.pathname;
    var nav = document.querySelector("nav");
    var anchor = nav.querySelector("a[href='" + path + "']");

    anchor.classList.add("active");
}

function appendSeparator(nav) {
    var separator = document.createElement("span");
    separator.innerHTML = " | ";
    nav.appendChild(separator);
}

function createAnchor(text, href) {
    var a = document.createElement("a");
    a.href = href;
    a.innerHTML = text;
    return a;
}

function q(tag) {
    if (tag[0] === "#") {
        return document.getElementById(tag.substring(1));
    } else {
        return document.querySelectorAll(tag);
    }
}

function listToDic(list) {
    var o = {};
    for (var i = 0; i < list.length; i++) {
        var key = list[i];
        o[key] = key;
    }
    return o;
}

function strToList(str) {
    if (!str || str === "") {
        return [];
    }
    var a = str.trim().split("\n");
    var trimmed = [];
    for (var i = 0; i < a.length; i++) {
        trimmed.push(a[i].trim());
    }
    return trimmed;
}

function dicToList(dic) {
    var xs = [];
    for (let key in dic) {
        if (dic.hasOwnProperty(key)) {
            xs.push(key);
        }
    }
    return xs;
}

function listToStr(list) {
    return list.join("\n");
}

function roundToDigits(digits, value) {
    var factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
}

function removeEmptyLines(v) {
    return v.trim() !== "";
}

function lowercaseIfCheckboxChecked(v) {
    return q("#case-insensitive").checked ? v.toLowerCase() : v;
}

function randomList(min, max, size) {
    var r = [];
    for (var i = 0; i < size; i++) {
        r.push(randomInt(min, max));
    }
    return r;
}

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function both(aList, bDict) {
    var both = [];
    for (var i = 0; i < aList.length; i++) {
        var x = aList[i];
        if (bDict[x]) {
            both.push(x);
        }
    }
    return both;
}

function onlyFirst(aList, bDict) {
    var onlyA = [];
    for (var i = 0; i < aList.length; i++) {
        var x = aList[i];
        if (!bDict[x]) {
            onlyA.push(x);
        }
    }
    return onlyA;
}