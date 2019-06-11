onmessage = function (evt) {
    importScripts("shared.js"); // import the functions into "self"
    var action = self[evt.data.action];
    var params = evt.data.arguments;
    var res = action(...params);
    self.postMessage(res);
}

function twoLists() {
    var a = randomList(100000, 999999, 100000);
    var b = randomList(100000, 999999, 100000);
    self.postMessage({ a, b });
}