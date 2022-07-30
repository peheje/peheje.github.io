var state = "stopped";
var number = "";

q("#submit").addEventListener("click", function () {

    show("#restart");

    if (state === "guess") {

        if (q("#io").value === number) {
            alert("Correct");
        } else {
            alert("Not correct, number was " + number);
        }

        state = "stopped";
    }

    if (state === "stopped") {
        peek();
        var length = q("#length").value;
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

q("#restart").addEventListener("click", function() {
    location.reload();
});

document.addEventListener("keypress", function(e) {
    if (e.key === "Enter" && state === "guess" && q("#io").value) {
        q("#submit").click();
    }
})

function peek() {
    state = "peek";
    show("#io-input");
    hide("#length-input");
    hide("#interval-input");
    q("#io").readOnly = true;
    q("#submit").disabled = true;
    q("#submit").innerText = "Peeking..";
}

function stopPeek() {
    state = "guess";
    q("#io").readOnly = false;
    q("#submit").disabled = false;
    q("#submit").innerText = "Guess";
}

function hide(id) {
    q(id).classList.remove("inline-block");
    q(id).classList.add("display-none");
}

function show(id) {
    q(id).classList.add("inline-block");
    q(id).classList.remove("display-none");
}