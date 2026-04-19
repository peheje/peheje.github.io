import { mountSiteShell } from "../site.js";

function initHeartbeatPage() {
  mountSiteShell();

  let pressed = false;
  const beats = [];
  const beatElement = document.getElementById("beat");
  const heartbeatElement = document.getElementById("heartbeat");
  const heartbeatButton = document.getElementById("heartbeat-btn");

  function showBeatIndicator() {
    beatElement.removeAttribute("hidden");
    window.setTimeout(() => {
      beatElement.setAttribute("hidden", "hidden");
    }, 200);
  }

  function beat(key) {
    if (pressed || key !== " ") {
      return;
    }

    pressed = true;
    showBeatIndicator();

    if (beats.length === 6) {
      beats.shift();
    }

    beats.push(Date.now());

    if (beats.length < 2) {
      return;
    }

    let totalInterval = 0;

    for (let index = 1; index < beats.length; index += 1) {
      totalInterval += beats[index] - beats[index - 1];
    }

    const averageTimeBetweenBeatsMs = totalInterval / (beats.length - 1);
    const bpm = 60000 / averageTimeBetweenBeatsMs;
    heartbeatElement.textContent = `${bpm.toFixed(0)} bpm`;
  }

  function releaseBeatKey() {
    pressed = false;
  }

  document.addEventListener("keyup", releaseBeatKey);
  document.addEventListener("mouseup", releaseBeatKey);
  document.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
    }

    beat(event.key);
  });

  heartbeatButton.addEventListener("click", () => {
    beat(" ");
  });
}

initHeartbeatPage();
