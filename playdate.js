/* global document, window, navigator, URL */

const STORAGE_KEY = "playdate-mvp-preferences-v1";
const DEFAULT_STATE = {
    when: "now",
    place: "ours",
    duration: "open",
};
const state = { when: DEFAULT_STATE.when, places: [DEFAULT_STATE.place], duration: DEFAULT_STATE.duration };

const form = document.querySelector("#invite-form");
const childNameInput = document.querySelector("#child-name");
const childInitial = document.querySelector("#child-initial");
const endTimeInput = document.querySelector("#end-time");
const whenTimeInput = document.querySelector("#when-time");
const playgroundNameInput = document.querySelector("#playground-name");
const oursOutdoorsInput = document.querySelector("#ours-outdoors");
const resultCard = document.querySelector("#result-card");
const messageOutput = document.querySelector("#message-output");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toast-text");
let toastTimer;

document.querySelector("#back-button").addEventListener("click", () => {
    const sameOriginReferrer = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (window.history.length > 1 && sameOriginReferrer) {
        window.history.back();
    } else {
        window.location.href = "compare.html";
    }
});

function savePreferences() {
    const preferences = {
        childName: childNameInput.value,
        endTime: endTimeInput.value,
        whenTime: whenTimeInput.value,
        playgroundName: playgroundNameInput.value,
        oursOutdoors: oursOutdoorsInput.checked,
        when: state.when,
        places: state.places,
        duration: state.duration,
    };

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        // The app still works if private browsing or browser settings block storage.
    }
}

function loadPreferences() {
    let saved;

    try {
        saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
        saved = null;
    }

    if (!saved || typeof saved !== "object") return;

    const validValues = {
        when: ["now", "quarter", "half", "specific"],
        places: ["ours", "playground", "theirs"],
        duration: ["open", "one", "two", "until"],
    };

    if (validValues.when.includes(saved.when)) state.when = saved.when;
    if (validValues.duration.includes(saved.duration)) state.duration = saved.duration;

    const savedPlaces = Array.isArray(saved.places)
        ? saved.places.filter((place) => validValues.places.includes(place))
        : validValues.places.includes(saved.place) ? [saved.place] : [];
    if (savedPlaces.length) state.places = [...new Set(savedPlaces)];
    if (Array.isArray(saved.places) && saved.places.includes("garden")) {
        state.places = [...new Set([...state.places, "ours"])]
            .filter((place) => validValues.places.includes(place));
    }

    if (typeof saved.childName === "string") childNameInput.value = saved.childName.slice(0, 30);
    if (typeof saved.endTime === "string" && /^\d{2}:\d{2}$/.test(saved.endTime)) {
        endTimeInput.value = saved.endTime;
    }
    if (typeof saved.whenTime === "string" && /^\d{2}:\d{2}$/.test(saved.whenTime)) {
        whenTimeInput.value = saved.whenTime;
    }
    if (typeof saved.playgroundName === "string") playgroundNameInput.value = saved.playgroundName.slice(0, 40);
    if (typeof saved.oursOutdoors === "boolean") oursOutdoorsInput.checked = saved.oursOutdoors;
    if (Array.isArray(saved.places) && saved.places.includes("garden")) oursOutdoorsInput.checked = true;
}

function renderPreferences() {
    ["when", "duration"].forEach((group) => {
        const value = state[group];
        document.querySelectorAll(`[data-group="${group}"]`).forEach((option) => {
            const isSelected = option.dataset.value === value;
            option.classList.toggle("selected", isSelected);
            option.setAttribute("aria-pressed", String(isSelected));
        });
    });

    document.querySelector("#until-option").classList.toggle("selected", state.duration === "until");
    document.querySelector("#specific-time-option").classList.toggle("selected", state.when === "specific");
    renderPlaceOptions();
    renderPlaygroundField();
    renderOurPlaceDetail();
    const name = childNameInput.value.trim();
    childInitial.textContent = name ? name.charAt(0).toLocaleUpperCase("da-DK") : "?";
}

function renderPlaceOptions() {
    document.querySelectorAll('[data-group="place"]').forEach((option) => {
        const isSelected = state.places.includes(option.dataset.value);
        option.classList.toggle("selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
    });
}

function renderPlaygroundField() {
    const playgroundField = document.querySelector("#playground-name-field");
    const hasPlayground = state.places.includes("playground");
    playgroundField.hidden = !hasPlayground;
    playgroundField.setAttribute("aria-hidden", String(!hasPlayground));
}

function renderOurPlaceDetail() {
    const detail = document.querySelector("#our-place-detail");
    const hasOurPlace = state.places.includes("ours");
    detail.hidden = !hasOurPlace;
    detail.setAttribute("aria-hidden", String(!hasOurPlace));
}

function showToast(message) {
    toastText.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function selectOption(button) {
    const group = button.dataset.group;
    const value = button.dataset.value;

    if (group === "place") {
        if (state.places.includes(value)) {
            if (state.places.length === 1) {
                showToast("Vælg mindst ét sted");
                return;
            }
            state.places = state.places.filter((place) => place !== value);
        } else {
            state.places = [...state.places, value];
        }
        renderPlaceOptions();
        renderPlaygroundField();
        renderOurPlaceDetail();
        savePreferences();
        if (!resultCard.hidden) updateMessage();
        return;
    }

    document.querySelectorAll(`[data-group="${group}"]`).forEach((option) => {
        const isSelected = option === button;
        option.classList.toggle("selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
    });

    state[group] = value;

    if (group === "duration") {
        const untilOption = document.querySelector("#until-option");
        untilOption.classList.toggle("selected", value === "until");
    }

    if (group === "when") {
        document.querySelector("#specific-time-option").classList.toggle("selected", value === "specific");
    }

    savePreferences();
    if (!resultCard.hidden) updateMessage();
}

document.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => selectOption(button));
});

childNameInput.addEventListener("input", () => {
    const name = childNameInput.value.trim();
    childInitial.textContent = name ? name.charAt(0).toLocaleUpperCase("da-DK") : "?";
    savePreferences();
    if (!resultCard.hidden) updateMessage();
});

playgroundNameInput.addEventListener("input", () => {
    savePreferences();
    if (!resultCard.hidden) updateMessage();
});

oursOutdoorsInput.addEventListener("change", () => {
    savePreferences();
    if (!resultCard.hidden) updateMessage();
});

endTimeInput.addEventListener("focus", () => {
    selectOption(document.querySelector('[data-group="duration"][data-value="until"]'));
});

endTimeInput.addEventListener("input", () => {
    selectOption(document.querySelector('[data-group="duration"][data-value="until"]'));
    if (!resultCard.hidden) updateMessage();
});

whenTimeInput.addEventListener("focus", () => {
    selectOption(document.querySelector('[data-group="when"][data-value="specific"]'));
});

whenTimeInput.addEventListener("input", () => {
    selectOption(document.querySelector('[data-group="when"][data-value="specific"]'));
    if (!resultCard.hidden) updateMessage();
});

loadPreferences();
renderPreferences();

function getChildName() {
    return childNameInput.value.trim() || "Mit barn";
}

function makeMessage() {
    const name = getChildName();
    const whenText = {
        now: `${name} har lyst til at lege nu.`,
        quarter: `${name} har lyst til at lege om et kvarter.`,
        half: `${name} har lyst til at lege om en halv times tid.`,
        specific: `${name} har lyst til at lege kl. ${(whenTimeInput.value || "15:00").replace(":", ".")}.`,
    }[state.when];

    const placeFragments = {
        ours: oursOutdoorsInput.checked && state.places.includes("ours") ? "i vores have" : "hos os",
        theirs: "hos jer",
        playground: playgroundNameInput.value.trim() ? `på ${playgroundNameInput.value.trim()}` : "på legepladsen",
    };
    const places = state.places.map((place) => placeFragments[place]);
    const placeList = places.length > 1
        ? `${places.slice(0, -1).join(", ")} eller ${places[places.length - 1]}`
        : places[0];
    let placeText;
    if (state.places.length === 1 && state.places[0] === "ours") {
        placeText = oursOutdoorsInput.checked
            ? "I er meget velkomne i vores have – vi vil gerne holde det udendørs."
            : "I er meget velkomne hos os.";
    } else if (state.places.includes("theirs")) {
        placeText = `Vi kunne godt tænke os at komme lidt ud af huset – måske ${placeList}.`;
    } else if (oursOutdoorsInput.checked && state.places.includes("ours")) {
        placeText = `Vi vil gerne holde det udendørs – måske ${placeList}.`;
    } else if (state.places.length === 1 && state.places[0] === "playground") {
        placeText = `Vi tænkte at tage ${placeList}.`;
    } else {
        placeText = `Vi er åbne for ${placeList}.`;
    }

    let durationText;
    if (state.duration === "until") {
        const readableTime = (endTimeInput.value || "16:00").replace(":", ".");
        durationText = `Vi kan indtil cirka kl. ${readableTime}.`;
    } else {
        durationText = {
            open: "Vi tager sluttiden, som den kommer.",
            one: "Vi kan cirka en time.",
            two: "Vi kan et par timer.",
        }[state.duration];
    }

    return `Hej! ${whenText} ${placeText} ${durationText} Hvis det passer, så sig endelig til – og hvis ikke, behøver I ikke svare 😊`;
}

function updateMessage() {
    messageOutput.textContent = makeMessage();
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateMessage();
    resultCard.hidden = false;
    resultCard.classList.remove("reveal");
    window.requestAnimationFrame(() => resultCard.classList.add("reveal"));
    window.setTimeout(() => resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" }), 40);
});

async function copyMessage() {
    const message = messageOutput.textContent || makeMessage();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
        return;
    }

    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = message;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";
    document.body.append(temporaryInput);
    temporaryInput.select();
    document.execCommand("copy");
    temporaryInput.remove();
}

document.querySelector("#copy-button").addEventListener("click", async () => {
    try {
        await copyMessage();
        showToast("Teksten er kopieret");
    } catch {
        showToast("Markér teksten og kopiér den manuelt");
    }
});

document.querySelector("#share-button").addEventListener("click", async () => {
    const message = messageOutput.textContent || makeMessage();

    if (navigator.share) {
        try {
            await navigator.share({ text: message });
        } catch (error) {
            if (error.name !== "AbortError") showToast("Beskeden kunne ikke deles");
        }
        return;
    }

    try {
        await copyMessage();
        showToast("Deling understøttes ikke – teksten er kopieret");
    } catch {
        showToast("Markér teksten og kopiér den manuelt");
    }
});
