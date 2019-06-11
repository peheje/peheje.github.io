// --- MAIN ---

q("#compare-btn").addEventListener("click", function () {

    // Generate lists
    var a = strToList(q("#a").value);
    var b = strToList(q("#b").value);

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
    var bothWorker = new Worker("worker.js");
    bothWorker.onmessage = function (evt) {
        var bothList = evt.data;
        q("#a-and-b").value = listToStr(bothList);
        q("#a-and-b-count").textContent = bothList.length;
        bothWorker.terminate();
    };
    bothWorker.postMessage({ action: "both", arguments: [a, bDict] });

    // A not B
    var aNotBWorker = new Worker("worker.js");
    aNotBWorker.onmessage = function (evt) {
        var aOnlyList = evt.data;
        q("#a-not-b").value = listToStr(aOnlyList);
        q("#a-not-b-count").textContent = aOnlyList.length;
        aNotBWorker.terminate();
    };
    aNotBWorker.postMessage({ action: "onlyFirst", arguments: [a, bDict] });

    // B not A
    var bNotAWorker = new Worker("worker.js");
    bNotAWorker.onmessage = function (evt) {
        var bOnlyList = evt.data;
        q("#b-not-a").value = listToStr(bOnlyList);
        q("#b-not-a-count").textContent = bOnlyList.length;
        bNotAWorker.terminate();
    };
    bNotAWorker.postMessage({ action: "onlyFirst", arguments: [b, aDict] });
});

q("#random-btn").addEventListener("click", function () {
    var worker = new Worker("worker.js");
    worker.onmessage = function (evt) {
        q("#a").value = listToStr(evt.data.a);
        q("#b").value = listToStr(evt.data.b);
        worker.terminate();
    }
    worker.postMessage({ action: "twoLists", arguments: [] });
});

q("#download-btn").addEventListener("click", function (e) {

    var a = strToList(q("#a").value);
    var b = strToList(q("#b").value);
    var aAndB = strToList(q("#a-and-b").value);
    var aNotB = strToList(q("#a-not-b").value);
    var bNotA = strToList(q("#b-not-a").value);

    var data = "Left,Right,In both,Only in left,Only in right\r\n";
    var max = a.length > b.length ? a.length : b.length;

    for (var i = 0; i < max; i++) {
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