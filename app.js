let peekTimeMs = 1000
let arr = []
let interval

$("#chars_num").value = localStorage.getItem("charsNum") || 4

function start() {
    if (interval != null) clearTimeout(interval)
    let n = $("#chars_num").valueAsNumber
    let input = $("#input_txt")
    arr = generateRandomNumbers(n)
    // console.log("arr", arr)
    let i = 0
    interval = setInterval(() => {
        if (i >= arr.length) {
            clearInterval(interval)
            input.value = ""
            input.focus()
            return
        }
        input.value = arr[i++]
    }, peekTimeMs)
}

start()

// Events
$("#reset_btn").addEventListener("click", e => {
    start();
})

$("#submit_btn").addEventListener("click", e => {
    e.preventDefault()
    const guess = $("#input_txt").value
    const correct = arr.join("")
    if (guess === correct) {
        alert("Correct")
    } else {
        alert("Incorrect. Correct was: " + correct + " you entered: " + guess)
    }
    start()
})

$("#chars_num").addEventListener("change", e => {
    localStorage.setItem("charsNum", e.target.value)
})

function $(selector, context) {
    ctx = (context || document)
    if (selector.startsWith("#")) {
        return ctx.getElementById(selector.slice(1))
    }
    return ctx.querySelectorAll(selector)
}

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}

function generateRandomNumbers(n) {
    let arr = [getRandomInt(0, 10)]
    let r = -1
    for (let i = 1; i < n; i++) {
        do {
            r = getRandomInt(0, 10)
        } while(r === arr[i-1])
        arr.push(r)
    }
    return arr
}