const listInput =
	/** @type {HTMLInputElement} */
	(document.getElementById("list-input"));

const listItems =
	/** @type {HTMLUListElement} */
	(document.getElementById("list-items"));

/** @type {HTMLLIElement | null} */
let firstListItem = null;

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

	const listItemText = new Text(videoId);

	const listItemThumb = document.createElement("img");
	listItemThumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
	listItemThumb.classList.add("list-item-thumb");

	const listItemLink = document.createElement("a");
	listItemLink.href = `#/v/${videoId}`;

	listItemLink.replaceChildren(listItemThumb, listItemText);

	const listItem = document.createElement("li");
	listItem.appendChild(listItemLink);

	listItems.insertBefore(listItem, firstListItem);
	firstListItem = listItem;
});
