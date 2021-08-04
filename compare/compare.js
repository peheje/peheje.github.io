q("#compare-btn").addEventListener("click", function () {

    // Generate lists
    var a = strToList(q("#a").value);
    var b = strToList(q("#b").value);

    // Remove whitespace lines
    a = a.filter(function(v) { return v.trim() !== ""; });
    b = b.filter(function(v) { return v.trim() !== ""; });

    // Generate dictionaries
    var aDict = listToDic(a);
    var bDict = listToDic(b);

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

function takeOrEmpty(list, index) {
    if (index >= list.length || index < 0) {
        return "";
    }
    else {
        return list[index];
    }
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
