q("#millilitres").addEventListener("keyup", function() {
    if (this.value < 0) {
        this.value = 0;
    }
    calculateAndShowUnits()
});

q("#percentage").addEventListener("keyup", function() {
    if (this.value > 100 || this.value < 0) {
        this.value = 0;
    }
    calculateAndShowUnits();
});

function calculateAndShowUnits() {
    var millilitres = q("#millilitres").value;
    var percentage = q("#percentage").value/100;

    var millilitresAlcohol = millilitres*percentage;
    var dkUnits = millilitresAlcohol / 15;

    q("#dk-units").innerHTML = roundToDigits(1, dkUnits);
}

function roundToDigits(digits, value) {
    var factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
}