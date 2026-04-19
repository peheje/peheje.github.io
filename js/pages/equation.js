import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

let answer = "";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function number(value) {
  return { type: "number", value };
}

function add(left, right) {
  return { type: "add", left, right };
}

function subtract(left, right) {
  return { type: "subtract", left, right };
}

function multiply(left, right) {
  return { type: "multiply", left, right };
}

function abs(expression) {
  return { type: "abs", expression };
}

function evaluate(expression) {
  switch (expression.type) {
    case "add":
      return evaluate(expression.left) + evaluate(expression.right);
    case "subtract":
      return evaluate(expression.left) - evaluate(expression.right);
    case "multiply":
      return evaluate(expression.left) * evaluate(expression.right);
    case "abs":
      return Math.abs(evaluate(expression.expression));
    default:
      return expression.value;
  }
}

function generateTree(depth) {
  if (depth === 0) {
    return number(randomInt(-10, 11));
  }

  const left = generateTree(depth - 1);
  const right = generateTree(depth - 1);
  const operation = randomInt(0, 4);
  const absRoll = randomInt(0, 10);

  if (operation === 0) {
    return add(left, right);
  }

  if (operation === 1) {
    return subtract(left, right);
  }

  if (operation === 2) {
    return multiply(left, right);
  }

  if (operation === 3 && absRoll === 0) {
    return abs(left);
  }

  return generateTree(depth);
}

function getExpression(expression) {
  function printEquation(node) {
    switch (node.type) {
      case "add":
        return `(${printEquation(node.left)}+${printEquation(node.right)})`;
      case "subtract":
        return `(${printEquation(node.left)}-${printEquation(node.right)})`;
      case "multiply":
        return `(${printEquation(node.left)}*${printEquation(node.right)})`;
      case "abs":
        return `abs(${printEquation(node.expression)})`;
      default:
        return String(node.value);
    }
  }

  return `${printEquation(expression)}=${evaluate(expression)}`;
}

function replaceNumberWithX(source) {
  const matches = [...source.matchAll(/\d+/g)];

  if (matches.length === 0) {
    return { equation: source, replacedValue: "" };
  }

  const match = matches[randomInt(0, matches.length)];
  const start = match.index;
  const value = match[0];
  const equation = `${source.slice(0, start)}X${source.slice(start + value.length)}`;

  return { equation, replacedValue: value };
}

function generateEquation() {
  const depthInput = document.getElementById("depth");
  const depth = Number.parseInt(depthInput.value, 10);
  const tree = generateTree(depth);
  const expression = getExpression(tree);
  const result = replaceNumberWithX(expression);

  answer = result.replacedValue;
  document.getElementById("equation").textContent = result.equation;
  document.getElementById("result").textContent = "";
  document.getElementById("result-line").classList.add("display-none");
}

function checkAnswer() {
  const guess = document.getElementById("guess").value;
  const result = document.getElementById("result");
  const resultLine = document.getElementById("result-line");

  resultLine.classList.remove("display-none");

  if (guess === answer) {
    result.textContent = `Correct! The answer is indeed ${answer}.`;
  } else {
    result.textContent = `Incorrect. The correct answer was ${answer}.`;
  }
}

function checkMaxDepth(event) {
  const input = event.currentTarget;
  input.valueAsNumber = Math.max(1, Math.min(10, input.valueAsNumber));
}

function initEquationPage() {
  mountSiteShell();
  initNumberSteppers();

  document.getElementById("depth").addEventListener("change", checkMaxDepth);
  document.getElementById("generate-btn").addEventListener("click", generateEquation);
  document.getElementById("check-btn").addEventListener("click", checkAnswer);
}

initEquationPage();
