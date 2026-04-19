import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

let answer = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomNonZeroInt(min, max) {
  let value = 0;

  while (value === 0) {
    value = randomInt(min, max);
  }

  return value;
}

function number(value) {
  return { type: "number", value };
}

function variable(name) {
  return { type: "variable", name };
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

function evaluate(expression, scope = {}) {
  switch (expression.type) {
    case "variable":
      return scope[expression.name];
    case "add":
      return evaluate(expression.left, scope) + evaluate(expression.right, scope);
    case "subtract":
      return evaluate(expression.left, scope) - evaluate(expression.right, scope);
    case "multiply":
      return evaluate(expression.left, scope) * evaluate(expression.right, scope);
    default:
      return expression.value;
  }
}

function generateEquationData(depth) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const solution = randomInt(-12, 13);
    let expression = variable("x");
    let result = solution;

    for (let level = 0; level < depth; level += 1) {
      const operation = randomInt(0, 5);

      if (operation === 0) {
        const constant = randomNonZeroInt(-10, 11);
        expression = add(expression, number(constant));
        result += constant;
        continue;
      }

      if (operation === 1) {
        const constant = randomNonZeroInt(-10, 11);
        expression = add(number(constant), expression);
        result += constant;
        continue;
      }

      if (operation === 2) {
        const constant = randomNonZeroInt(-10, 11);
        expression = subtract(expression, number(constant));
        result -= constant;
        continue;
      }

      if (operation === 3) {
        const constant = randomNonZeroInt(-10, 11);
        expression = subtract(number(constant), expression);
        result = constant - result;
        continue;
      }

      const multiplier = randomNonZeroInt(-4, 5);
      if (Math.abs(multiplier) === 1 || Math.abs(result * multiplier) > 200) {
        continue;
      }

      expression = randomInt(0, 2) === 0
        ? multiply(expression, number(multiplier))
        : multiply(number(multiplier), expression);
      result *= multiplier;
    }

    if (Math.abs(result) <= 200) {
      return { expression, solution, result };
    }
  }

  return {
    expression: add(multiply(number(2), variable("x")), number(3)),
    solution: 4,
    result: 11,
  };
}

function precedence(node) {
  switch (node.type) {
    case "add":
    case "subtract":
      return 1;
    case "multiply":
      return 2;
    default:
      return 3;
  }
}

function isNegativeNumber(node) {
  return node.type === "number" && node.value < 0;
}

function stripLeadingMinus(node) {
  if (node.type === "number" && node.value < 0) {
    return number(Math.abs(node.value));
  }

  if (node.type === "multiply") {
    if (node.left.type === "number" && node.left.value < 0) {
      return multiply(number(Math.abs(node.left.value)), node.right);
    }

    if (node.right.type === "number" && node.right.value < 0) {
      return multiply(node.left, number(Math.abs(node.right.value)));
    }
  }

  return node;
}

function hasLeadingMinus(node) {
  if (isNegativeNumber(node)) {
    return true;
  }

  if (node.type !== "multiply") {
    return false;
  }

  return (node.left.type === "number" && node.left.value < 0)
    || (node.right.type === "number" && node.right.value < 0);
}

function formatNumber(value, wrapNegative = false) {
  if (wrapNegative && value < 0) {
    return `(${value})`;
  }

  return String(value);
}

function maybeWrap(child, content, parentType, side) {
  const childPrecedence = precedence(child);

  if (childPrecedence < 1) {
    return `(${content})`;
  }

  if (parentType === "subtract" && side === "right" && childPrecedence <= 1) {
    return `(${content})`;
  }

  if (parentType === "multiply" && childPrecedence < 2) {
    return `(${content})`;
  }

  return content;
}

function printEquation(node, parentPrecedence = 0) {
  switch (node.type) {
    case "variable":
      return node.name;
    case "add": {
      const left = maybeWrap(node.left, printEquation(node.left, precedence(node)), node.type, "left");
      const normalizedRight = hasLeadingMinus(node.right) ? stripLeadingMinus(node.right) : node.right;
      const right = isNegativeNumber(node.right)
        ? formatNumber(Math.abs(node.right.value))
        : maybeWrap(normalizedRight, printEquation(normalizedRight, precedence(node)), node.type, "right");
      const content = hasLeadingMinus(node.right) ? `${left} - ${right}` : `${left} + ${right}`;
      return precedence(node) < parentPrecedence ? `(${content})` : content;
    }
    case "subtract": {
      const left = maybeWrap(node.left, printEquation(node.left, precedence(node)), node.type, "left");
      const normalizedRight = hasLeadingMinus(node.right) ? stripLeadingMinus(node.right) : node.right;
      const right = isNegativeNumber(node.right)
        ? formatNumber(Math.abs(node.right.value))
        : maybeWrap(normalizedRight, printEquation(normalizedRight, precedence(node)), node.type, "right");
      const content = hasLeadingMinus(node.right) ? `${left} + ${right}` : `${left} - ${right}`;
      return precedence(node) < parentPrecedence ? `(${content})` : content;
    }
    case "multiply": {
      const left = maybeWrap(node.left, printEquation(node.left, precedence(node)), node.type, "left");
      const right = node.right.type === "number"
        ? formatNumber(node.right.value, true)
        : maybeWrap(node.right, printEquation(node.right, precedence(node)), node.type, "right");
      const content = `${left} * ${right}`;
      return precedence(node) < parentPrecedence ? `(${content})` : content;
    }
    default:
      return formatNumber(node.value);
  }
}

function getExpression(expression, result) {
  return `${printEquation(expression)} = ${result}`;
}

function generateEquation() {
  const depthInput = document.getElementById("depth");
  const depth = Number.parseInt(depthInput.value, 10);
  const equationData = generateEquationData(depth);

  answer = equationData.solution;
  document.getElementById("equation").textContent = getExpression(equationData.expression, equationData.result);
  document.getElementById("result").textContent = "";
  document.getElementById("result-line").classList.add("display-none");
}

function checkAnswer() {
  const guess = Number.parseInt(document.getElementById("guess").value, 10);
  const result = document.getElementById("result");
  const resultLine = document.getElementById("result-line");

  resultLine.classList.remove("display-none");

  if (answer === null || Number.isNaN(guess)) {
    result.textContent = "Generate an equation and enter an integer guess first.";
    return;
  }

  if (guess === answer) {
    result.textContent = `Correct! x = ${answer}.`;
  } else {
    result.textContent = `Incorrect. x = ${answer}.`;
  }
}

function checkMaxDepth(event) {
  const input = event.currentTarget;
  input.valueAsNumber = Math.max(1, Math.min(100, input.valueAsNumber));
}

function initEquationPage() {
  mountSiteShell();
  initNumberSteppers();

  document.getElementById("depth").addEventListener("change", checkMaxDepth);
  document.getElementById("generate-btn").addEventListener("click", generateEquation);
  document.getElementById("check-btn").addEventListener("click", checkAnswer);

  generateEquation();
}

initEquationPage();
