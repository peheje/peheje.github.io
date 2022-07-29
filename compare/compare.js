q("#compare-btn").addEventListener("click", function () {

    // Generate lists
    var a = strToList(q("#a").value);
    var b = strToList(q("#b").value);

    // Remove whitespace lines and adhere to lowercase
    a = a.map(lowercaseIfCheckboxChecked).filter(removeEmptyLines);
    b = b.map(lowercaseIfCheckboxChecked).filter(removeEmptyLines);

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

    var aString = q("#a").value;
    var bString = q("#b").value;

    var separator = getValidSeparator(aString + bString);
    if (separator === null) {
        e.preventDefault();
        alert("Input already includes separator values | ; ,")
        return;
    }

    var a = strToList(aString);
    var b = strToList(bString);
    var aAndB = strToList(q("#a-and-b").value);
    var aNotB = strToList(q("#a-not-b").value);
    var bNotA = strToList(q("#b-not-a").value);

    var data = "Left" + separator + "Right" + separator + "In both" + separator + "Only in left" + separator + "Only in right\n";
    var max = a.length > b.length ? a.length : b.length;

    for (var i = 0; i < max; i++) {
        data += takeOrEmpty(a, i);
        data += separator;
        data += takeOrEmpty(b, i);
        data += separator;
        data += takeOrEmpty(aAndB, i);
        data += separator;
        data += takeOrEmpty(aNotB, i);
        data += separator;
        data += takeOrEmpty(bNotA, i);
        data += "\n";
    }

    this.href = "data:text/plain;charset=UTF-8," + encodeURIComponent(data);
});

function getValidSeparator(str) {
    const separators = ["|", ";", ","];

    for (var i = 0; i < separators.length; i++) {
        var separator = separators[i];
        if (!str.includes(separator)) {
            return separator;
        }
    }

    return null;
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

function takeOrEmpty(list, index) {
    if (index >= list.length || index < 0) {
        return "";
    }
    else {
        return list[index];
    }
}