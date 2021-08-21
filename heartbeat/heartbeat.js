var beatKeyPressed = false;
var beats = [];
var beatElement = q("#beat");
var heartbeatElement = q("#heartbeat");

// test(1000);

document.addEventListener("keyup", function () {
    beatKeyPressed = false;
});

document.addEventListener("mouseup", function () {
    beatKeyPressed = false;
});

document.addEventListener("keydown", function (e) {
    beat(e.key)
});

q("#heartbeat-btn").addEventListener("click", function () {
    beat(" ")
});

function beat(key) {

    if (beatKeyPressed || key !== " ") { return; }

    beatKeyPressed = true;

    showBeatIndicator();

    keepOnlyNewestNBeats(10);

    beats.push(Date.now());

    if (beats.length < 2) {
        return;
    }

    var timeBetweenBeatsMs = [];
    for (var i = 0; i < beats.length - 1; i++) {
        var delta = beats[i + 1] - beats[i];
        timeBetweenBeatsMs.push(delta);
    }

    var averageTimeBetweenBeatMs = average(timeBetweenBeatsMs);

    var bpm = 60000 / averageTimeBetweenBeatMs;
    heartbeatElement.innerHTML = roundToDigits(0, bpm) + " bpm";
}

function average(array) {
    var sum = 0;
    for (var i = 0; i < array.length; i++) {
        sum += array[i];
    }
    return sum / array.length;
}

function showBeatIndicator() {
    beatElement.removeAttribute("hidden");
    setTimeout(function () {
        beatElement.setAttribute("hidden", "hidden");
    }, 200);
}

function keepOnlyNewestNBeats(n) {
    if (beats.length === n) {
        beats.shift();
    }
}

function test(sleepMs) {
    setInterval(function () {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
        document.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    }, sleepMs)
}