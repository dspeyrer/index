const listInput =
	/** @type {HTMLInputElement} */
	(document.getElementById("list-input"));

const listItems =
	/** @type {HTMLUListElement} */
	(document.getElementById("list-items"));

/** @type {HTMLLIElement | null} */
let firstListItem = null;

/** @type {Set<string>} */
const listItemIds = new Set();

/**
 * @param {string} url
 */
function tryParseUrl(url) {
	try {
		return new URL(url);
	} catch (e) {
		if (e instanceof TypeError) {
			return null;
		}

		throw e;
	}
}

listInput.addEventListener("input", function () {
	const url = tryParseUrl(listInput.value);

	if (url === null) {
		return;
	}

	let videoId = null;

	switch (url.hostname) {
		case "www.youtube.com":
		case "youtube.com":
			if (url.pathname.startsWith("/shorts/")) {
				videoId = url.pathname.slice(8);
			} else {
				videoId = url.searchParams.get("v");
			}
			break;
		case "youtu.be":
			videoId = url.pathname.slice(1);
			break;
	}

	if (videoId === null) {
		return;
	}

	listInput.value = "";

	if (listItemIds.has(videoId)) {
		return;
	}

	listItemIds.add(videoId);


	const listItem = document.createElement("li");

	const listItemLink = document.createElement("a");
	listItemLink.href = `#/v/${videoId}`;

	const listItemThumb = document.createElement("img");
	listItemThumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
	listItemThumb.classList.add("list-item-thumb");

	const listItemText = new Text(videoId);

	listItemLink.replaceChildren(listItemThumb, listItemText);

	const listItemRemove = document.createElement("button");
	listItemRemove.classList.add("list-item-remove");
	listItemRemove.dataset["videoId"] = videoId;
	listItemRemove.replaceChildren(new Text("x"));

	listItem.replaceChildren(listItemLink, listItemRemove);

	listItems.insertBefore(listItem, firstListItem);
	firstListItem = listItem;
});

listItems.addEventListener("click", function (event) {
	const targetEl = /** @type {HTMLElement} */ (event.target);

	if (targetEl.classList.contains("list-item-remove")) {
		listItems.removeChild(/** @type {HTMLLIElement} */(targetEl.parentNode));

		const videoId = /** @type {string} */ (targetEl.dataset["videoId"]);
		listItemIds.delete(videoId);
	}
});
