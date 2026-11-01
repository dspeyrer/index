const counter =
	/** @type {HTMLSpanElement} */
	(document.getElementById("counter"));

const counterText =
	/** @type {Text} */
	(counter.childNodes[0]);

const btn =
	/** @type {HTMLButtonElement} */
	(document.getElementById("counter-btn"));

let counterVal = 0;

btn.addEventListener("click", function () {
	counterText.data = (++counterVal).toString();
});
