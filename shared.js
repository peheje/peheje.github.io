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