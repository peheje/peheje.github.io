
onmessage = function(e) {
importScripts("../shared.js");

    var a = e.data[0];
    var b = e.data[1];

    // Remove whitespace lines and adhere to lowercase
    a = a.filter(removeEmptyLines);
    b = b.filter(removeEmptyLines);

    // Generate dictionaries
    var aDict = listToDic(a);
    var bDict = listToDic(b);

    // Make lists distinct
    a = dicToList(aDict);
    b = dicToList(bDict);

    postMessage([a, b, aDict, bDict])
}

function removeEmptyLines(v) {
    return v.trim() !== "";
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