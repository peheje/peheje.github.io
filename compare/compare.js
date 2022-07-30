q("#compare-btn").addEventListener("click", function () {

    var progressBar = q("#progress-bar");
    progressBar.value = 10;

    var worker = new Worker("worker.js");
    worker.postMessage([q("#a").value, q("#b").value]);

    worker.onmessage = function (e) {

        if (e.data.length !== 10) {
            progressBar.value = e.data;
            return;
        }
        
        var aList = e.data[0];
        var bList = e.data[1];
        var aStr = e.data[2];
        var bStr = e.data[3];
        var bothList = e.data[4];
        var bothStr = e.data[5];
        var aOnlyList = e.data[6];
        var aOnlyStr = e.data[7];
        var bOnlyList = e.data[8];
        var bOnlyStr = e.data[9];

        // Change to distinct lists on UI
        q("#a").value = aStr;
        q("#b").value = bStr;

        // Calculate counts
        q("#a-count").textContent = aList.length;
        q("#b-count").textContent = bList.length;

        // A and B
        q("#a-and-b").value = bothStr;
        q("#a-and-b-count").textContent = bothList.length;

        // A not B
        q("#a-not-b").value = aOnlyStr;
        q("#a-not-b-count").textContent = aOnlyList.length;

        // B not A
        q("#b-not-a").value = bOnlyStr;
        q("#b-not-a-count").textContent = bOnlyList.length;
    }
});

q("#random-btn").addEventListener("click", function () {
    q("#a").value = listToStr(randomList(100000, 999999, 100000));
    q("#b").value = listToStr(randomList(100000, 999999, 100000));
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

function takeOrEmpty(list, index) {
    if (index >= list.length || index < 0) {
        return "";
    }
    else {
        return list[index];
    }
}