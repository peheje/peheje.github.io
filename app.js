// --- MAIN ---

q("#compare-btn").addEventListener("click", function () {

    // Generate lists
    var a = strToDic(q("#a").value);
    var b = strToDic(q("#b").value);

    // Change to distinct lists on UI
    q("#a").value = listToStr(dicToList(a));
    q("#b").value = listToStr(dicToList(b));

    // Calculate counts
    q("#a-count").textContent = a.length;
    q("#b-count").textContent = b.length;

    // A and B
    var bothList = both(a, b);
    q("#a-and-b").value = listToStr(bothList);
    q("#a-and-b-count").textContent = bothList.length;

    // A not B
    var aOnlyList = onlyFirst(a, b);
    q("#a-not-b").value = listToStr(aOnlyList);
    q("#a-not-b-count").textContent = aOnlyList.length;

    // B not A
    var bOnlyList = onlyFirst(b, a);
    q("#b-not-a").value = listToStr(bOnlyList);
    q("#b-not-a-count").textContent = bOnlyList.length;
});

q("#random-btn").addEventListener("click", function () {
    q("#a").value = listToStr(randomList(100000, 999999, 10000));
    q("#b").value = listToStr(randomList(100000, 999999, 10000));
});

q("#download-btn").addEventListener("click", function (e) {

    var a = strToList(q("#a").value);
    var b = strToList(q("#b").value);
    var aAndB = strToList(q("#a-and-b").value);
    var aNotB = strToList(q("#a-not-b").value);
    var bNotA = strToList(q("#b-not-a").value);

    var data = "Left,Right,In both,Only in left,Only in right\r\n";
    var max = a.length > b.length ? a.length : b.length;

    for (var i = 0; i < max; i++)
    {
        data += takeOrEmpty(a, i);
        data += ",";
        data += takeOrEmpty(b, i);
        data += ",";
        data += takeOrEmpty(aAndB, i);
        data += ",";
        data += takeOrEmpty(aNotB, i);
        data += ",";
        data += takeOrEmpty(bNotA, i);
        data += "\r\n";
    }

    this.href = "data:text/plain;charset=UTF-8," + encodeURIComponent(data);
});

// --- FUNCTIONS ---

function takeOrEmpty(list, index) {
    if (index >= list.length) {
        return "";
    }
    else {
        return list[index];
    }
}

function q(tag) {
    if (tag[0] === "#") {
        return document.querySelector(tag);
    } else {
        return document.querySelectorAll(tag);
    }
}

function strToDic(str) {
    if (!str || str == "") {
        return {};
    }
    var list = str.trim().split("\n");
    var trimmed = {};
    for (var i = 0; i < list.length; i++) {
        var key = list[i].trim();
        trimmed[key] = key;
    }
    return trimmed;
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

function both(aDict, bDict) {
    var both = [];
    for (var key in aDict) {
        var x = aDict[key];
        if (bDict[x]) {
            both.push(x);
        }
    }
    return both;
}

function onlyFirst(aDict, bDict) {
    var onlyA = [];
    for (var key in aDict) {
        var x = aDict[key];
        if (!bDict[x]) {
            onlyA.push(x);
        }
    }
    return onlyA;
}

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomList(min, max, size) {
    var r = [];
    for (var i = 0; i < size; i++) {
        r.push(randomInt(min, max));
    }
    return r;
}