addMenuToPage()

function addMenuToPage() {
    var nav = document.createElement("nav");

    var compareAnchor = createAnchor("Compare", "/compare/compare.html");
    nav.appendChild(compareAnchor);
    
    appendSeparator(nav);
    
    var uniqueAnchor = createAnchor("Unique", "/unique/unique.html");
    nav.appendChild(uniqueAnchor);
    
    appendSeparator(nav);

    var contactAnchor = createAnchor("Contact", "https://twitter.com/peheje");
    contactAnchor.target = "_blank";
    nav.appendChild(contactAnchor);

    // prepend nav to body
    document.body.insertBefore(nav, document.body.firstChild);
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
        return document.querySelector(tag);
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