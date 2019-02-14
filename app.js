// --- MAIN ---

one("#compare-btn").addEventListener("click", function () {
    var a = strToList(one("#a").value);
    var b = strToList(one("#b").value);

    var aDict = toDic(a);
    var bDict = toDic(b);

    // To distinct
    a = dicToList(aDict);
    b = dicToList(bDict);

    // Populate with sorted distinct
    one("#a").value = listToStr(a);
    one("#b").value = listToStr(b);

    one("#a-count").textContent = a.length;
    one("#b-count").textContent = b.length;

    // A and B
    var bothList = both(a, bDict);
    one("#a-and-b").value = listToStr(bothList);
    one("#a-and-b-count").textContent = bothList.length;

    // A not B
    var aOnlyList = onlyFirst(a, bDict);
    one("#a-not-b").value = listToStr(aOnlyList);
    one("#a-not-b-count").textContent = aOnlyList.length;

    // B not A
    var bOnlyList = onlyFirst(b, aDict);
    one("#b-not-a").value = listToStr(bOnlyList);
    one("#b-not-a-count").textContent = bOnlyList.length;
});

one("#random-btn").addEventListener("click", function () {
    one("#a").value = listToStr(randomList(100000, 999999, 10000));
    one("#b").value = listToStr(randomList(100000, 999999, 10000));
});

// --- FUNCTIONS ---

function one(tag) {
    return document.querySelector(tag);
}

function many(tag) {
    return document.querySelector(tag);
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