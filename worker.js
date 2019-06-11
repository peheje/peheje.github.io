onmessage = function (evt) {
    importScripts("shared.js");
    var res = self[evt.data.action](...evt.data.arguments);
    self.postMessage(res);
}

function twoLists() {
    var a = randomList(100000, 999999, 100000);
    var b = randomList(100000, 999999, 100000);
    self.postMessage({ a, b });
}