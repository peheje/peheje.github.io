q("#millilitres").addEventListener("input", function() {
    if (this.value < 0) {
        this.value = 0;
    }
    calculateAndShowUnits()
});

q("#percentage").addEventListener("input", function() {
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

    q("#dk-units").innerHTML = roundToDigits(2, dkUnits);
}