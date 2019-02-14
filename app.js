// --- MAIN ---

q("#compare-btn").addEventListener("click", function () {

    // Generate lists
    var a = strToList(q("#a").value);
    var b = strToList(q("#b").value);

    // Generate dictionaries
    var aDict = toDic(a);
    var bDict = toDic(b);

    // Make lists distinct
    a = dicToList(aDict);
    b = dicToList(bDict);

    // Change to distinct lists on UI
    q("#a").value = listToStr(a);
    q("#b").value = listToStr(b);

    // Calculate counts
    q("#a-count").textContent = a.length;
    q("#b-count").textContent = b.length;

    // A and B
    var bothList = both(a, bDict);
    q("#a-and-b").value = listToStr(bothList);
    q("#a-and-b-count").textContent = bothList.length;

    // A not B
    var aOnlyList = onlyFirst(a, bDict);
    q("#a-not-b").value = listToStr(aOnlyList);
    q("#a-not-b-count").textContent = aOnlyList.length;

    // B not A
    var bOnlyList = onlyFirst(b, aDict);
    q("#b-not-a").value = listToStr(bOnlyList);
    q("#b-not-a-count").textContent = bOnlyList.length;
});

q("#random-btn").addEventListener("click", function () {
    q("#a").value = listToStr(randomList(100000, 999999, 10000));
    q("#b").value = listToStr(randomList(100000, 999999, 10000));
});

// --- FUNCTIONS ---

function q(tag) {
    if (tag[0] === "#") {
        return document.querySelector(tag);
    } else {
        return document.querySelectorAll(tag);
    }
}

function toDic(list) {
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