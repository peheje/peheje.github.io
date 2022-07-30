importScripts("../shared.js");

onmessage = function(e) {
    // Generate lists
    var aList = strToList(e.data[0]);
    var bList = strToList(e.data[1]);

    postMessage(20);

    // Remove whitespace lines and adhere to lowercase
    aList = aList.filter(removeEmptyLines);
    bList = bList.filter(removeEmptyLines);

    postMessage(30);

    // Generate dictionaries
    var aDict = listToDic(aList);
    var bDict = listToDic(bList);

    postMessage(40);

    // Make lists distinct
    aList = dicToList(aDict);
    bList = dicToList(bDict);

    postMessage(55);

    var aStr = listToStr(aList);
    var bStr = listToStr(bList);

    postMessage(65);

    var bothList = both(aList, bDict);
    var bothStr = listToStr(bothList);

    postMessage(75);

    var aOnlyList = onlyFirst(aList, bDict);
    var aOnlyStr = listToStr(aOnlyList);

    postMessage(85);

    var bOnlyList = onlyFirst(bList, aDict);
    var bOnlyStr = listToStr(bOnlyList);

    postMessage(100);

    postMessage([
        aList, bList,
        aStr, bStr,
        bothList, bothStr,
        aOnlyList, aOnlyStr,
        bOnlyList, bOnlyStr
    ])
}