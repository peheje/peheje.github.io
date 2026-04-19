function dispatchInputEvents(input) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function changeNumberValue(input, delta) {
  if (delta > 0) {
    input.stepUp(delta);
  } else if (delta < 0) {
    input.stepDown(-delta);
  }

  dispatchInputEvents(input);
}

function createStepButton(className, label, delta, input) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.textContent = label;
  button.addEventListener("click", () => {
    changeNumberValue(input, delta);
  });
  return button;
}

export function initNumberSteppers() {
  const numberInputs = document.querySelectorAll("input[type='number'][data-stepper='true']");

  numberInputs.forEach((input) => {
    const alreadyWrapped = input.parentElement?.classList.contains("number-stepper") || false;

    if (alreadyWrapped) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "number-stepper";

    const decreaseButton = createStepButton("number-step-btn", "-", -1, input);
    const increaseButton = createStepButton("number-step-btn", "+", 1, input);

    input.parentElement?.insertBefore(wrapper, input);
    wrapper.append(input, decreaseButton, increaseButton);
  });
}
