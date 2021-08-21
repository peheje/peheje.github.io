var spacePressed = false;
var beats = [];
var beatElement = document.getElementById("beat");
var heartbeatElement = document.getElementById("heartbeat");

test(1000);

document.addEventListener("keyup", function () {
    spacePressed = false;
});

document.addEventListener("keydown", function (e) {
    if (e.key === " " && !spacePressed) {
        spacePressed = true;

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
});

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