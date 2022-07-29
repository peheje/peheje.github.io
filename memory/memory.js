var state = "stopped";
var number = "";

q("#submit").addEventListener("click", function () {

    if (state === "guess") {

        if (q("#io").value === number) {
            alert("correct");
        } else {
            alert("incorrect was " + number);
        }

        state = "stopped";

        q("#length").disabled = false;
        q("#interval").disabled = false;
    }

    if (state === "stopped") {
        peek();
        var length = q("#length").value;
        console.log(length);

        number = randomList(0, 10, length).join('');
        var io = q("#io");
        io.value = number;
        
        setTimeout(function() {
            io.value = "";
            io.focus();
            stopPeek();
        }, q("#interval").value * 1000);
    }
});

q("#stop").addEventListener("click", function() {
    location.reload();
});

function peek() {
    state = "peek";
    q("#io").readOnly = true;
    q("#submit").disabled = true;
    q("#submit").innerText = "Peeking..";
    q("#length").disabled = true;
    q("#interval").disabled = true;
}

function stopPeek() {
    state = "guess";
    q("#io").readOnly = false;
    q("#submit").disabled = false;
    q("#submit").innerText = "Guess";
}

